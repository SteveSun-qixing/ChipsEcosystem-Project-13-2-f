import { describe, expect, it } from "vitest";
import {
  clampPlaybackTime,
  clampVolume,
  formatDuration,
  formatPlaybackRate,
  formatResolution,
  inferVideoMimeType,
  isDirectPlayableUri,
  isSupportedVideoResource,
  resolveFileName,
  resolveVideoFormatLabel,
  resolveVideoTitle,
  shouldAutoHideChrome,
} from "../../src/utils/video-player";

describe("video player utilities", () => {
  it("detects supported video resources by extension and mime type", () => {
    expect(isSupportedVideoResource({ sourceId: "/tmp/demo.mp4" })).toBe(true);
    expect(isSupportedVideoResource({ sourceId: "https://example.com/demo.webm" })).toBe(true);
    expect(isSupportedVideoResource({ sourceId: "chips-resource://video/1", mimeType: "video/mp4" })).toBe(true);
    expect(isSupportedVideoResource({ sourceId: "/tmp/demo.txt" })).toBe(false);
  });

  it("resolves direct playable URIs and filenames", () => {
    expect(isDirectPlayableUri("https://example.com/demo.mp4")).toBe(true);
    expect(isDirectPlayableUri("blob:https://example.com/token")).toBe(true);
    expect(isDirectPlayableUri("/tmp/demo.mp4")).toBe(false);
    expect(resolveFileName("/tmp/video/demo.mov")).toBe("demo.mov");
    expect(resolveFileName("https://example.com/video/demo.webm")).toBe("demo.webm");
  });

  it("formats playback labels and clamps numeric values", () => {
    expect(formatDuration(5)).toBe("00:05");
    expect(formatDuration(3725)).toBe("01:02:05");
    expect(formatPlaybackRate(1.25)).toBe("1.25x");
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampPlaybackTime(16, 12)).toBe(12);
    expect(clampPlaybackTime(-4, 12)).toBe(0);
  });

  it("infers titles, mime types and resolution text", () => {
    expect(resolveVideoTitle({ sourceId: "/tmp/demo.ogv", title: "演示视频" })).toBe("演示视频");
    expect(resolveVideoTitle({ sourceId: "/tmp/demo.ogv" })).toBe("demo.ogv");
    expect(inferVideoMimeType("/tmp/demo.webm")).toBe("video/webm");
    expect(resolveVideoFormatLabel("/tmp/demo.webm")).toBe("WEBM");
    expect(resolveVideoFormatLabel("chips-resource://video/1", "video/x-m4v")).toBe("M4V");
    expect(formatResolution({ width: 1920, height: 1080 })).toBe("1920 × 1080");
    expect(formatResolution(null)).toBe("");
  });

  it("only auto hides the toolbar in uninterrupted playback state", () => {
    expect(
      shouldAutoHideChrome({
        hasVideo: true,
        isPlaying: true,
        isMorePanelOpen: false,
        isDragActive: false,
        hasOverlay: false,
      }),
    ).toBe(true);

    expect(
      shouldAutoHideChrome({
        hasVideo: true,
        isPlaying: true,
        isMorePanelOpen: true,
        isDragActive: false,
        hasOverlay: false,
      }),
    ).toBe(false);

    expect(
      shouldAutoHideChrome({
        hasVideo: false,
        isPlaying: false,
        isMorePanelOpen: false,
        isDragActive: false,
        hasOverlay: false,
      }),
    ).toBe(false);
  });
});
