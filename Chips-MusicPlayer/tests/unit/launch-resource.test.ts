import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLaunchAudioTarget, resolveLaunchWorkspacePath } from "../../src/utils/launch-resource";

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

  it("在正式 payload 存在时恢复音乐基础卡片播放上下文", () => {
    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          resourceOpen: {
            resourceId: "chips-render://card-root/session-1/tracks/demo.mp3",
            payload: {
              kind: "chips.music-card",
              version: "1.0.0",
              cardType: "base.music",
              config: {
                card_type: "MusicCard",
                theme: "",
                audio_file: "tracks/demo.mp3",
                music_name: "Evergreen",
                album_cover: "covers/demo.jpg",
                lyrics_file: "lyrics/demo.lrc",
                production_team: [
                  {
                    id: "role-1",
                    role: "歌手",
                    people: ["Alice"],
                  },
                ],
                release_date: "2026-04-19",
                album_name: "Aurora",
                language: "日语",
                genre: "流行",
              },
              resources: {
                audio: {
                  resourceId: "chips-render://card-root/session-1/tracks/demo.mp3",
                  relativePath: "tracks/demo.mp3",
                  fileName: "demo.mp3",
                  mimeType: "audio/mpeg",
                },
                cover: {
                  resourceId: "chips-render://card-root/session-1/covers/demo.jpg",
                  relativePath: "covers/demo.jpg",
                  fileName: "demo.jpg",
                },
                lyrics: {
                  resourceId: "chips-render://card-root/session-1/lyrics/demo.lrc",
                  relativePath: "lyrics/demo.lrc",
                  fileName: "demo.lrc",
                },
              },
              display: {
                title: "Evergreen",
                artist: "Alice",
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: "chips-render://card-root/session-1/tracks/demo.mp3",
      filePath: undefined,
      fileName: "demo.mp3",
      mimeType: "audio/mpeg",
      title: "Evergreen",
      musicCard: {
        kind: "chips.music-card",
        version: "1.0.0",
        cardType: "base.music",
        config: {
          card_type: "MusicCard",
          theme: "",
          audio_file: "tracks/demo.mp3",
          music_name: "Evergreen",
          album_cover: "covers/demo.jpg",
          lyrics_file: "lyrics/demo.lrc",
          production_team: [
            {
              id: "role-1",
              role: "歌手",
              people: ["Alice"],
            },
          ],
          release_date: "2026-04-19",
          album_name: "Aurora",
          language: "日语",
          genre: "流行",
        },
        resources: {
          audio: {
            resourceId: "chips-render://card-root/session-1/tracks/demo.mp3",
            relativePath: "tracks/demo.mp3",
            fileName: "demo.mp3",
            mimeType: "audio/mpeg",
          },
          cover: {
            resourceId: "chips-render://card-root/session-1/covers/demo.jpg",
            relativePath: "covers/demo.jpg",
            fileName: "demo.jpg",
          },
          lyrics: {
            resourceId: "chips-render://card-root/session-1/lyrics/demo.lrc",
            relativePath: "lyrics/demo.lrc",
            fileName: "demo.lrc",
          },
        },
        display: {
          title: "Evergreen",
          artist: "Alice",
        },
      },
    });
  });

  it("在社区 Web 远端资源场景下保留音乐卡片封面和歌词资源上下文", () => {
    const audioUrl = "http://localhost:9000/chips-card-render-cache/card-1/track.mp3";
    const coverUrl = "http://localhost:9000/chips-card-render-cache/card-1/cover.png";
    const lyricsUrl = "http://localhost:9000/chips-card-render-cache/card-1/lyrics.lrc";

    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          trigger: "resource-open-service",
          resourceOpen: {
            intent: "view",
            resourceId: audioUrl,
            fileName: "track.mp3",
            mimeType: "audio/mpeg",
            title: "Web Track",
            matchedCapability: "resource-handler:view:audio/*",
            payload: {
              kind: "chips.music-card",
              version: "1.0.0",
              cardType: "base.music",
              config: {
                card_type: "MusicCard",
                theme: "",
                audio_file: "track.mp3",
                music_name: "Web Track",
                album_cover: "cover.png",
                lyrics_file: "lyrics.lrc",
                production_team: [
                  {
                    id: "artist",
                    role: "演唱",
                    people: ["Web Artist"],
                  },
                ],
                release_date: "2026-07-06",
                album_name: "Community Cache",
                language: "中文",
                genre: "Pop",
              },
              resources: {
                audio: {
                  resourceId: audioUrl,
                  relativePath: "track.mp3",
                  fileName: "track.mp3",
                  mimeType: "audio/mpeg",
                },
                cover: {
                  resourceId: coverUrl,
                  relativePath: "cover.png",
                  fileName: "cover.png",
                  mimeType: "image/png",
                },
                lyrics: {
                  resourceId: lyricsUrl,
                  relativePath: "lyrics.lrc",
                  fileName: "lyrics.lrc",
                  mimeType: "text/plain",
                },
              },
              display: {
                title: "Web Track",
                artist: "Web Artist",
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: audioUrl,
      filePath: undefined,
      fileName: "track.mp3",
      mimeType: "audio/mpeg",
      title: "Web Track",
      musicCard: expect.objectContaining({
        resources: expect.objectContaining({
          audio: expect.objectContaining({ resourceId: audioUrl }),
          cover: expect.objectContaining({ resourceId: coverUrl }),
          lyrics: expect.objectContaining({ resourceId: lyricsUrl }),
        }),
        display: {
          title: "Web Track",
          artist: "Web Artist",
        },
      }),
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

  it("从启动上下文中提取 Host 工作区路径", () => {
    expect(
      resolveLaunchWorkspacePath({
        launchParams: {
          workspacePath: " /tmp/chips-host-workspace ",
        },
      }),
    ).toBe("/tmp/chips-host-workspace");
  });

  it("通过正式资源打开上下文接收真实音频并保留音乐卡片封面上下文", () => {
    const audioPath = requireFileMaterial("测试音频.mp3");
    const coverPath = requireFileMaterial("测试音频-专辑封面.png");

    expect(
      resolveLaunchAudioTarget({
        launchParams: {
          trigger: "resource-open-service",
          targetPath: "/tmp/stale-audio.mp3",
          resourceOpen: {
            intent: "view",
            resourceId: audioPath,
            filePath: audioPath,
            fileName: "测试音频.mp3",
            mimeType: "audio/mpeg",
            title: "真实音频回归",
            matchedCapability: "resource-handler:view:audio/*",
            payload: {
              kind: "chips.music-card",
              version: "1.0.0",
              cardType: "base.music",
              config: {
                card_type: "MusicCard",
                theme: "",
                audio_file: "测试音频.mp3",
                music_name: "真实音频回归",
                album_cover: "测试音频-专辑封面.png",
                lyrics_file: "",
                production_team: [
                  {
                    id: "performer",
                    role: "演出",
                    people: ["Chips QA"],
                  },
                ],
                release_date: "2026-05-26",
                album_name: "成品测试空间",
                language: "中文",
                genre: "Regression",
              },
              resources: {
                audio: {
                  resourceId: audioPath,
                  relativePath: "测试音频.mp3",
                  fileName: "测试音频.mp3",
                  mimeType: "audio/mpeg",
                },
                cover: {
                  resourceId: coverPath,
                  relativePath: "测试音频-专辑封面.png",
                  fileName: "测试音频-专辑封面.png",
                  mimeType: "image/png",
                },
              },
              display: {
                title: "真实音频回归",
                artist: "Chips QA",
              },
            },
          },
        },
      }),
    ).toEqual({
      sourceId: audioPath,
      filePath: audioPath,
      fileName: "测试音频.mp3",
      mimeType: "audio/mpeg",
      title: "真实音频回归",
      musicCard: expect.objectContaining({
        kind: "chips.music-card",
        resources: expect.objectContaining({
          audio: expect.objectContaining({
            resourceId: audioPath,
            relativePath: "测试音频.mp3",
          }),
          cover: expect.objectContaining({
            resourceId: coverPath,
            relativePath: "测试音频-专辑封面.png",
          }),
        }),
        display: {
          title: "真实音频回归",
          artist: "Chips QA",
        },
      }),
    });
  });
});
