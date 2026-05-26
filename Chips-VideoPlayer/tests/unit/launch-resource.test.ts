import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLaunchVideoTarget } from "../../src/utils/launch-resource";

const workspaceRoot = resolve(__dirname, "../../..");
const testingSpaceRoot = resolve(workspaceRoot, "ProductFinishedProductTestingSpace");

function requireFileMaterial(relativePath: string): string {
  const filePath = resolve(testingSpaceRoot, relativePath);
  if (!existsSync(filePath)) {
    throw new Error(`真实素材缺失：${filePath}`);
  }

  if (!statSync(filePath).isFile()) {
    throw new Error(`真实素材不是文件：${filePath}`);
  }

  return filePath;
}

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

  it("通过正式资源打开上下文接收真实视频并保留视频卡片播放上下文", () => {
    const videoPath = requireFileMaterial("测试视频.mp4");

    expect(
      resolveLaunchVideoTarget({
        launchParams: {
          trigger: "resource-open-service",
          targetPath: "/tmp/stale-video.mp4",
          resourceOpen: {
            intent: "view",
            resourceId: videoPath,
            filePath: videoPath,
            fileName: "测试视频.mp4",
            mimeType: "video/mp4",
            title: "真实视频回归",
            matchedCapability: "resource-handler:view:video/*",
            payload: {
              kind: "chips.video-card",
              version: "1.0.0",
              cardType: "base.video",
              config: {
                card_type: "VideoCard",
                theme: "",
                video_file: "测试视频.mp4",
                cover_image: "",
                subtitles: [],
                playback: {
                  autoplay: false,
                  loop: true,
                  muted: true,
                  playback_rate: 1.25,
                  start_time: 12,
                },
                video_title: "真实视频回归",
                publish_time: "2026-05-26",
                creator: "Chips QA",
              },
              resources: {
                video: {
                  resourceId: videoPath,
                  relativePath: "测试视频.mp4",
                  fileName: "测试视频.mp4",
                  mimeType: "video/mp4",
                },
              },
              display: {
                title: "真实视频回归",
                creator: "Chips QA",
                publishTime: "2026-05-26",
              },
              playback: {
                autoplay: false,
                loop: true,
                muted: true,
                playbackRate: 1.25,
                startTime: 12,
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: videoPath,
      filePath: videoPath,
      fileName: "测试视频.mp4",
      mimeType: "video/mp4",
      title: "真实视频回归",
      videoCard: expect.objectContaining({
        kind: "chips.video-card",
        resources: expect.objectContaining({
          video: expect.objectContaining({
            resourceId: videoPath,
            relativePath: "测试视频.mp4",
          }),
        }),
        playback: {
          autoplay: false,
          loop: true,
          muted: true,
          playbackRate: 1.25,
          startTime: 12,
        },
      }),
    });
  });
});
