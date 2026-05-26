import { useCallback, useEffect, useMemo, useState } from "react";
import { createCommandAdapter, type ChipsCommandAdapter, type ChipsCommandView } from "@chips/component-library";
import type { Client, CommandInvocationContext, CommandSource } from "chips-sdk";
import { useAppRuntime } from "../app/AppRuntimeProvider";
import {
  applyPhotoViewerCommandState,
  createPhotoViewerCommandStates,
  createPhotoViewerCommandStatus,
  getPhotoViewerCommandHandlerId,
  isPhotoViewerCommandInvokedEvent,
  photoViewerCommandDefinitions,
  photoViewerCommandViews,
  updateRegisteredPhotoViewerCommandStates,
  type PhotoViewerCommandId,
  type PhotoViewerCommandPhase,
  type PhotoViewerCommandStatus,
} from "./photo-viewer-commands";

export interface UsePhotoViewerCommandsOptions {
  client?: Client;
}

export interface UsePhotoViewerCommandsResult {
  adapter: ChipsCommandAdapter;
  commands: ChipsCommandView[];
  phase: PhotoViewerCommandPhase;
  errorCode: string | null;
  lastInvoked: PhotoViewerCommandStatus | null;
  invocationContext: CommandInvocationContext;
  invokeCommand(commandId: PhotoViewerCommandId, source: CommandSource): Promise<void>;
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

export function usePhotoViewerCommands(
  options: UsePhotoViewerCommandsOptions = {},
): UsePhotoViewerCommandsResult {
  const runtime = useAppRuntime();
  const client = options.client ?? runtime.client;
  const adapter = useMemo(() => createCommandAdapter(client), [client]);
  const [phase, setPhase] = useState<PhotoViewerCommandPhase>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [lastInvoked, setLastInvoked] = useState<PhotoViewerCommandStatus | null>(null);

  const invocationContext = useMemo<CommandInvocationContext>(() => {
    const context: CommandInvocationContext = {
      pluginId: runtime.environment.pluginId,
      sceneId: runtime.environment.hostSceneId,
    };
    if (runtime.environment.surfaceId) {
      context.surfaceId = runtime.environment.surfaceId;
    }
    return context;
  }, [
    runtime.environment.hostSceneId,
    runtime.environment.pluginId,
    runtime.environment.surfaceId,
  ]);

  const commandStateMap = useMemo(
    () =>
      createPhotoViewerCommandStates({
        hasImage: runtime.imageSource !== null,
        isImageLoaded: runtime.isImageLoaded,
        isSaving: runtime.isSaving,
        canPreviousImage: Boolean(runtime.imageTarget && runtime.currentImageIndex > 0),
        canNextImage: Boolean(
          runtime.imageTarget && runtime.currentImageIndex < runtime.imageTarget.images.length - 1,
        ),
      }),
    [
      runtime.currentImageIndex,
      runtime.imageSource,
      runtime.imageTarget,
      runtime.isImageLoaded,
      runtime.isSaving,
    ],
  );

  const commands = useMemo(
    () => applyPhotoViewerCommandState(photoViewerCommandViews, commandStateMap),
    [commandStateMap],
  );

  useEffect(() => {
    let cancelled = false;
    setPhase("registering");
    setErrorCode(null);

    Promise.all(photoViewerCommandDefinitions.map((definition) => client.command.register(definition)))
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
        if (!isPhotoViewerCommandInvokedEvent(event)) {
          return;
        }
        const handlerId = getPhotoViewerCommandHandlerId(event);
        if (!handlerId) {
          return;
        }
        setLastInvoked(createPhotoViewerCommandStatus(event, handlerId));
      });
    } catch (error) {
      if (!cancelled) {
        setPhase("error");
        setErrorCode(toErrorCode(error));
      }
    }

    return () => {
      cancelled = true;
      offInvoked();
      void Promise.all(
        photoViewerCommandDefinitions.map((definition) => client.command.unregister(definition.commandId)),
      ).catch(() => {});
    };
  }, [client]);

  useEffect(() => {
    if (phase !== "ready") {
      return;
    }

    let cancelled = false;
    updateRegisteredPhotoViewerCommandStates(client, commandStateMap, invocationContext)
      .catch((error: unknown) => {
        if (!cancelled) {
          setPhase("error");
          setErrorCode(toErrorCode(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, commandStateMap, invocationContext, phase]);

  const invokeCommand = useCallback(
    async (commandId: PhotoViewerCommandId, source: CommandSource): Promise<void> => {
      setErrorCode(null);
      try {
        await client.command.invoke(commandId, {}, { source, context: invocationContext });
      } catch (error) {
        setErrorCode(toErrorCode(error));
        setPhase("error");
      }
    },
    [client, invocationContext],
  );

  return {
    adapter,
    commands,
    phase,
    errorCode,
    lastInvoked,
    invocationContext,
    invokeCommand,
  };
}
