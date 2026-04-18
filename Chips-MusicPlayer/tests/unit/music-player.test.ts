import { describe, expect, it } from "vitest";
import {
  clampPlaybackTime,
  clampVolume,
  formatDuration,
  formatRemainingDuration,
  inferAudioMimeType,
  isAudioFilePath,
  isDirectPlayableUri,
  isImageFilePath,
  isLyricsFilePath,
  isSupportedAudioResource,
  resolveAudioFormatLabel,
  resolveFileName,
  resolveFileSelection,
  resolveTrackTitle,
} from "../../src/utils/music-player";

describe("music player utilities", () => {
  it("detects supported audio resources by extension and mime type", () => {
    expect(isSupportedAudioResource({ sourceId: "/tmp/demo.mp3" })).toBe(true);
    expect(isSupportedAudioResource({ sourceId: "https://example.com/demo.flac" })).toBe(true);
    expect(isSupportedAudioResource({ sourceId: "chips-resource://audio/1", mimeType: "audio/mpeg" })).toBe(true);
    expect(isSupportedAudioResource({ sourceId: "/tmp/demo.txt" })).toBe(false);
  });

  it("resolves direct playable URIs, filenames, and companion selection", () => {
    expect(isDirectPlayableUri("https://example.com/demo.mp3")).toBe(true);
    expect(isDirectPlayableUri("blob:https://example.com/token")).toBe(true);
    expect(isDirectPlayableUri("/tmp/demo.mp3")).toBe(false);
    expect(resolveFileName("/tmp/audio/demo.flac")).toBe("demo.flac");
    expect(resolveFileName("https://example.com/audio/demo.m4a")).toBe("demo.m4a");
    expect(
      resolveFileSelection(["/tmp/audio/demo.flac", "/tmp/audio/cover.jpg", "/tmp/audio/lyrics.lrc"]),
    ).toEqual({
      audioPath: "/tmp/audio/demo.flac",
      coverPath: "/tmp/audio/cover.jpg",
      lyricsPath: "/tmp/audio/lyrics.lrc",
    });
  });

  it("formats playback labels and clamps numeric values", () => {
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(3725)).toBe("01:02:05");
    expect(formatRemainingDuration(120, 15)).toBe("-01:45");
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampPlaybackTime(16, 12)).toBe(12);
    expect(clampPlaybackTime(-4, 12)).toBe(0);
  });

  it("infers titles, mime types, and auxiliary file types", () => {
    expect(resolveTrackTitle({ sourceId: "/tmp/demo.ogg", title: "演示音频" })).toBe("演示音频");
    expect(resolveTrackTitle({ sourceId: "/tmp/demo.ogg" })).toBe("demo.ogg");
    expect(inferAudioMimeType("/tmp/demo.webm")).toBe("audio/webm");
    expect(resolveAudioFormatLabel("/tmp/demo.webm")).toBe("WEBM");
    expect(resolveAudioFormatLabel("chips-resource://audio/1", "audio/x-m4a")).toBe("M4A");
    expect(isAudioFilePath("/tmp/demo.flac")).toBe(true);
    expect(isImageFilePath("/tmp/cover.webp")).toBe(true);
    expect(isLyricsFilePath("/tmp/lyrics.txt")).toBe(true);
  });
});
