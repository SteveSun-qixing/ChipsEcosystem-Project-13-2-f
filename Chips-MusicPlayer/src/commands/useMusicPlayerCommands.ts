import { useEffect, useMemo, useRef } from "react";
import type { CommandInvokedEvent } from "chips-sdk";
import { createLogger } from "../../config/logging";
import {
  MUSIC_PLAYER_HANDLER_IDS,
  createMusicPlayerCommandContext,
  createMusicPlayerCommandDefinitions,
  createMusicPlayerCommandStates,
} from "./music-player-commands";
import { useMusicPlayerRuntime } from "../app/AppRuntimeProvider";
import type { MusicPlayerController } from "../hooks/useMusicPlayerController";

export interface UseMusicPlayerCommandsOptions {
  controller: MusicPlayerController;
}

function isOwnedInvocation(event: CommandInvokedEvent, handlerIds: Set<string>): boolean {
  if (event.ownerPluginId && event.ownerPluginId !== "com.chips.music-player") {
    return false;
  }
  return typeof event.handlerId === "string" && handlerIds.has(event.handlerId);
}

export function useMusicPlayerCommands({ controller }: UseMusicPlayerCommandsOptions): void {
  const runtime = useMusicPlayerRuntime();
  const logger = useMemo(() => createLogger({ scope: "commands", traceId: runtime.traceId }), [runtime.traceId]);
  const registeredCommandIdsRef = useRef<string[]>([]);
  const handlerIds = useMemo(() => new Set<string>(Object.values(MUSIC_PLAYER_HANDLER_IDS)), []);
  const commandContext = useMemo(
    () =>
      createMusicPlayerCommandContext({
        sceneId: runtime.environment.hostSceneId,
        surfaceId: runtime.environment.surfaceId,
      }),
    [runtime.environment.hostSceneId, runtime.environment.surfaceId],
  );

  useEffect(() => {
    const definitions = createMusicPlayerCommandDefinitions({
      sceneId: runtime.environment.hostSceneId,
      surfaceId: runtime.environment.surfaceId,
    });
    let disposed = false;

    Promise.all(
      definitions.map(async (definition) => {
        const registered = await runtime.client.command.register(definition);
        return registered.commandId;
      }),
    )
      .then((commandIds) => {
        if (!disposed) {
          registeredCommandIdsRef.current = commandIds;
        }
      })
      .catch((error) => {
        logger.warn("注册音乐播放器命令失败", error);
      });

    return () => {
      disposed = true;
      const commandIds = registeredCommandIdsRef.current;
      registeredCommandIdsRef.current = [];
      void Promise.allSettled(commandIds.map((commandId) => runtime.client.command.unregister(commandId))).catch((error) => {
        logger.warn("注销音乐播放器命令失败", error);
      });
    };
  }, [logger, runtime.client, runtime.environment.hostSceneId, runtime.environment.surfaceId]);

  useEffect(() => {
    return runtime.client.command.onInvoked((event) => {
      if (!isOwnedInvocation(event, handlerIds)) {
        return;
      }

      switch (event.handlerId) {
        case MUSIC_PLAYER_HANDLER_IDS.openFiles:
          void runtime.openFiles();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.saveAudio:
          void runtime.saveAudio();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.previousTrack:
          void runtime.goPreviousTrack();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.nextTrack:
          void runtime.goNextTrack();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.togglePlayback:
          void controller.togglePlayback();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.rewind10:
          controller.seekBy(-10);
          break;
        case MUSIC_PLAYER_HANDLER_IDS.forward10:
          controller.seekBy(10);
          break;
        case MUSIC_PLAYER_HANDLER_IDS.volumeUp:
          controller.setVolumeLevel(controller.volume + 0.05);
          runtime.setPlaybackVolume(controller.volume + 0.05);
          break;
        case MUSIC_PLAYER_HANDLER_IDS.volumeDown:
          controller.setVolumeLevel(controller.volume - 0.05);
          runtime.setPlaybackVolume(controller.volume - 0.05);
          break;
        case MUSIC_PLAYER_HANDLER_IDS.toggleMute:
          controller.toggleMute();
          break;
        case MUSIC_PLAYER_HANDLER_IDS.toggleLoop:
          controller.toggleLoopMode();
          break;
        default:
          break;
      }
    });
  }, [controller, handlerIds, runtime]);

  useEffect(() => {
    const states = createMusicPlayerCommandStates({
      hasTrack: Boolean(runtime.track),
      canSave: Boolean(runtime.track),
      canGoPrevious: runtime.canGoPrevious,
      canGoNext: runtime.canGoNext,
      isPlaying: controller.isPlaying,
      isMuted: controller.isMuted,
      loopOne: controller.loopMode === "one",
      isSaving: runtime.isSaving,
    });

    void Promise.allSettled(
      Object.entries(states).map(([commandId, state]) =>
        runtime.client.command.setState(
          commandId,
          {
            ...state,
            value: state.value ?? commandContext,
          },
          {
            context: commandContext,
          },
        ),
      ),
    ).then((results) => {
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected && rejected.status === "rejected") {
        logger.warn("更新音乐播放器命令状态失败", rejected.reason);
      }
    });
  }, [
    commandContext,
    controller.isMuted,
    controller.isPlaying,
    controller.loopMode,
    logger,
    runtime.canGoNext,
    runtime.canGoPrevious,
    runtime.client,
    runtime.isSaving,
    runtime.track,
  ]);
}

