import { useEffect, useMemo, useState } from "react";
import {
  useChipsClient,
  createCommandAdapter,
  type ChipsCommandAdapter,
} from "@chips/component-library";
import type { Client, CommandSource } from "chips-sdk";
import {
  appCommandDefinitions,
  createAppCommandStatus,
  getAppCommandHandlerId,
  isAppCommandInvokedEvent,
  type AppCommandStatus,
} from "./app-commands";

type CommandRegistryPhase = "idle" | "registering" | "ready" | "error";

export interface UseAppCommandsOptions {
  client?: Client;
}

export interface UseAppCommandsResult {
  adapter: ChipsCommandAdapter;
  phase: CommandRegistryPhase;
  errorCode: string | null;
  lastInvoked: AppCommandStatus | null;
  invokeCommand(commandId: string, source: CommandSource): Promise<void>;
}

function toErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
  }
  return "COMMAND_RUNTIME_ERROR";
}

export function useAppCommands(options: UseAppCommandsOptions = {}): UseAppCommandsResult {
  const environmentClient = useChipsClient() as unknown as Client;
  const client = options.client ?? environmentClient;
  const adapter = useMemo(() => createCommandAdapter(client), [client]);
  const [phase, setPhase] = useState<CommandRegistryPhase>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastInvoked, setLastInvoked] = useState<AppCommandStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase("registering");
    setErrorCode(null);

    Promise.all(
      appCommandDefinitions.map((definition) => client.command.register(definition)),
    )
      .then(() => {
        if (!cancelled) {
          setPhase("ready");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setErrorCode(toErrorCode(error));
        }
      });

    let offInvoked = () => {};
    try {
      offInvoked = client.command.onInvoked((event) => {
        if (!isAppCommandInvokedEvent(event)) {
          return;
        }
        const handlerId = getAppCommandHandlerId(event);
        if (!handlerId) {
          return;
        }
        setLastInvoked(createAppCommandStatus(event, handlerId));
      });
    } catch (error) {
      setPhase("error");
      setErrorCode(toErrorCode(error));
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        appCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => {});
    };
  }, [client]);

  async function invokeCommand(commandId: string, source: CommandSource): Promise<void> {
    setErrorCode(null);
    try {
      await client.command.invoke(commandId, {}, { source });
    } catch (error) {
      setErrorCode(toErrorCode(error));
      setPhase("error");
    }
  }

  return {
    adapter,
    phase,
    errorCode,
    lastInvoked,
    invokeCommand,
  };
}
