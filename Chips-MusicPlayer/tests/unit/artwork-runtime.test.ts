import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmbeddedArtwork } from "../../src/utils/audio-metadata";
import { convertEmbeddedArtworkToPngBytes, resolveEmbeddedArtworkUrl } from "../../src/utils/artwork-runtime";

function createArtwork(mimeType: string, bytes: number[]): EmbeddedArtwork {
  return {
    mimeType,
    bytes: Uint8Array.from(bytes),
  };
}

function mockObjectUrls() {
  return vi.spyOn(URL, "createObjectURL").mockImplementation((object) =>
    object instanceof Blob ? `blob:${object.type}:${object.size}` : "blob:media-source",
  );
}

function installCanvasStub() {
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage,
    })),
    toBlob: vi.fn((callback: BlobCallback) => {
      callback(new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }));
    }),
  };

  vi.stubGlobal("document", {
    createElement: vi.fn(() => canvas),
  });

  return {
    canvas,
    drawImage,
  };
}

function createSimpleTiffBytes(): Uint8Array {
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

  function concat(parts: Uint8Array[]): Uint8Array {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const bytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.length;
    }
    return bytes;
  }

  function buildField(tag: number, type: number, count: number, valueBytes: Uint8Array): Uint8Array {
    const inline = valueBytes.length <= 4 ? concat([valueBytes, new Uint8Array(4 - valueBytes.length)]) : valueBytes;
    return concat([writeUInt16BE(tag), writeUInt16BE(type), writeUInt32BE(count), inline.slice(0, 4)]);
  }

  const width = 2;
  const height = 1;
  const pixelBytes = Uint8Array.from([255, 0, 0, 0, 255, 0]);
  const bitsPerSampleOffset = 8 + pixelBytes.length;
  const ifdOffset = bitsPerSampleOffset + 6;
  const bitsPerSample = concat([writeUInt16BE(8), writeUInt16BE(8), writeUInt16BE(8)]);
  const entries = [
    buildField(256, 4, 1, writeUInt32BE(width)),
    buildField(257, 4, 1, writeUInt32BE(height)),
    buildField(258, 3, 3, writeUInt32BE(bitsPerSampleOffset)),
    buildField(259, 3, 1, writeUInt16BE(1)),
    buildField(262, 3, 1, writeUInt16BE(2)),
    buildField(273, 4, 1, writeUInt32BE(8)),
    buildField(277, 3, 1, writeUInt16BE(3)),
    buildField(278, 4, 1, writeUInt32BE(height)),
    buildField(279, 4, 1, writeUInt32BE(pixelBytes.length)),
    buildField(284, 3, 1, writeUInt16BE(1)),
  ];

  return concat([
    Uint8Array.from([0x4d, 0x4d, 0x00, 0x2a]),
    writeUInt32BE(ifdOffset),
    pixelBytes,
    bitsPerSample,
    writeUInt16BE(entries.length),
    ...entries,
    writeUInt32BE(0),
  ]);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("embedded artwork runtime handling", () => {
  it("keeps browser-friendly artwork formats as direct blob urls", async () => {
    const createObjectURL = mockObjectUrls();

    const url = await resolveEmbeddedArtworkUrl(createArtwork("image/jpeg", [0xff, 0xd8, 0xff]));
    const firstCallObject = createObjectURL.mock.calls[0]?.[0];

    expect(url).toBe("blob:image/jpeg:3");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(firstCallObject).toBeInstanceOf(Blob);
    expect((firstCallObject as Blob).type).toBe("image/jpeg");
  });

  it("transcodes unsupported artwork through ImageDecoder when available", async () => {
    const createObjectURL = mockObjectUrls();
    const { canvas, drawImage } = installCanvasStub();
    const imageClose = vi.fn();

    class FakeImageDecoder {
      static async isTypeSupported(mimeType: string): Promise<boolean> {
        return mimeType === "image/heic";
      }

      constructor(_init: { type: string; data: ArrayBuffer }) {}

      async decode(): Promise<{ image: { displayWidth: number; displayHeight: number; close: () => void } }> {
        return {
          image: {
            displayWidth: 300,
            displayHeight: 300,
            close: imageClose,
          },
        };
      }

      close(): void {}
    }

    vi.stubGlobal("ImageDecoder", FakeImageDecoder);

    const url = await resolveEmbeddedArtworkUrl(createArtwork("image/heic", [0x00, 0x00, 0x00, 0x18]));

    expect(url).toBe("blob:image/png:4");
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(300);
    expect(imageClose).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("image/png");
  });

  it("transcodes baseline tiff artwork into png bytes without relying on browser decoders", async () => {
    const pngBytes = await convertEmbeddedArtworkToPngBytes(createArtwork("image/tiff", Array.from(createSimpleTiffBytes())));

    expect(pngBytes).not.toBeNull();
    expect(Array.from(pngBytes?.slice(0, 8) ?? [])).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it("falls back to the original artwork blob when runtime transcoding is unavailable", async () => {
    const createObjectURL = mockObjectUrls();

    class FakeImageDecoder {
      static async isTypeSupported(): Promise<boolean> {
        return false;
      }
    }

    vi.stubGlobal("ImageDecoder", FakeImageDecoder);

    const url = await resolveEmbeddedArtworkUrl(createArtwork("image/heic", [0x00, 0x00, 0x00, 0x18]));

    expect(url).toBe("blob:image/heic:4");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("image/heic");
  });
});
