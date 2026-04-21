import { normalizeEpubPath } from "./path";

const LFH_SIGNATURE = 0x04034b50;
const CD_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const DEFLATE_COMPRESSION_METHOD = 8;

export interface EpubArchiveEntry {
  path: string;
  size: number;
  compressedSize: number;
  crc32: number;
  offset: number;
  isDirectory: boolean;
}

function normalizeZipEntryPath(entryPath: string, options?: { allowDirectory?: boolean }): string {
  const trimmed = entryPath.replace(/\\/g, "/").trim();
  const hasTrailingSlash = trimmed.endsWith("/");
  const normalized = hasTrailingSlash ? trimmed.slice(0, -1) : trimmed;

  if (!normalized) {
    if (options?.allowDirectory && hasTrailingSlash) {
      return "";
    }
    throw new Error(`Invalid ZIP entry path: ${entryPath}`);
  }

  if (normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`ZIP entry cannot be absolute: ${entryPath}`);
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");

  if (segments.length === 0 || segments.some((segment) => segment === "..")) {
    throw new Error(`ZIP entry path traversal is not allowed: ${entryPath}`);
  }

  const safePath = segments.join("/");
  return options?.allowDirectory && hasTrailingSlash ? `${safePath}/` : safePath;
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function") {
    throw new Error("当前运行时缺少 DecompressionStream，无法解压 EPUB 文件。");
  }

  const stableBytes = new Uint8Array(compressed.byteLength);
  stableBytes.set(compressed);
  const stream = new Blob([stableBytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function readUInt16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUInt32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function findEocdOffset(bytes: Uint8Array): number {
  const minimumLength = 22;

  for (let offset = bytes.length - minimumLength; offset >= 0; offset -= 1) {
    if (readUInt32(bytes, offset) === EOCD_SIGNATURE) {
      return offset;
    }
  }

  throw new Error("EPUB ZIP 结构无效：找不到 End of Central Directory。");
}

function readDirectoryEntries(bytes: Uint8Array): EpubArchiveEntry[] {
  const eocdOffset = findEocdOffset(bytes);
  const totalEntries = readUInt16(bytes, eocdOffset + 10);
  const centralDirOffset = readUInt32(bytes, eocdOffset + 16);

  const entries: EpubArchiveEntry[] = [];
  let cursor = centralDirOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    const signature = readUInt32(bytes, cursor);
    if (signature !== CD_SIGNATURE) {
      throw new Error("EPUB ZIP 结构无效：Central Directory 签名错误。");
    }

    const compressedSize = readUInt32(bytes, cursor + 20);
    const size = readUInt32(bytes, cursor + 24);
    const fileNameLength = readUInt16(bytes, cursor + 28);
    const extraLength = readUInt16(bytes, cursor + 30);
    const commentLength = readUInt16(bytes, cursor + 32);
    const crc32 = readUInt32(bytes, cursor + 16);
    const localOffset = readUInt32(bytes, cursor + 42);
    const fileName = new TextDecoder("utf-8").decode(bytes.subarray(cursor + 46, cursor + 46 + fileNameLength));
    const isDirectory = fileName.endsWith("/");
    const normalizedPath = isDirectory
      ? normalizeZipEntryPath(fileName, { allowDirectory: true })
      : normalizeZipEntryPath(fileName);

    entries.push({
      path: normalizedPath,
      size,
      compressedSize,
      crc32,
      offset: localOffset,
      isDirectory,
    });

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

export class EpubArchive {
  private readonly binaryCache = new Map<string, Uint8Array>();
  private readonly textCache = new Map<string, string>();

  public constructor(
    private readonly bytes: Uint8Array,
    private readonly entries: Map<string, EpubArchiveEntry>,
  ) {}

  public listEntries(): EpubArchiveEntry[] {
    return Array.from(this.entries.values());
  }

  public hasEntry(path: string): boolean {
    return this.entries.has(normalizeEpubPath(path));
  }

  public async readBinary(entryPath: string): Promise<Uint8Array> {
    const normalized = normalizeEpubPath(entryPath);
    const cached = this.binaryCache.get(normalized);
    if (cached) {
      return cached;
    }

    const entry = this.entries.get(normalized);
    if (!entry || entry.isDirectory) {
      throw new Error(`EPUB 资源不存在：${entryPath}`);
    }

    const localHeaderOffset = entry.offset;
    const signature = readUInt32(this.bytes, localHeaderOffset);
    if (signature !== LFH_SIGNATURE) {
      throw new Error("EPUB ZIP 结构无效：Local File Header 签名错误。");
    }

    const compressionMethod = readUInt16(this.bytes, localHeaderOffset + 8);
    const fileNameLength = readUInt16(this.bytes, localHeaderOffset + 26);
    const extraLength = readUInt16(this.bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    const compressedData = this.bytes.slice(dataStart, dataEnd);

    const result =
      compressionMethod === 0
        ? compressedData
        : compressionMethod === DEFLATE_COMPRESSION_METHOD
          ? await inflateRawBytes(compressedData)
          : (() => {
              throw new Error(`不支持的 EPUB ZIP 压缩方式：${compressionMethod}`);
            })();

    this.binaryCache.set(normalized, result);
    return result;
  }

  public async readText(entryPath: string): Promise<string> {
    const normalized = normalizeEpubPath(entryPath);
    const cached = this.textCache.get(normalized);
    if (cached) {
      return cached;
    }

    const decoded = new TextDecoder("utf-8").decode(await this.readBinary(normalized));
    this.textCache.set(normalized, decoded);
    return decoded;
  }
}

export async function openEpubArchive(bytes: Uint8Array): Promise<EpubArchive> {
  const entries = readDirectoryEntries(bytes);
  const entryMap = new Map(entries.map((entry) => [normalizeEpubPath(entry.path), entry]));
  return new EpubArchive(bytes, entryMap);
}
