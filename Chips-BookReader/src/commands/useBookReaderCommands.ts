import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCommandAdapter,
  type ChipsCommandAdapter,
  type ChipsCommandView,
} from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource, CommandState } from "chips-sdk";
import {
  bookReaderCommandDefinitions,
  createBookReaderCommandSetStateOptions,
  createBookReaderCommandStatus,
  createBookReaderCommandStatusFromCommandId,
  createBookReaderCommandViews,
  toBookReaderCommandErrorCode,
  type BookReaderCommandHandlerId,
  type BookReaderCommandId,
  type BookReaderCommandPhase,
  type BookReaderCommandRuntimeState,
  type BookReaderCommandStatus,
} from "./book-reader-commands";

type BookReaderCommandHandler = (status: BookReaderCommandStatus) => void | Promise<void>;
type BookReaderCommandHandlerStack = Map<BookReaderCommandHandlerId, BookReaderCommandHandler[]>;

export interface UseBookReaderCommandsOptions {
  client?: Client;
  invocationContext?: CommandInvocationContext;
  runtimeState: BookReaderCommandRuntimeState;
}

export interface UseBookReaderCommandsResult {
  adapter: ChipsCommandAdapter | null;
  commandViews: ChipsCommandView[];
  phase: BookReaderCommandPhase;
  errorCode: string | null;
  invocationContext: CommandInvocationContext;
  invokeCommand(
    commandId: BookReaderCommandId,
    source: CommandSource,
    payload?: Record<string, unknown>,
    contextPatch?: CommandInvocationContext,
  ): Promise<void>;
  registerHandler(handlerId: BookReaderCommandHandlerId, handler: BookReaderCommandHandler): () => void;
  setCommandState(commandId: BookReaderCommandId, state: CommandState): void;
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

function getTopHandler(stack: BookReaderCommandHandler[] | undefined): BookReaderCommandHandler | null {
  if (!stack || stack.length === 0) {
    return null;
  }

  return stack[stack.length - 1] ?? null;
}

export function useBookReaderCommands(
  options: UseBookReaderCommandsOptions,
): UseBookReaderCommandsResult {
  const { client, invocationContext = {}, runtimeState } = options;
  const adapter = useMemo(() => (client ? createCommandAdapter(client) : null), [client]);
  const commandViews = useMemo(() => createBookReaderCommandViews(runtimeState), [runtimeState]);
  const commandSetStateOptions = useMemo(
    () => createBookReaderCommandSetStateOptions(invocationContext),
    [invocationContext],
  );
  const [phase, setPhase] = useState<BookReaderCommandPhase>(client ? "idle" : "ready");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const handlersRef = useRef<BookReaderCommandHandlerStack>(new Map());
  const handledInvocationRef = useRef<string | null>(null);

  const dispatchLocalCommand = useCallback((status: BookReaderCommandStatus): void => {
    const handler = getTopHandler(handlersRef.current.get(status.handlerId));
    if (!handler) {
      return;
    }

    void Promise.resolve(handler(status)).catch((error) => {
      setErrorCode(toBookReaderCommandErrorCode(error));
      setPhase("error");
    });
  }, []);

  const registerHandler = useCallback(
    (handlerId: BookReaderCommandHandlerId, handler: BookReaderCommandHandler): (() => void) => {
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
      commandId: BookReaderCommandId,
      source: CommandSource,
      payload: Record<string, unknown> = {},
      contextPatch?: CommandInvocationContext,
    ): Promise<void> => {
      setErrorCode(null);
      const context = mergeInvocationContext(invocationContext, contextPatch);

      if (!client) {
        dispatchLocalCommand(createBookReaderCommandStatusFromCommandId(commandId, source, payload, context));
        return;
      }

      try {
        await client.command.invoke(commandId, payload, {
          source,
          context,
        });
      } catch (error) {
        setErrorCode(toBookReaderCommandErrorCode(error));
        setPhase("error");
      }
    },
    [client, dispatchLocalCommand, invocationContext],
  );

  const setCommandState = useCallback(
    (commandId: BookReaderCommandId, state: CommandState): void => {
      if (!client) {
        return;
      }

      void client.command.setState(commandId, state, commandSetStateOptions).catch((error) => {
        setErrorCode(toBookReaderCommandErrorCode(error));
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

    Promise.all(bookReaderCommandDefinitions.map((definition) => client.command.register(definition)))
      .then(() => {
        if (!cancelled) {
          setPhase("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setErrorCode(toBookReaderCommandErrorCode(error));
        }
      });

    let offInvoked = () => undefined;
    try {
      offInvoked = client.command.onInvoked((event) => {
        const status = createBookReaderCommandStatus(event);
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
        setErrorCode(toBookReaderCommandErrorCode(error));
      }
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        bookReaderCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
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
        setErrorCode(toBookReaderCommandErrorCode(error));
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
