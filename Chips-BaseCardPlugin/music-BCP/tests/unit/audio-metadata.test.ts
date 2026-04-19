import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEmbeddedAudioMetadata } from "../../src/shared/audio-metadata";

function writeUInt32BE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }

  return merged;
}

function encodeAtom(type: string, ...payloadParts: Uint8Array[]): Uint8Array {
  const payload = concatBytes(...payloadParts);
  const bytes = new Uint8Array(8 + payload.length);
  writeUInt32BE(bytes, 0, bytes.length);
  bytes.set(Array.from(type).map((char) => char.charCodeAt(0)), 4);
  bytes.set(payload, 8);
  return bytes;
}

function encodeDataAtom(dataType: number, value: Uint8Array): Uint8Array {
  const header = new Uint8Array(8);
  writeUInt32BE(header, 0, dataType);
  return encodeAtom("data", header, value);
}

function encodeTextItem(type: string, value: string): Uint8Array {
  return encodeAtom(type, encodeDataAtom(1, new TextEncoder().encode(value)));
}

function createTaggedM4aBytes(): Uint8Array {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const ilst = encodeAtom(
    "ilst",
    encodeTextItem("\u00a9nam", "Glass Harbor"),
    encodeTextItem("\u00a9ART", "Iris"),
    encodeTextItem("\u00a9alb", "Harbor Lights"),
    encodeTextItem("\u00a9lyr", "Blue water in the dark"),
    encodeAtom("covr", encodeDataAtom(14, pngBytes)),
  );
  const meta = encodeAtom("meta", new Uint8Array([0, 0, 0, 0]), ilst);
  const udta = encodeAtom("udta", meta);
  const moov = encodeAtom("moov", udta);
  const ftyp = encodeAtom("ftyp", new TextEncoder().encode("M4A \u0000\u0000\u0000\u0000M4A "));

  return concatBytes(ftyp, moov);
}

function encodeId3Frame(frameId: string, payload: Uint8Array): Uint8Array {
  const header = new Uint8Array(10);
  header.set(Array.from(frameId).map((char) => char.charCodeAt(0)), 0);
  writeUInt32BE(header, 4, payload.length);
  return concatBytes(header, payload);
}

function createTaggedMp3Bytes(...frames: Uint8Array[]): Uint8Array {
  const bodyLength = frames.reduce((sum, frame) => sum + frame.length, 0);
  const header = new Uint8Array([
    0x49, 0x44, 0x33,
    0x03,
    0x00,
    0x00,
    (bodyLength >>> 21) & 0x7f,
    (bodyLength >>> 14) & 0x7f,
    (bodyLength >>> 7) & 0x7f,
    bodyLength & 0x7f,
  ]);

  return concatBytes(header, ...frames);
}

describe("parseEmbeddedAudioMetadata", () => {
  it("parses embedded text, lyrics and cover artwork from m4a metadata", () => {
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createTaggedM4aBytes(),
      fileName: "glass-harbor.m4a",
      mimeType: "audio/mp4",
    });

    expect(metadata).toMatchObject({
      title: "Glass Harbor",
      artist: "Iris",
      album: "Harbor Lights",
      lyricsText: "Blue water in the dark",
    });
    expect(metadata.artwork?.mimeType).toBe("image/png");
    expect(Array.from(metadata.artwork?.bytes ?? []).slice(0, 4)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("parses cover artwork from the real mp3 fixture in the testing workspace", () => {
    const fixturePath = resolve(
      process.cwd(),
      "..",
      "..",
      "ProductFinishedProductTestingSpace",
      "测试音频.mp3",
    );
    const bytes = readFileSync(fixturePath);

    const metadata = parseEmbeddedAudioMetadata({
      bytes,
      fileName: "测试音频.mp3",
      mimeType: "audio/mpeg",
    });

    expect(metadata).toMatchObject({
      title: "Mine or Yours",
      artist: "宇多田ヒカル",
      album: "Mine or Yours",
    });
    expect(metadata.artwork?.mimeType).toBe("image/tiff");
    expect(Array.from(metadata.artwork?.bytes.slice(0, 4) ?? [])).toEqual([0x4d, 0x4d, 0x00, 0x2a]);
    expect(metadata.artwork?.bytes.length ?? 0).toBeGreaterThan(200_000);
  });

  it("prefers detected artwork bytes over a mismatched apic mime type", () => {
    const tiffBytes = Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08]);
    const metadata = parseEmbeddedAudioMetadata({
      bytes: createTaggedMp3Bytes(
        encodeId3Frame(
          "APIC",
          Uint8Array.from([0x00, ...new TextEncoder().encode("image/jpeg"), 0x00, 0x03, 0x00, ...tiffBytes]),
        ),
      ),
      fileName: "mismatched-cover.mp3",
      mimeType: "audio/mpeg",
    });

    expect(metadata.artwork?.mimeType).toBe("image/tiff");
    expect(Array.from(metadata.artwork?.bytes ?? [])).toEqual(Array.from(tiffBytes));
  });
});
