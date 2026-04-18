import { describe, expect, it } from "vitest";
import { encodeRgbaToPngBytes } from "../../src/utils/png";
import { decodeBaselineTiffToRgba } from "../../src/utils/tiff";

function writeUInt16BE(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, false);
  return bytes;
}

function writeUInt32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  return bytes;
}

function buildBigEndianTiffField(tag: number, type: number, count: number, valueBytes: Uint8Array): Uint8Array {
  const inline = valueBytes.length <= 4 ? concatBytes([valueBytes, new Uint8Array(4 - valueBytes.length)]) : valueBytes;
  return concatBytes([writeUInt16BE(tag), writeUInt16BE(type), writeUInt32BE(count), inline.slice(0, 4)]);
}

function createSimpleRgbTiff(): Uint8Array {
  const width = 2;
  const height = 1;
  const pixelBytes = Uint8Array.from([
    255, 0, 0,
    0, 255, 0,
  ]);
  const bitsPerSampleOffset = 8 + pixelBytes.length;
  const ifdOffset = bitsPerSampleOffset + 6;
  const stripOffset = 8;
  const stripByteCount = pixelBytes.length;
  const bitsPerSample = concatBytes([writeUInt16BE(8), writeUInt16BE(8), writeUInt16BE(8)]);

  const entries = [
    buildBigEndianTiffField(256, 4, 1, writeUInt32BE(width)),
    buildBigEndianTiffField(257, 4, 1, writeUInt32BE(height)),
    buildBigEndianTiffField(258, 3, 3, writeUInt32BE(bitsPerSampleOffset)),
    buildBigEndianTiffField(259, 3, 1, writeUInt16BE(1)),
    buildBigEndianTiffField(262, 3, 1, writeUInt16BE(2)),
    buildBigEndianTiffField(273, 4, 1, writeUInt32BE(stripOffset)),
    buildBigEndianTiffField(277, 3, 1, writeUInt16BE(3)),
    buildBigEndianTiffField(278, 4, 1, writeUInt32BE(height)),
    buildBigEndianTiffField(279, 4, 1, writeUInt32BE(stripByteCount)),
    buildBigEndianTiffField(284, 3, 1, writeUInt16BE(1)),
  ];

  return concatBytes([
    Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a]),
    writeUInt32BE(ifdOffset),
    pixelBytes,
    bitsPerSample,
    writeUInt16BE(entries.length),
    ...entries,
    writeUInt32BE(0),
  ]);
}

describe("TIFF and PNG runtime codec", () => {
  it("decodes a baseline RGB TIFF into RGBA pixels", () => {
    const decoded = decodeBaselineTiffToRgba(createSimpleRgbTiff());

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);
    expect(Array.from(decoded.data)).toEqual([
      255, 0, 0, 255,
      0, 255, 0, 255,
    ]);
  });

  it("encodes RGBA pixels into a PNG file signature", async () => {
    const png = await encodeRgbaToPngBytes({
      width: 1,
      height: 1,
      data: Uint8Array.from([12, 34, 56, 255]),
    });

    expect(Array.from(png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(new TextDecoder().decode(png.slice(12, 16))).toBe("IHDR");
  });
});
