export interface RgbaRasterImage {
  width: number;
  height: number;
  data: Uint8Array;
}

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function toOwnedUint8Array(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copyBuffer = new ArrayBuffer(bytes.byteLength);
  const copy = new Uint8Array(copyBuffer);
  copy.set(bytes);
  return copy;
}

function writeUInt32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, false);
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

function computeCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, payload: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const crc = computeCrc32(concatBytes([typeBytes, payload]));

  return concatBytes([writeUInt32BE(payload.length), typeBytes, payload, writeUInt32BE(crc)]);
}

function createScanlines(image: RgbaRasterImage): Uint8Array {
  const stride = image.width * 4;
  const output = new Uint8Array((stride + 1) * image.height);

  for (let row = 0; row < image.height; row += 1) {
    const sourceOffset = row * stride;
    const targetOffset = row * (stride + 1);
    output[targetOffset] = 0;
    output.set(image.data.slice(sourceOffset, sourceOffset + stride), targetOffset + 1);
  }

  return output;
}

async function compressDeflate(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const getBuiltinModule = (process as typeof process & {
        getBuiltinModule?: (specifier: string) => { deflateSync(input: Uint8Array): Uint8Array } | undefined;
      }).getBuiltinModule;
      const zlib = typeof getBuiltinModule === "function" ? getBuiltinModule("node:zlib") : undefined;
      if (zlib?.deflateSync) {
        return Uint8Array.from(zlib.deflateSync(bytes));
      }
    } catch {
      // continue to CompressionStream fallback
    }
  }

  if (typeof CompressionStream !== "undefined") {
    const stream = new CompressionStream("deflate");
    const writer = stream.writable.getWriter();
    await writer.write(toOwnedUint8Array(bytes));
    await writer.close();
    const compressed = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(compressed);
  }

  throw new Error("当前运行时不支持 PNG 压缩编码。");
}

export async function encodeRgbaToPngBytes(image: RgbaRasterImage): Promise<Uint8Array> {
  if (!Number.isInteger(image.width) || image.width <= 0 || !Number.isInteger(image.height) || image.height <= 0) {
    throw new Error("PNG 编码需要有效的宽高。");
  }

  if (image.data.length !== image.width * image.height * 4) {
    throw new Error("RGBA 像素数据长度与图像尺寸不匹配。");
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, image.width, false);
  ihdrView.setUint32(4, image.height, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines = createScanlines(image);
  const compressed = await compressDeflate(scanlines);

  return concatBytes([
    PNG_SIGNATURE,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", new Uint8Array(0)),
  ]);
}
