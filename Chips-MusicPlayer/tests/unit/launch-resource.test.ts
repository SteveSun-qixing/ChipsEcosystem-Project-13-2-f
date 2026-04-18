import { describe, expect, it } from "vitest";
import { resolveLaunchAudioTarget } from "../../src/utils/launch-resource";

describe("resolveLaunchAudioTarget", () => {
  it("优先使用 resourceOpen.filePath 恢复本地音频", () => {
    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          targetPath: "/tmp/fallback.mp3",
          resourceOpen: {
            resourceId: "chips-resource://audio/1",
            filePath: "/tmp/demo.mp3",
            fileName: "demo.mp3",
            mimeType: "audio/mpeg",
          },
        },
      }),
    ).toEqual({
      sourceId: "/tmp/demo.mp3",
      filePath: "/tmp/demo.mp3",
      fileName: "demo.mp3",
      mimeType: "audio/mpeg",
      title: undefined,
    });
  });

  it("在远端音频场景下回退到 resourceId", () => {
    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "https://example.com/demo.m4a",
            mimeType: "audio/mp4",
            title: "Demo Track",
          },
        },
      }),
    ).toEqual({
      sourceId: "https://example.com/demo.m4a",
      filePath: undefined,
      fileName: "demo.m4a",
      mimeType: "audio/mp4",
      title: "Demo Track",
    });
  });

  it("在只有 targetPath 时恢复普通文件关联打开", () => {
    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          targetPath: "/tmp/file-association.flac",
        },
      }),
    ).toEqual({
      sourceId: "/tmp/file-association.flac",
      filePath: "/tmp/file-association.flac",
      fileName: "file-association.flac",
      mimeType: undefined,
      title: undefined,
    });
  });

  it("在没有任何可用目标时返回 null", () => {
    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          resourceOpen: {
            mimeType: "audio/mpeg",
          },
        },
      }),
    ).toBeNull();
  });
});
