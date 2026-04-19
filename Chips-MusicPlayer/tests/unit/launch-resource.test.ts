import { describe, expect, it } from "vitest";
import { resolveLaunchAudioTarget, resolveLaunchWorkspacePath } from "../../src/utils/launch-resource";

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
});
