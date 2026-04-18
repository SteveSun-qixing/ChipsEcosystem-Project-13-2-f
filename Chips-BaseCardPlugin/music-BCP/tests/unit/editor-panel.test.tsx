import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

function encodeTextFrame(frameId: string, text: string): Uint8Array {
  const payload = new Uint8Array([3, ...new TextEncoder().encode(text)]);
  const header = new Uint8Array(10);
  header.set(Array.from(frameId).map((char) => char.charCodeAt(0)), 0);
  header[4] = (payload.length >>> 24) & 0xff;
  header[5] = (payload.length >>> 16) & 0xff;
  header[6] = (payload.length >>> 8) & 0xff;
  header[7] = payload.length & 0xff;

  return new Uint8Array([...header, ...payload]);
}

function encodeLyricsFrame(text: string): Uint8Array {
  const payload = new Uint8Array([3, 0x65, 0x6e, 0x67, 0x00, ...new TextEncoder().encode(text)]);
  const header = new Uint8Array(10);
  header.set(Array.from("USLT").map((char) => char.charCodeAt(0)), 0);
  header[4] = (payload.length >>> 24) & 0xff;
  header[5] = (payload.length >>> 16) & 0xff;
  header[6] = (payload.length >>> 8) & 0xff;
  header[7] = payload.length & 0xff;

  return new Uint8Array([...header, ...payload]);
}

function encodeArtworkFrame(bytes: Uint8Array): Uint8Array {
  const mime = new TextEncoder().encode("image/jpeg");
  const payload = new Uint8Array([0, ...mime, 0, 3, 0, ...bytes]);
  const header = new Uint8Array(10);
  header.set(Array.from("APIC").map((char) => char.charCodeAt(0)), 0);
  header[4] = (payload.length >>> 24) & 0xff;
  header[5] = (payload.length >>> 16) & 0xff;
  header[6] = (payload.length >>> 8) & 0xff;
  header[7] = payload.length & 0xff;

  return new Uint8Array([...header, ...payload]);
}

function toSyncSafe(size: number): Uint8Array {
  return new Uint8Array([
    (size >>> 21) & 0x7f,
    (size >>> 14) & 0x7f,
    (size >>> 7) & 0x7f,
    size & 0x7f,
  ]);
}

function createTaggedMp3File(): File {
  const frames = [
    encodeTextFrame("TIT2", "Midnight Echo"),
    encodeTextFrame("TPE1", "Alice / Bob"),
    encodeTextFrame("TALB", "Northern Lights"),
    encodeLyricsFrame("Falling through the city night"),
    encodeArtworkFrame(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])),
  ];
  const bodyLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const header = new Uint8Array([
    0x49, 0x44, 0x33,
    0x03,
    0x00,
    0x00,
    ...toSyncSafe(bodyLength),
  ]);
  const bytes = new Uint8Array(header.length + bodyLength);
  bytes.set(header, 0);

  let offset = header.length;
  for (const frame of frames) {
    bytes.set(frame, offset);
    offset += frame.length;
  }

  return new File([bytes], "midnight-echo.mp3", {
    type: "audio/mpeg",
  });
}

function flushAsyncWork(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 40);
  });
}

function flushDelayedAsyncWork(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 240);
  });
}

describe("createBasecardEditorRoot", () => {
  const initialConfig: BasecardConfig = {
    card_type: "MusicCard",
    theme: "",
    audio_file: "",
    music_name: "",
    album_cover: "",
    lyrics_file: "",
    production_team: [],
    release_date: "",
    album_name: "",
    language: "",
    genre: "",
  };

  it("commits optional fields before an audio file is selected and shows the default cover placeholder", () => {
    let lastConfig: BasecardConfig | undefined;

    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const titleInput = root.querySelector('[data-role="music-name-input"]') as HTMLInputElement | null;
    if (!titleInput) {
      throw new Error("找不到歌曲名输入框");
    }

    titleInput.value = "Prelude";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(lastConfig).toMatchObject({
      audio_file: "",
      music_name: "Prelude",
    });

    const coverImage = root.querySelector(".chips-music-editor__dropzone-preview img") as HTMLImageElement | null;
    expect(coverImage?.getAttribute("src")).toContain("music-cover-placeholder");
  });

  it("imports audio files and auto-fills embedded metadata, cover and lyrics", async () => {
    let lastConfig: BasecardConfig | undefined;
    const importResource = vi.fn(async (input: { preferredPath?: string; file: File }) => ({
      path: input.preferredPath ?? input.file.name,
    }));

    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
      importResource,
    });

    const audioInput = root.querySelector('[data-role="audio-input"]') as HTMLInputElement | null;
    if (!audioInput) {
      throw new Error("找不到音频上传输入框");
    }

    const taggedFile = createTaggedMp3File();
    Object.defineProperty(audioInput, "files", {
      value: [taggedFile],
      configurable: true,
    });
    audioInput.dispatchEvent(new Event("change", { bubbles: true }));

    await flushAsyncWork();

    expect(importResource).toHaveBeenCalledTimes(3);
    expect(lastConfig).toMatchObject({
      audio_file: "midnight-echo.mp3",
      music_name: "Midnight Echo",
      album_name: "Northern Lights",
      album_cover: "midnight-echo-cover.jpg",
      lyrics_file: "midnight-echo-lyrics.txt",
    });
    expect(lastConfig?.production_team[0]).toMatchObject({
      role: "歌手",
      people: ["Alice", "Bob"],
    });
  });

  it("imports the real mp3 fixture and auto-fills the embedded album cover in editor flow", async () => {
    const fixturePath = resolve(
      process.cwd(),
      "..",
      "..",
      "ProductFinishedProductTestingSpace",
      "测试音频.mp3",
    );
    const fixtureBytes = readFileSync(fixturePath);

    let lastConfig: BasecardConfig | undefined;
    const importResource = vi.fn(async (input: { preferredPath?: string; file: File }) => ({
      path: input.preferredPath ?? input.file.name,
    }));

    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
      importResource,
    });

    const audioInput = root.querySelector('[data-role="audio-input"]') as HTMLInputElement | null;
    if (!audioInput) {
      throw new Error("找不到音频上传输入框");
    }

    const taggedFile = new File([fixtureBytes], "测试音频.mp3", {
      type: "audio/mpeg",
    });
    Object.defineProperty(audioInput, "files", {
      value: [taggedFile],
      configurable: true,
    });
    audioInput.dispatchEvent(new Event("change", { bubbles: true }));

    await flushAsyncWork();

    expect(importResource).toHaveBeenCalled();
    expect(lastConfig).toMatchObject({
      audio_file: "测试音频.mp3",
      music_name: "Mine or Yours",
      album_name: "Mine or Yours",
      album_cover: "测试音频-cover.jpg",
    });
    expect(lastConfig?.production_team[0]).toMatchObject({
      role: "歌手",
      people: ["宇多田ヒカル"],
    });
  });

  it("retries resolving the cover preview url before falling back to the placeholder", async () => {
    let resolveCount = 0;
    const root = createBasecardEditorRoot({
      initialConfig: {
        ...initialConfig,
        audio_file: "demo.mp3",
        album_cover: "demo-cover.jpg",
      },
      onChange: () => undefined,
      resolveResourceUrl: async (resourcePath) => {
        if (resourcePath === "demo-cover.jpg") {
          resolveCount += 1;
          if (resolveCount < 3) {
            throw new Error("资源尚未就绪");
          }
        }

        return `file:///tmp/${resourcePath}`;
      },
    });

    await flushDelayedAsyncWork();

    const coverImage = root.querySelector('[data-role="cover-resource"] img') as HTMLImageElement | null;
    expect(coverImage?.getAttribute("src")).toBe("file:///tmp/demo-cover.jpg");
    expect(resolveCount).toBe(3);
  });
});
