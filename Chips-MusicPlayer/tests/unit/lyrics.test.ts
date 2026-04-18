import { describe, expect, it } from "vitest";
import { decodeTextWithFallback, findActiveLyricIndex, parseLyricsText, resolveActiveLyricProgress } from "../../src/utils/lyrics";

describe("lyrics utilities", () => {
  it("parses timed lrc content with metadata and offset", () => {
    const lyrics = parseLyricsText("[ar:Artist]\n[offset:500]\n[00:01.00]Hello\n[00:02.50]World");
    expect(lyrics.mode).toBe("timed");
    expect(lyrics.metadata.artist).toBe("Artist");
    expect(lyrics.lines[0]?.timeMs).toBe(1500);
    expect(lyrics.lines[1]?.timeMs).toBe(3000);
  });

  it("falls back to plain lyrics when timestamps are missing", () => {
    const lyrics = parseLyricsText("Line 1\nLine 2");
    expect(lyrics.mode).toBe("plain");
    expect(lyrics.lines.map((line) => line.text)).toEqual(["Line 1", "Line 2"]);
  });

  it("locates the active lyric line by current playback time", () => {
    const lyrics = parseLyricsText("[00:01.00]Hello\n[00:03.00]World");
    expect(findActiveLyricIndex(lyrics.lines, 500)).toBe(-1);
    expect(findActiveLyricIndex(lyrics.lines, 1500)).toBe(0);
    expect(findActiveLyricIndex(lyrics.lines, 3500)).toBe(1);
  });

  it("resolves progressive highlight fill for the active lyric line", () => {
    const lyrics = parseLyricsText("[00:01.00]Hello\n[00:03.00]World");
    expect(resolveActiveLyricProgress(lyrics.lines, 1000, 0)).toBe(0);
    expect(resolveActiveLyricProgress(lyrics.lines, 2000, 0)).toBe(0.5);
    expect(resolveActiveLyricProgress(lyrics.lines, 3000, 1)).toBe(1);
  });

  it("decodes binary lyric buffers with utf-8 fallback", () => {
    const bytes = new TextEncoder().encode("你好，歌词");
    expect(decodeTextWithFallback(bytes)).toBe("你好，歌词");
  });
});
