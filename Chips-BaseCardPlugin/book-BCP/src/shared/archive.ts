const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP64_EXTRA_ID = 0x0001;
const MAX_EOCD_SEARCH = 0xffff + 22;

export interface ZipEntry {
  path: string;
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  entryTime?: number;
  crc32: number;
  isDirectory: boolean;
}

interface CentralDirectoryInfo {
  offset: number;
  size: number;
  totalEntries: number;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function decodeEntryPath(bytes: Uint8Array, utf8: boolean): string {
  if (utf8) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  return new TextDecoder("utf-8").decode(bytes);
}

function parseDosDateTime(date: number, time: number): number | undefined {
  if (date === 0) {
    return undefined;
  }

  const day = date & 0x1f;
  const month = (date >>> 5) & 0x0f;
  const year = ((date >>> 9) & 0x7f) + 1980;
  const seconds = (time & 0x1f) * 2;
  const minutes = (time >>> 5) & 0x3f;
  const hours = (time >>> 11) & 0x1f;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

function isSafeEntryPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("\0")) {
    return false;
  }

  const segments = normalized.split("/").filter(Boolean);
  return segments.length > 0 && !segments.some((segment) => segment === "." || segment === "..");
}

function findEndOfCentralDirectory(view: DataView): CentralDirectoryInfo {
  const length = view.byteLength;
  const minOffset = Math.max(0, length - MAX_EOCD_SEARCH);

  for (let offset = length - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(view, offset) !== EOCD_SIGNATURE) {
      continue;
    }

    const commentLength = readUint16(view, offset + 20);
    if (offset + 22 + commentLength !== length) {
      continue;
    }

    const totalEntries = readUint16(view, offset + 10);
    const size = readUint32(view, offset + 12);
    const centralOffset = readUint32(view, offset + 16);

    if (totalEntries === 0xffff || size === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error("当前电子书基础卡片暂不支持 ZIP64 图片包。");
    }

    return {
      offset: centralOffset,
      size,
      totalEntries,
    };
  }

  throw new Error("找不到 ZIP 中央目录。");
}

function parseZip64Extra(extra: Uint8Array): Partial<Pick<ZipEntry, "compressedSize" | "uncompressedSize" | "localHeaderOffset">> {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  let cursor = 0;
  const result: Partial<Pick<ZipEntry, "compressedSize" | "uncompressedSize" | "localHeaderOffset">> = {};

  while (cursor + 4 <= extra.byteLength) {
    const headerId = readUint16(view, cursor);
    const dataSize = readUint16(view, cursor + 2);
    const dataOffset = cursor + 4;
    if (dataOffset + dataSize > extra.byteLength) {
      break;
    }

    if (headerId === ZIP64_EXTRA_ID) {
      let dataCursor = dataOffset;
      const readUint64AsNumber = (): number | undefined => {
        if (dataCursor + 8 > dataOffset + dataSize) {
          return undefined;
        }

        const low = readUint32(view, dataCursor);
        const high = readUint32(view, dataCursor + 4);
        dataCursor += 8;
        const value = high * 0x100000000 + low;
        return Number.isSafeInteger(value) ? value : undefined;
      };

      const uncompressedSize = readUint64AsNumber();
      const compressedSize = readUint64AsNumber();
      const localHeaderOffset = readUint64AsNumber();

      if (uncompressedSize !== undefined) {
        result.uncompressedSize = uncompressedSize;
      }
      if (compressedSize !== undefined) {
        result.compressedSize = compressedSize;
      }
      if (localHeaderOffset !== undefined) {
        result.localHeaderOffset = localHeaderOffset;
      }
    }

    cursor = dataOffset + dataSize;
  }

  return result;
}

export function parseZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const centralDirectory = findEndOfCentralDirectory(view);
  const entries: ZipEntry[] = [];
  let cursor = centralDirectory.offset;
  const end = centralDirectory.offset + centralDirectory.size;

  for (let index = 0; index < centralDirectory.totalEntries; index += 1) {
    if (cursor + 46 > view.byteLength || cursor >= end) {
      throw new Error("ZIP 中央目录结构不完整。");
    }

    if (readUint32(view, cursor) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("ZIP 中央目录条目签名无效。");
    }

    const flags = readUint16(view, cursor + 8);
    const compressionMethod = readUint16(view, cursor + 10);
    const modTime = readUint16(view, cursor + 12);
    const modDate = readUint16(view, cursor + 14);
    const crc32 = readUint32(view, cursor + 16);
    const rawCompressedSize = readUint32(view, cursor + 20);
    const rawUncompressedSize = readUint32(view, cursor + 24);
    const fileNameLength = readUint16(view, cursor + 28);
    const extraLength = readUint16(view, cursor + 30);
    const commentLength = readUint16(view, cursor + 32);
    const rawLocalHeaderOffset = readUint32(view, cursor + 42);
    const nameOffset = cursor + 46;
    const extraOffset = nameOffset + fileNameLength;
    const commentOffset = extraOffset + extraLength;

    if (commentOffset + commentLength > view.byteLength) {
      throw new Error("ZIP 中央目录条目长度无效。");
    }

    const rawPath = decodeEntryPath(
      new Uint8Array(buffer, nameOffset, fileNameLength),
      Boolean(flags & 0x0800),
    ).replace(/\\/g, "/");
    const zip64 = parseZip64Extra(new Uint8Array(buffer, extraOffset, extraLength));
    const compressedSize = rawCompressedSize === 0xffffffff
      ? zip64.compressedSize
      : rawCompressedSize;
    const uncompressedSize = rawUncompressedSize === 0xffffffff
      ? zip64.uncompressedSize
      : rawUncompressedSize;
    const localHeaderOffset = rawLocalHeaderOffset === 0xffffffff
      ? zip64.localHeaderOffset
      : rawLocalHeaderOffset;

    if (
      compressedSize === undefined ||
      uncompressedSize === undefined ||
      localHeaderOffset === undefined
    ) {
      throw new Error("ZIP64 条目大小超过当前运行时可安全处理范围。");
    }

    const fileName = rawPath.split("/").filter(Boolean).pop() ?? rawPath;

    entries.push({
      path: rawPath,
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      entryTime: parseDosDateTime(modDate, modTime),
      crc32,
      isDirectory: rawPath.endsWith("/"),
    });

    cursor = commentOffset + commentLength;
  }

  return entries.filter((entry) => isSafeEntryPath(entry.path));
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const CompressionStreamCtor = globalThis.DecompressionStream;
  if (typeof CompressionStreamCtor !== "function") {
    throw new Error("当前运行时缺少 DecompressionStream，无法解压 deflate ZIP 条目。");
  }

  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const stream = new Blob([buffer]).stream().pipeThrough(new CompressionStreamCtor("deflate-raw"));
  const output = await new Response(stream).arrayBuffer();
  return new Uint8Array(output);
}

export async function extractZipEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(buffer);
  const offset = entry.localHeaderOffset;
  if (offset + 30 > view.byteLength || readUint32(view, offset) !== LOCAL_FILE_HEADER_SIGNATURE) {
    throw new Error(`ZIP 本地文件头无效：${entry.path}`);
  }

  const fileNameLength = readUint16(view, offset + 26);
  const extraLength = readUint16(view, offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataOffset + entry.compressedSize;

  if (dataEnd > view.byteLength) {
    throw new Error(`ZIP 条目数据越界：${entry.path}`);
  }

  const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);
  if (entry.compressionMethod === 0) {
    return new Uint8Array(compressed);
  }

  if (entry.compressionMethod === 8) {
    return inflateRaw(compressed);
  }

  throw new Error(`不支持的 ZIP 压缩方法：${entry.compressionMethod}`);
}
