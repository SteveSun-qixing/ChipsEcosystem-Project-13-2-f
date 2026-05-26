import type { RgbaRasterImage } from "./png";

type TiffEndian = "little" | "big";

interface TiffImageFileDirectoryEntry {
  tag: number;
  type: number;
  count: number;
  valueOffset: number;
}

const TIFF_TYPE_SIZES: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  6: 1,
  7: 1,
  8: 2,
  9: 4,
  10: 8,
  11: 4,
  12: 8,
};

function createDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readUInt16(bytes: Uint8Array, offset: number, endian: TiffEndian): number {
  return createDataView(bytes).getUint16(offset, endian === "little");
}

function readUInt32(bytes: Uint8Array, offset: number, endian: TiffEndian): number {
  return createDataView(bytes).getUint32(offset, endian === "little");
}

function readInlineFieldBytes(entryOffset: number, bytes: Uint8Array, endian: TiffEndian): Uint8Array {
  const slice = bytes.slice(entryOffset + 8, entryOffset + 12);
  return endian === "little" ? slice : slice;
}

function getFieldBytes(entry: TiffImageFileDirectoryEntry, bytes: Uint8Array, endian: TiffEndian, entryOffset: number): Uint8Array {
  const typeSize = TIFF_TYPE_SIZES[entry.type];
  if (!typeSize) {
    throw new Error(`不支持的 TIFF 字段类型：${entry.type}`);
  }

  const totalSize = entry.count * typeSize;
  if (totalSize <= 4) {
    const inline = readInlineFieldBytes(entryOffset, bytes, endian);
    return inline.slice(0, totalSize);
  }

  const start = entry.valueOffset;
  const end = start + totalSize;
  if (start < 0 || end > bytes.length) {
    throw new Error("TIFF 字段偏移超出范围。");
  }

  return bytes.slice(start, end);
}

function parseIfdEntries(bytes: Uint8Array, ifdOffset: number, endian: TiffEndian): Map<number, TiffImageFileDirectoryEntry & { entryOffset: number }> {
  const entryCount = readUInt16(bytes, ifdOffset, endian);
  const entries = new Map<number, TiffImageFileDirectoryEntry & { entryOffset: number }>();

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > bytes.length) {
      throw new Error("TIFF IFD 条目越界。");
    }

    const entry: TiffImageFileDirectoryEntry & { entryOffset: number } = {
      tag: readUInt16(bytes, entryOffset, endian),
      type: readUInt16(bytes, entryOffset + 2, endian),
      count: readUInt32(bytes, entryOffset + 4, endian),
      valueOffset: readUInt32(bytes, entryOffset + 8, endian),
      entryOffset,
    };
    entries.set(entry.tag, entry);
  }

  return entries;
}

function readUnsignedValues(entry: (TiffImageFileDirectoryEntry & { entryOffset: number }) | undefined, bytes: Uint8Array, endian: TiffEndian): number[] {
  if (!entry) {
    return [];
  }

  const raw = getFieldBytes(entry, bytes, endian, entry.entryOffset);
  const values: number[] = [];
  const dataView = createDataView(raw);

  switch (entry.type) {
    case 1:
    case 2:
    case 6:
    case 7:
      return Array.from(raw.slice(0, entry.count));
    case 3:
      for (let index = 0; index < entry.count; index += 1) {
        values.push(dataView.getUint16(index * 2, endian === "little"));
      }
      return values;
    case 4:
      for (let index = 0; index < entry.count; index += 1) {
        values.push(dataView.getUint32(index * 4, endian === "little"));
      }
      return values;
    default:
      throw new Error(`当前不支持读取 TIFF 字段类型：${entry.type}`);
  }
}

function resolveSingleUnsignedValue(entry: (TiffImageFileDirectoryEntry & { entryOffset: number }) | undefined, bytes: Uint8Array, endian: TiffEndian): number | undefined {
  const values = readUnsignedValues(entry, bytes, endian);
  return values[0];
}

function setPixel(output: Uint8Array, pixelIndex: number, red: number, green: number, blue: number, alpha = 255): void {
  const offset = pixelIndex * 4;
  output[offset] = red;
  output[offset + 1] = green;
  output[offset + 2] = blue;
  output[offset + 3] = alpha;
}

export function decodeBaselineTiffToRgba(bytes: Uint8Array): RgbaRasterImage {
  if (bytes.length < 8) {
    throw new Error("TIFF 数据长度不足。");
  }

  const byteOrder = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0);
  const endian: TiffEndian = byteOrder === "II" ? "little" : byteOrder === "MM" ? "big" : (() => {
    throw new Error("无法识别 TIFF 字节序。");
  })();
  const magic = readUInt16(bytes, 2, endian);
  if (magic !== 42) {
    throw new Error(`不支持的 TIFF 魔数：${magic}`);
  }

  const ifdOffset = readUInt32(bytes, 4, endian);
  if (ifdOffset <= 0 || ifdOffset >= bytes.length) {
    throw new Error("TIFF IFD 偏移无效。");
  }

  const entries = parseIfdEntries(bytes, ifdOffset, endian);
  const width = resolveSingleUnsignedValue(entries.get(256), bytes, endian);
  const height = resolveSingleUnsignedValue(entries.get(257), bytes, endian);
  const compression = resolveSingleUnsignedValue(entries.get(259), bytes, endian) ?? 1;
  const photometricInterpretation = resolveSingleUnsignedValue(entries.get(262), bytes, endian) ?? 2;
  const samplesPerPixel = resolveSingleUnsignedValue(entries.get(277), bytes, endian) ?? 1;
  const planarConfiguration = resolveSingleUnsignedValue(entries.get(284), bytes, endian) ?? 1;
  const orientation = resolveSingleUnsignedValue(entries.get(274), bytes, endian) ?? 1;
  const rowsPerStrip = resolveSingleUnsignedValue(entries.get(278), bytes, endian) ?? height;
  const bitsPerSample = readUnsignedValues(entries.get(258), bytes, endian);
  const stripOffsets = readUnsignedValues(entries.get(273), bytes, endian);
  const stripByteCounts = readUnsignedValues(entries.get(279), bytes, endian);

  if (!width || !height) {
    throw new Error("TIFF 缺少有效的图像尺寸。");
  }

  if (compression !== 1) {
    throw new Error(`当前只支持未压缩 TIFF，实际压缩类型为：${compression}`);
  }

  if (photometricInterpretation !== 2) {
    throw new Error(`当前只支持 RGB TIFF，实际颜色解释为：${photometricInterpretation}`);
  }

  if (samplesPerPixel !== 3 && samplesPerPixel !== 4) {
    throw new Error(`当前只支持 RGB/RGBA TIFF，实际通道数为：${samplesPerPixel}`);
  }

  if (planarConfiguration !== 1) {
    throw new Error(`当前只支持 chunky TIFF，实际平面配置为：${planarConfiguration}`);
  }

  if (orientation !== 1) {
    throw new Error(`当前只支持 orientation=1 的 TIFF，实际为：${orientation}`);
  }

  if (bitsPerSample.length === 0 || bitsPerSample.some((value) => value !== 8)) {
    throw new Error(`当前只支持 8-bit TIFF，实际 BitsPerSample 为：${bitsPerSample.join(",")}`);
  }

  if (stripOffsets.length === 0 || stripOffsets.length !== stripByteCounts.length) {
    throw new Error("TIFF strip 信息不完整。");
  }

  const bytesPerPixel = samplesPerPixel;
  const output = new Uint8Array(width * height * 4);
  let rowIndex = 0;

  for (let stripIndex = 0; stripIndex < stripOffsets.length && rowIndex < height; stripIndex += 1) {
    const stripOffset = stripOffsets[stripIndex] ?? 0;
    const stripByteCount = stripByteCounts[stripIndex] ?? 0;
    const stripRows = Math.min(rowsPerStrip ?? height, height - rowIndex);
    const expectedStripSize = width * stripRows * bytesPerPixel;

    if (stripByteCount < expectedStripSize || stripOffset + expectedStripSize > bytes.length) {
      throw new Error("TIFF strip 数据越界或长度不足。");
    }

    const strip = bytes.slice(stripOffset, stripOffset + expectedStripSize);

    for (let localRow = 0; localRow < stripRows; localRow += 1) {
      const targetRow = rowIndex + localRow;
      for (let column = 0; column < width; column += 1) {
        const sourceOffset = (localRow * width + column) * bytesPerPixel;
        setPixel(
          output,
          targetRow * width + column,
          strip[sourceOffset] ?? 0,
          strip[sourceOffset + 1] ?? 0,
          strip[sourceOffset + 2] ?? 0,
          samplesPerPixel === 4 ? (strip[sourceOffset + 3] ?? 255) : 255,
        );
      }
    }

    rowIndex += stripRows;
  }

  return {
    width,
    height,
    data: output,
  };
}
