import { describe, expect, it } from "vitest";
import {
  MUSIC_PLAYER_COMMAND_IDS,
  createMusicPlayerCommandDefinitions,
  createMusicPlayerCommandStates,
} from "../../src/commands/music-player-commands";

describe("music player commands", () => {
  it("registers serializable command metadata with i18n keys only", () => {
    const definitions = createMusicPlayerCommandDefinitions({
      sceneId: "scene-main",
      surfaceId: "surface-main",
    });

    expect(definitions.length).toBeGreaterThan(8);
    for (const definition of definitions) {
      expect(definition.commandId.startsWith("com.chips.music-player.")).toBe(true);
      expect(definition.titleKey).toMatch(/^music-player\.commands\./);
      expect(definition.handlerId).toBeTypeOf("string");
      expect(definition.icon?.name).toBeTypeOf("string");
      expect(definition).not.toHaveProperty("title");
      expect(definition).not.toHaveProperty("description");
      expect(definition).not.toHaveProperty("ariaLabel");
    }
  });

  it("derives command state from playback and queue status", () => {
    const states = createMusicPlayerCommandStates({
      hasTrack: true,
      canSave: true,
      canGoPrevious: false,
      canGoNext: true,
      isPlaying: true,
      isMuted: false,
      loopOne: true,
      isSaving: false,
    });

    expect(states[MUSIC_PLAYER_COMMAND_IDS.togglePlayback]?.checked).toBe(true);
    expect(states[MUSIC_PLAYER_COMMAND_IDS.toggleLoop]?.checked).toBe(true);
    expect(states[MUSIC_PLAYER_COMMAND_IDS.previousTrack]?.enabled).toBe(false);
    expect(states[MUSIC_PLAYER_COMMAND_IDS.nextTrack]?.enabled).toBe(true);
    expect(states[MUSIC_PLAYER_COMMAND_IDS.saveAudio]?.enabled).toBe(true);
  });
});

