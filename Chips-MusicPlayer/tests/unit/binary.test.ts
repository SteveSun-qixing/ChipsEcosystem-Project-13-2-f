import { describe, expect, it } from "vitest";
import { normalizeBinaryContent } from "../../src/utils/binary";
import { decodeTextWithFallback, parseLyricsText } from "../../src/utils/lyrics";

describe("binary normalization", () => {
  it("decodes base64 binary strings from file.read before parsing lyrics", () => {
    const lyricsText = "[00:01.00]你好\n[00:02.50]世界";
    const encoded = Buffer.from(lyricsText, "utf8").toString("base64");

    const normalized = normalizeBinaryContent(encoded);
    const decoded = decodeTextWithFallback(normalized);
    const lyrics = parseLyricsText(decoded);

    expect(decoded).toBe(lyricsText);
    expect(lyrics.mode).toBe("timed");
    expect(lyrics.lines.map((line) => line.text)).toEqual(["你好", "世界"]);
  });

  it("keeps Uint8Array inputs unchanged", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(normalizeBinaryContent(bytes)).toEqual(bytes);
  });

  it("also decodes host-style wrapped binary payloads after unwrapping", () => {
    const lyricsText = "[00:01.00]line one";
    const wrapped = {
      content: Buffer.from(lyricsText, "utf8").toString("base64"),
    };

    const content = (wrapped as { content: string }).content;
    const decoded = decodeTextWithFallback(normalizeBinaryContent(content));
    const lyrics = parseLyricsText(decoded);

    expect(lyrics.mode).toBe("timed");
    expect(lyrics.lines[0]?.text).toBe("line one");
  });
});
