import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCommandAdapter,
  type ChipsCommandAdapter,
  type ChipsCommandView,
} from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource, CommandState } from "chips-sdk";
import {
  createVideoPlayerCommandSetStateOptions,
  createVideoPlayerCommandStatus,
  createVideoPlayerCommandStatusFromCommandId,
  createVideoPlayerCommandViews,
  toVideoPlayerCommandErrorCode,
  videoPlayerCommandDefinitions,
  type VideoPlayerCommandHandlerId,
  type VideoPlayerCommandId,
  type VideoPlayerCommandPhase,
  type VideoPlayerCommandRuntimeState,
  type VideoPlayerCommandStatus,
} from "./video-player-commands";

type VideoPlayerCommandHandler = (status: VideoPlayerCommandStatus) => void | Promise<void>;
type VideoPlayerCommandHandlerStack = Map<VideoPlayerCommandHandlerId, VideoPlayerCommandHandler[]>;

export interface UseVideoPlayerCommandsOptions {
  client?: Client;
  invocationContext?: CommandInvocationContext;
  runtimeState: VideoPlayerCommandRuntimeState;
}

export interface UseVideoPlayerCommandsResult {
  adapter: ChipsCommandAdapter | null;
  commandViews: ChipsCommandView[];
  phase: VideoPlayerCommandPhase;
  errorCode: string | null;
  invocationContext: CommandInvocationContext;
  invokeCommand(
    commandId: VideoPlayerCommandId,
    source: CommandSource,
    payload?: Record<string, unknown>,
    contextPatch?: CommandInvocationContext,
  ): Promise<void>;
  registerHandler(handlerId: VideoPlayerCommandHandlerId, handler: VideoPlayerCommandHandler): () => void;
  setCommandState(commandId: VideoPlayerCommandId, state: CommandState): void;
}

function mergeInvocationContext(
  base: CommandInvocationContext,
  patch?: CommandInvocationContext,
): CommandInvocationContext {
  return {
    ...base,
    ...patch,
  };
}

function getTopHandler(stack: VideoPlayerCommandHandler[] | undefined): VideoPlayerCommandHandler | null {
  if (!stack || stack.length === 0) {
    return null;
  }

  return stack[stack.length - 1] ?? null;
}

export function useVideoPlayerCommands(options: UseVideoPlayerCommandsOptions): UseVideoPlayerCommandsResult {
  const { client, invocationContext = {}, runtimeState } = options;
  const adapter = useMemo(() => (client ? createCommandAdapter(client) : null), [client]);
  const commandViews = useMemo(() => createVideoPlayerCommandViews(runtimeState), [runtimeState]);
  const commandSetStateOptions = useMemo(
    () => createVideoPlayerCommandSetStateOptions(invocationContext),
    [invocationContext],
  );
  const [phase, setPhase] = useState<VideoPlayerCommandPhase>(client ? "idle" : "ready");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const handlersRef = useRef<VideoPlayerCommandHandlerStack>(new Map());
  const handledInvocationRef = useRef<string | null>(null);

  const dispatchLocalCommand = useCallback((status: VideoPlayerCommandStatus): void => {
    const handler = getTopHandler(handlersRef.current.get(status.handlerId));
    if (!handler) {
      return;
    }

    void Promise.resolve(handler(status)).catch((error) => {
      setErrorCode(toVideoPlayerCommandErrorCode(error));
      setPhase("error");
    });
  }, []);

  const registerHandler = useCallback(
    (handlerId: VideoPlayerCommandHandlerId, handler: VideoPlayerCommandHandler): (() => void) => {
      const stack = handlersRef.current.get(handlerId) ?? [];
      stack.push(handler);
      handlersRef.current.set(handlerId, stack);

      return () => {
        const current = handlersRef.current.get(handlerId);
        if (!current) {
          return;
        }

        const nextStack = current.filter((item) => item !== handler);
        if (nextStack.length === 0) {
          handlersRef.current.delete(handlerId);
          return;
        }

        handlersRef.current.set(handlerId, nextStack);
      };
    },
    [],
  );

  const invokeCommand = useCallback(
    async (
      commandId: VideoPlayerCommandId,
      source: CommandSource,
      payload: Record<string, unknown> = {},
      contextPatch?: CommandInvocationContext,
    ): Promise<void> => {
      setErrorCode(null);
      const context = mergeInvocationContext(invocationContext, contextPatch);

      if (!client) {
        dispatchLocalCommand(createVideoPlayerCommandStatusFromCommandId(commandId, source, payload, context));
        return;
      }

      try {
        await client.command.invoke(commandId, payload, {
          source,
          context,
        });
      } catch (error) {
        setErrorCode(toVideoPlayerCommandErrorCode(error));
        setPhase("error");
        dispatchLocalCommand(createVideoPlayerCommandStatusFromCommandId(commandId, source, payload, context));
      }
    },
    [client, dispatchLocalCommand, invocationContext],
  );

  const setCommandState = useCallback(
    (commandId: VideoPlayerCommandId, state: CommandState): void => {
      if (!client) {
        return;
      }

      void client.command.setState(commandId, state, commandSetStateOptions).catch((error) => {
        setErrorCode(toVideoPlayerCommandErrorCode(error));
        setPhase("error");
      });
    },
    [client, commandSetStateOptions],
  );

  useEffect(() => {
    if (!client) {
      setPhase("ready");
      return;
    }

    let cancelled = false;
    setPhase("registering");
    setErrorCode(null);

    Promise.all(videoPlayerCommandDefinitions.map((definition) => client.command.register(definition)))
      .then(() => {
        if (!cancelled) {
          setPhase("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setErrorCode(toVideoPlayerCommandErrorCode(error));
        }
      });

    let offInvoked: () => void = () => undefined;
    try {
      offInvoked = client.command.onInvoked((event) => {
        const status = createVideoPlayerCommandStatus(event);
        if (!status) {
          return;
        }

        const invocationKey =
          status.invocationId ?? `${status.commandId}:${status.source}:${JSON.stringify(status.payload ?? {})}`;
        if (handledInvocationRef.current === invocationKey) {
          return;
        }
        handledInvocationRef.current = invocationKey;

        dispatchLocalCommand(status);
      });
    } catch (error) {
      if (!cancelled) {
        setPhase("error");
        setErrorCode(toVideoPlayerCommandErrorCode(error));
      }
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        videoPlayerCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => undefined);
    };
  }, [client, dispatchLocalCommand]);

  useEffect(() => {
    if (!client || phase !== "ready") {
      return;
    }

    commandViews.forEach((view) => {
      if (!view.commandId) {
        return;
      }
      void client.command.setState(view.commandId, view.state ?? {}, commandSetStateOptions).catch((error) => {
        setErrorCode(toVideoPlayerCommandErrorCode(error));
        setPhase("error");
      });
    });
  }, [client, commandSetStateOptions, commandViews, phase]);

  return {
    adapter,
    commandViews,
    phase,
    errorCode,
    invocationContext,
    invokeCommand,
    registerHandler,
    setCommandState,
  };
}
