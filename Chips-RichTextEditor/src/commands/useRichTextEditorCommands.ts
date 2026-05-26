import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCommandAdapter,
  type ChipsCommandAdapter,
  type ChipsCommandView,
} from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource, CommandState } from "chips-sdk";
import {
  createRichTextEditorCommandSetStateOptions,
  createRichTextEditorCommandStatus,
  createRichTextEditorCommandStatusFromCommandId,
  createRichTextEditorCommandViews,
  richTextEditorCommandDefinitions,
  toRichTextEditorCommandErrorCode,
  type RichTextEditorCommandHandlerId,
  type RichTextEditorCommandId,
  type RichTextEditorCommandPhase,
  type RichTextEditorCommandRuntimeState,
  type RichTextEditorCommandStatus,
} from "./rich-text-editor-commands";

type RichTextEditorCommandHandler = (status: RichTextEditorCommandStatus) => void | Promise<void>;
type RichTextEditorCommandHandlerStack = Map<RichTextEditorCommandHandlerId, RichTextEditorCommandHandler[]>;

export interface UseRichTextEditorCommandsOptions {
  client: Client;
  invocationContext?: CommandInvocationContext;
  runtimeState: RichTextEditorCommandRuntimeState;
}

export interface UseRichTextEditorCommandsResult {
  adapter: ChipsCommandAdapter;
  commandViews: ChipsCommandView[];
  phase: RichTextEditorCommandPhase;
  errorCode: string | null;
  invocationContext: CommandInvocationContext;
  invokeCommand(
    commandId: RichTextEditorCommandId,
    source: CommandSource,
    payload?: Record<string, unknown>,
    contextPatch?: CommandInvocationContext,
  ): Promise<void>;
  registerHandler(handlerId: RichTextEditorCommandHandlerId, handler: RichTextEditorCommandHandler): () => void;
  setCommandState(commandId: RichTextEditorCommandId, state: CommandState): void;
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

function getTopHandler(stack: RichTextEditorCommandHandler[] | undefined): RichTextEditorCommandHandler | null {
  if (!stack || stack.length === 0) {
    return null;
  }

  return stack[stack.length - 1] ?? null;
}

export function useRichTextEditorCommands({
  client,
  invocationContext = {},
  runtimeState,
}: UseRichTextEditorCommandsOptions): UseRichTextEditorCommandsResult {
  const adapter = useMemo(() => createCommandAdapter(client), [client]);
  const commandViews = useMemo(() => createRichTextEditorCommandViews(runtimeState), [runtimeState]);
  const commandSetStateOptions = useMemo(
    () => createRichTextEditorCommandSetStateOptions(invocationContext),
    [invocationContext],
  );
  const [phase, setPhase] = useState<RichTextEditorCommandPhase>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const handlersRef = useRef<RichTextEditorCommandHandlerStack>(new Map());
  const handledInvocationRef = useRef<string | null>(null);

  const dispatchLocalCommand = useCallback((status: RichTextEditorCommandStatus): void => {
    const handler = getTopHandler(handlersRef.current.get(status.handlerId));
    if (!handler) {
      return;
    }

    void Promise.resolve(handler(status)).catch((error) => {
      setErrorCode(toRichTextEditorCommandErrorCode(error));
      setPhase("error");
    });
  }, []);

  const registerHandler = useCallback(
    (handlerId: RichTextEditorCommandHandlerId, handler: RichTextEditorCommandHandler): (() => void) => {
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
      commandId: RichTextEditorCommandId,
      source: CommandSource,
      payload: Record<string, unknown> = {},
      contextPatch?: CommandInvocationContext,
    ): Promise<void> => {
      setErrorCode(null);
      const context = mergeInvocationContext(invocationContext, contextPatch);

      try {
        await client.command.invoke(commandId, payload, {
          source,
          context,
        });
      } catch (error) {
        setErrorCode(toRichTextEditorCommandErrorCode(error));
        setPhase("error");
        dispatchLocalCommand(createRichTextEditorCommandStatusFromCommandId(commandId, source, payload, context));
      }
    },
    [client, dispatchLocalCommand, invocationContext],
  );

  const setCommandState = useCallback(
    (commandId: RichTextEditorCommandId, state: CommandState): void => {
      void client.command.setState(commandId, state, commandSetStateOptions).catch((error) => {
        setErrorCode(toRichTextEditorCommandErrorCode(error));
        setPhase("error");
      });
    },
    [client, commandSetStateOptions],
  );

  useEffect(() => {
    let cancelled = false;
    setPhase("registering");
    setErrorCode(null);

    Promise.all(richTextEditorCommandDefinitions.map((definition) => client.command.register(definition)))
      .then(() => {
        if (!cancelled) {
          setPhase("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setErrorCode(toRichTextEditorCommandErrorCode(error));
        }
      });

    let offInvoked: () => void = () => undefined;
    try {
      offInvoked = client.command.onInvoked((event) => {
        const status = createRichTextEditorCommandStatus(event);
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
        setErrorCode(toRichTextEditorCommandErrorCode(error));
      }
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        richTextEditorCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => undefined);
    };
  }, [client, dispatchLocalCommand]);

  useEffect(() => {
    if (phase !== "ready") {
      return;
    }

    commandViews.forEach((view) => {
      if (!view.commandId) {
        return;
      }
      void client.command.setState(view.commandId, view.state ?? {}, commandSetStateOptions).catch((error) => {
        setErrorCode(toRichTextEditorCommandErrorCode(error));
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
