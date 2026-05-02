import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { crc32 } from './crc32';
import type { ZipEntryInput, ZipEntryMeta } from './types';

const LFH_SIGNATURE = 0x04034b50;
const CD_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

const DOS_TIME = 0;
const DOS_DATE = 0;
const DEFLATE_COMPRESSION_METHOD = 8;
const STORE_COMPRESSION_METHOD = 0;

const writeUInt16LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
};

const writeUInt32LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
};

const dateToDosDateTime = (timestamp: number | undefined): { date: number; time: number; modifiedTime?: number } => {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return {
      date: DOS_DATE,
      time: DOS_TIME
    };
  }

  const source = new Date(timestamp);
  const year = Math.min(2107, Math.max(1980, source.getFullYear()));
  const month = Math.min(12, Math.max(1, source.getMonth() + 1));
  const day = Math.min(31, Math.max(1, source.getDate()));
  const hours = Math.min(23, Math.max(0, source.getHours()));
  const minutes = Math.min(59, Math.max(0, source.getMinutes()));
  const seconds = Math.min(58, Math.max(0, source.getSeconds()));

  return {
    date: ((year - 1980) << 9) | (month << 5) | day,
    time: (hours << 11) | (minutes << 5) | Math.floor(seconds / 2),
    modifiedTime: source.getTime()
  };
};

const dosDateTimeToTimestamp = (date: number, time: number): number | undefined => {
  if (date === 0) {
    return undefined;
  }

  const day = date & 0x1f;
  const month = (date >>> 5) & 0x0f;
  const year = ((date >>> 9) & 0x7f) + 1980;
  const seconds = (time & 0x1f) * 2;
  const minutes = (time >>> 5) & 0x3f;
  const hours = (time >>> 11) & 0x1f;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59 || seconds > 59) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
};

const normalizeZipEntryPath = (entryPath: string, options?: { allowDirectory?: boolean }): string => {
  const trimmed = entryPath.replace(/\\/g, '/').trim();
  const hasTrailingSlash = trimmed.endsWith('/');
  const normalized = hasTrailingSlash ? trimmed.slice(0, -1) : trimmed;

  if (!normalized) {
    if (options?.allowDirectory && hasTrailingSlash) {
      return '';
    }
    throw new Error(`Invalid ZIP entry path: ${entryPath}`);
  }

  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`ZIP entry cannot be absolute: ${entryPath}`);
  }

  const segments = normalized
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.');

  if (segments.length === 0 || segments.some((segment) => segment === '..')) {
    throw new Error(`ZIP entry path traversal is not allowed: ${entryPath}`);
  }

  const safePath = segments.join('/');
  return options?.allowDirectory && hasTrailingSlash ? `${safePath}/` : safePath;
};

const collectFiles = async (inputDir: string): Promise<ZipEntryInput[]> => {
  const files: ZipEntryInput[] = [];
  const stack = [inputDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        files.push({
          path: path.relative(inputDir, fullPath).split(path.sep).join('/'),
          data: await fs.readFile(fullPath),
          modifiedTime: stat.mtime.getTime()
        });
      }
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
};

export class StoreZipService {
  public async compress(inputDir: string, outputZip: string): Promise<void> {
    const files = await collectFiles(inputDir);
    const chunks: Buffer[] = [];
    const centralDirectory: Buffer[] = [];
    const metadata: ZipEntryMeta[] = [];
    let offset = 0;

    for (const file of files) {
      const fileName = Buffer.from(file.path, 'utf-8');
      const checksum = crc32(file.data);
      const dosDateTime = dateToDosDateTime(file.modifiedTime);

      const localHeader = Buffer.concat([
        writeUInt32LE(LFH_SIGNATURE),
        writeUInt16LE(20),
        writeUInt16LE(0),
        writeUInt16LE(STORE_COMPRESSION_METHOD),
        writeUInt16LE(dosDateTime.time),
        writeUInt16LE(dosDateTime.date),
        writeUInt32LE(checksum),
        writeUInt32LE(file.data.length),
        writeUInt32LE(file.data.length),
        writeUInt16LE(fileName.length),
        writeUInt16LE(0),
        fileName
      ]);

      chunks.push(localHeader, file.data);

      metadata.push({
        path: file.path,
        size: file.data.length,
        compressedSize: file.data.length,
        crc32: checksum,
        offset,
        isDirectory: false,
        compressionMethod: STORE_COMPRESSION_METHOD,
        modifiedTime: dosDateTime.modifiedTime
      });

      offset += localHeader.length + file.data.length;
    }

    const centralDirectoryOffset = offset;

    for (const entry of metadata) {
      const fileName = Buffer.from(entry.path, 'utf-8');
      const dosDateTime = dateToDosDateTime(entry.modifiedTime);
      const directoryRecord = Buffer.concat([
        writeUInt32LE(CD_SIGNATURE),
        writeUInt16LE(20),
        writeUInt16LE(20),
        writeUInt16LE(0),
        writeUInt16LE(entry.compressionMethod),
        writeUInt16LE(dosDateTime.time),
        writeUInt16LE(dosDateTime.date),
        writeUInt32LE(entry.crc32),
        writeUInt32LE(entry.compressedSize),
        writeUInt32LE(entry.size),
        writeUInt16LE(fileName.length),
        writeUInt16LE(0),
        writeUInt16LE(0),
        writeUInt16LE(0),
        writeUInt16LE(0),
        writeUInt32LE(0),
        writeUInt32LE(entry.offset),
        fileName
      ]);

      centralDirectory.push(directoryRecord);
      offset += directoryRecord.length;
    }

    const centralDirectorySize = offset - centralDirectoryOffset;

    const eocd = Buffer.concat([
      writeUInt32LE(EOCD_SIGNATURE),
      writeUInt16LE(0),
      writeUInt16LE(0),
      writeUInt16LE(metadata.length),
      writeUInt16LE(metadata.length),
      writeUInt32LE(centralDirectorySize),
      writeUInt32LE(centralDirectoryOffset),
      writeUInt16LE(0)
    ]);

    await fs.mkdir(path.dirname(outputZip), { recursive: true });
    await fs.writeFile(outputZip, Buffer.concat([...chunks, ...centralDirectory, eocd]));
  }

  public async list(zipPath: string): Promise<ZipEntryMeta[]> {
    const buffer = await fs.readFile(zipPath);
    const eocdOffset = this.findEocdOffset(buffer);
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

    const entries: ZipEntryMeta[] = [];
    let cursor = centralDirOffset;

    for (let index = 0; index < totalEntries; index += 1) {
      const signature = buffer.readUInt32LE(cursor);
      if (signature !== CD_SIGNATURE) {
        throw new Error('Invalid ZIP central directory signature');
      }

      const compressedSize = buffer.readUInt32LE(cursor + 20);
      const size = buffer.readUInt32LE(cursor + 24);
      const compressionMethod = buffer.readUInt16LE(cursor + 10);
      const modifiedTimeRaw = buffer.readUInt16LE(cursor + 12);
      const modifiedDateRaw = buffer.readUInt16LE(cursor + 14);
      const fileNameLength = buffer.readUInt16LE(cursor + 28);
      const extraLength = buffer.readUInt16LE(cursor + 30);
      const commentLength = buffer.readUInt16LE(cursor + 32);
      const crc = buffer.readUInt32LE(cursor + 16);
      const localOffset = buffer.readUInt32LE(cursor + 42);
      const fileName = buffer
        .subarray(cursor + 46, cursor + 46 + fileNameLength)
        .toString('utf-8');

      const isDirectory = fileName.endsWith('/');
      entries.push({
        path: isDirectory
          ? normalizeZipEntryPath(fileName, { allowDirectory: true })
          : normalizeZipEntryPath(fileName),
        size,
        compressedSize,
        crc32: crc,
        offset: localOffset,
        isDirectory,
        compressionMethod,
        modifiedTime: dosDateTimeToTimestamp(modifiedDateRaw, modifiedTimeRaw)
      });

      cursor += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  }

  public async extract(zipPath: string, outputDir: string): Promise<void> {
    const buffer = await fs.readFile(zipPath);
    const entries = await this.list(zipPath);
    await fs.mkdir(outputDir, { recursive: true });

    for (const entry of entries) {
      const normalizedEntryPath = entry.path.endsWith('/')
        ? normalizeZipEntryPath(entry.path, { allowDirectory: true })
        : normalizeZipEntryPath(entry.path);
      const destination = path.join(outputDir, normalizedEntryPath);
      if (entry.path.endsWith('/')) {
        await fs.mkdir(destination, { recursive: true });
        continue;
      }

      const data = this.readEntryFromBuffer(buffer, entry);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, data);
    }
  }

  public async readEntry(zipPath: string, entryPath: string): Promise<Buffer> {
    const buffer = await fs.readFile(zipPath);
    const entries = await this.list(zipPath);
    const entry = entries.find((item) => item.path === entryPath);
    if (!entry) {
      throw new Error(`ZIP entry not found: ${entryPath}`);
    }

    return this.readEntryFromBuffer(buffer, entry);
  }

  private findEocdOffset(buffer: Buffer): number {
    const minimumLength = 22;
    for (let offset = buffer.length - minimumLength; offset >= 0; offset -= 1) {
      if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
        return offset;
      }
    }

    throw new Error('End of central directory not found');
  }

  private readEntryFromBuffer(buffer: Buffer, entry: ZipEntryMeta): Buffer {
    const localHeaderOffset = entry.offset;
    const signature = buffer.readUInt32LE(localHeaderOffset);
    if (signature !== LFH_SIGNATURE) {
      throw new Error('Invalid ZIP local file header signature');
    }

    const compressionMethod = buffer.readUInt16LE(localHeaderOffset + 8);
    const compressedDataLength = entry.compressedSize;
    const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedDataLength;
    const compressedData = Buffer.from(buffer.subarray(dataStart, dataEnd));

    if (compressionMethod === 0) {
      return compressedData;
    }

    if (compressionMethod !== DEFLATE_COMPRESSION_METHOD) {
      throw new Error('Unsupported ZIP compression method');
    }

    return zlib.inflateRawSync(compressedData);
  }
}
