import { describe, expect, it } from "vitest";
import {
  VIDEO_PLAYER_COMMAND_HANDLER_IDS,
  VIDEO_PLAYER_COMMAND_IDS,
  createVideoPlayerCommandState,
  createVideoPlayerCommandStatus,
  createVideoPlayerCommandViews,
  videoPlayerCommandDefinitions,
} from "../../src/commands/video-player-commands";

describe("video player commands", () => {
  it("使用稳定命令 id、handlerId 和 i18n key 字段", () => {
    expect(Object.values(VIDEO_PLAYER_COMMAND_IDS)).toHaveLength(videoPlayerCommandDefinitions.length);
    expect(Object.values(VIDEO_PLAYER_COMMAND_HANDLER_IDS)).toHaveLength(videoPlayerCommandDefinitions.length);

    for (const definition of videoPlayerCommandDefinitions) {
      expect(definition.commandId).toMatch(/^com\.chips\.video-player\./);
      expect(definition.titleKey).toMatch(/^video-player\.commands\./);
      expect(definition.handlerId).toMatch(/^video-player:/);
      expect(definition).not.toHaveProperty("title");
      expect(definition).not.toHaveProperty("description");
      expect(definition).not.toHaveProperty("ariaLabel");
    }
  });

  it("根据播放器运行态派生命令状态", () => {
    const emptyState = {
      hasVideo: false,
      isSaving: false,
      canUsePictureInPicture: false,
      isPlaying: false,
      isMuted: false,
      isFullscreen: false,
      isPictureInPicture: false,
      isMorePanelOpen: false,
    };

    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.togglePlayback, emptyState).enabled).toBe(false);

    const readyState = {
      ...emptyState,
      hasVideo: true,
      canUsePictureInPicture: true,
      isPlaying: true,
      isMuted: true,
      isFullscreen: true,
      isPictureInPicture: true,
      isMorePanelOpen: true,
    };

    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.togglePlayback, readyState).checked).toBe(true);
    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.toggleMute, readyState).checked).toBe(true);
    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.toggleFullscreen, readyState).checked).toBe(true);
    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.togglePictureInPicture, readyState).checked).toBe(true);
    expect(createVideoPlayerCommandState(VIDEO_PLAYER_COMMAND_IDS.toggleMorePanel, readyState).checked).toBe(true);
    expect(createVideoPlayerCommandViews(readyState)).toHaveLength(videoPlayerCommandDefinitions.length);
  });

  it("只接收属于视频播放器的 command.invoked 事件", () => {
    expect(
      createVideoPlayerCommandStatus({
        commandId: VIDEO_PLAYER_COMMAND_IDS.openFile,
        invocationId: "invoke-1",
        source: "toolbar",
        command: videoPlayerCommandDefinitions[0] as never,
        handlerId: VIDEO_PLAYER_COMMAND_HANDLER_IDS.openFile,
        ownerPluginId: "com.chips.video-player",
      }),
    ).toMatchObject({
      commandId: VIDEO_PLAYER_COMMAND_IDS.openFile,
      handlerId: VIDEO_PLAYER_COMMAND_HANDLER_IDS.openFile,
      source: "toolbar",
    });

    expect(
      createVideoPlayerCommandStatus({
        commandId: VIDEO_PLAYER_COMMAND_IDS.openFile,
        invocationId: "invoke-2",
        source: "toolbar",
        command: videoPlayerCommandDefinitions[0] as never,
        handlerId: VIDEO_PLAYER_COMMAND_HANDLER_IDS.openFile,
        ownerPluginId: "com.chips.other",
      }),
    ).toBeNull();
  });
});

