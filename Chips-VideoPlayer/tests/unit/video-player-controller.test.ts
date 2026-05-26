import { describe, expect, it } from "vitest";
import {
  createVideoPlayerSessionResetState,
  isSurfaceFullscreen,
  readAudioTracks,
  readSubtitleTracks,
  resolveInitialRate,
} from "../../src/hooks/useVideoPlayerController";
import { resolveMediaErrorKey } from "../../src/utils/video-player";

describe("video player controller lifecycle", () => {
  it("读取字幕轨道时只暴露 subtitles 与 captions，并保留选中状态", () => {
    const tracks = readSubtitleTracks({
      textTracks: {
        length: 4,
        0: { kind: "subtitles", label: "简体中文", language: "zh-CN", mode: "showing" },
        1: { kind: "metadata", label: "Chapter", language: "en", mode: "hidden" },
        2: { kind: "captions", label: "English CC", language: "en", mode: "disabled" },
        3: { kind: "descriptions", label: "Descriptions", language: "en", mode: "disabled" },
      },
    });

    expect(tracks).toEqual([
      {
        index: 0,
        label: "简体中文",
        language: "zh-CN",
        kind: "subtitles",
        selected: true,
      },
      {
        index: 2,
        label: "English CC",
        language: "en",
        kind: "captions",
        selected: false,
      },
    ]);
  });

  it("读取音频轨道时保留语言、类型和当前启用状态", () => {
    const tracks = readAudioTracks({
      audioTracks: {
        length: 2,
        0: { kind: "main", label: "Stereo", language: "en", enabled: true },
        1: { kind: "translation", label: "中文配音", language: "zh-CN", enabled: false },
      },
    });

    expect(tracks).toEqual([
      {
        index: 0,
        label: "Stereo",
        language: "en",
        kind: "main",
        selected: true,
      },
      {
        index: 1,
        label: "中文配音",
        language: "zh-CN",
        kind: "translation",
        selected: false,
      },
    ]);
  });

  it("将媒体错误资源映射到稳定多语言错误 key", () => {
    expect(resolveMediaErrorKey({ code: 1 } as MediaError)).toBe("mediaAborted");
    expect(resolveMediaErrorKey({ code: 2 } as MediaError)).toBe("mediaNetwork");
    expect(resolveMediaErrorKey({ code: 3 } as MediaError)).toBe("mediaDecode");
    expect(resolveMediaErrorKey({ code: 4 } as MediaError)).toBe("mediaSource");
    expect(resolveMediaErrorKey({ code: 99 } as MediaError)).toBe("loadFailed");
    expect(resolveMediaErrorKey(null)).toBe("mediaSource");
  });

  it("切换资源时复位播放会话并释放旧资源态", () => {
    expect(createVideoPlayerSessionResetState()).toEqual({
      isReady: false,
      isPlaying: false,
      isBuffering: false,
      duration: 0,
      currentTime: 0,
      bufferedUntil: 0,
      videoSize: null,
      errorKey: null,
      isPictureInPicture: false,
      subtitleTracks: [],
      audioTracks: [],
      playbackRate: resolveInitialRate(),
    });
  });

  it("根据 fullscreenElement 恢复当前 surface 的全屏状态", () => {
    const surface = { nodeType: 1 } as Element;
    const otherSurface = { nodeType: 1 } as Element;

    expect(isSurfaceFullscreen(surface, surface)).toBe(true);
    expect(isSurfaceFullscreen(otherSurface, surface)).toBe(false);
    expect(isSurfaceFullscreen(null, surface)).toBe(false);
    expect(isSurfaceFullscreen(surface, null)).toBe(false);
  });
});
