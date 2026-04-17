import { describe, expect, it } from "vitest";
import { resolveLaunchVideoTarget } from "../../src/utils/launch-resource";

describe("resolveLaunchVideoTarget", () => {
  it("优先使用 resourceOpen.filePath 恢复本地视频", () => {
    expect(
      resolveLaunchVideoTarget({
        launchParams: {
          targetPath: "/tmp/fallback.mp4",
          resourceOpen: {
            resourceId: "chips-resource://video/1",
            filePath: "/tmp/demo.mp4",
            fileName: "demo.mp4",
            mimeType: "video/mp4",
          },
        },
      }),
    ).toEqual({
      sourceId: "/tmp/demo.mp4",
      filePath: "/tmp/demo.mp4",
      fileName: "demo.mp4",
      mimeType: "video/mp4",
      title: undefined,
    });
  });

  it("在远端视频场景下回退到 resourceId", () => {
    expect(
      resolveLaunchVideoTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "https://example.com/demo.webm",
            mimeType: "video/webm",
            title: "Demo",
          },
        },
      }),
    ).toEqual({
      sourceId: "https://example.com/demo.webm",
      filePath: undefined,
      fileName: "demo.webm",
      mimeType: "video/webm",
      title: "Demo",
    });
  });

  it("在只有 targetPath 时恢复普通文件关联打开", () => {
    expect(
      resolveLaunchVideoTarget({
        launchParams: {
          targetPath: "/tmp/file-association.mov",
        },
      }),
    ).toEqual({
      sourceId: "/tmp/file-association.mov",
      filePath: "/tmp/file-association.mov",
      fileName: "file-association.mov",
      mimeType: undefined,
      title: undefined,
    });
  });

  it("在没有任何可用目标时返回 null", () => {
    expect(
      resolveLaunchVideoTarget({
        launchParams: {
          resourceOpen: {
            mimeType: "video/mp4",
          },
        },
      }),
    ).toBeNull();
  });
});
