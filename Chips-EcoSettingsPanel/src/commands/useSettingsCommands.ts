import React from "react";
import { createCommandAdapter, type ChipsCommandAdapter } from "@chips/component-library";
import type { Client, CommandSource } from "chips-sdk";
import {
  createSettingsCommandStatus,
  getSceneIdFromHandlerId,
  isSettingsCommandInvokedEvent,
  settingsCommandDefinitions,
  type SettingsCommandPhase,
  type SettingsCommandStatus,
} from "./settings-commands";

export interface UseSettingsCommandsResult {
  adapter: ChipsCommandAdapter;
  phase: SettingsCommandPhase;
  errorCode: string | null;
  lastInvoked: SettingsCommandStatus | null;
  invokeCommand(commandId: string, source: CommandSource): Promise<void>;
}

function toErrorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.length > 0) {
      return code;
    }
  }
  return "SETTINGS_COMMAND_RUNTIME_ERROR";
}

export function useSettingsCommands(client: Client): UseSettingsCommandsResult {
  const adapter = React.useMemo(() => createCommandAdapter(client), [client]);
  const [phase, setPhase] = React.useState<SettingsCommandPhase>("idle");
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [lastInvoked, setLastInvoked] = React.useState<SettingsCommandStatus | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setPhase("registering");
    setErrorCode(null);

    Promise.all(settingsCommandDefinitions.map((definition) => client.command.register(definition)))
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

    let offInvoked: () => void = () => undefined;
    try {
      offInvoked = client.command.onInvoked((event) => {
        if (!isSettingsCommandInvokedEvent(event)) {
          return;
        }
        const sceneId = getSceneIdFromHandlerId(event.handlerId);
        if (!sceneId) {
          return;
        }
        setLastInvoked(createSettingsCommandStatus(event, sceneId));
      });
    } catch (error) {
      setPhase("error");
      setErrorCode(toErrorCode(error));
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        settingsCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => undefined);
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
