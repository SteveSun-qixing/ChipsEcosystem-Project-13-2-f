import fs from 'node:fs/promises';
import path from 'node:path';
import { crc32 } from './crc32';
import type { ZipEntryInput, ZipEntryMeta } from './types';

const LFH_SIGNATURE = 0x04034b50;
const CD_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

const DOS_TIME = 0;
const DOS_DATE = 0;

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
        files.push({
          path: path.relative(inputDir, fullPath).split(path.sep).join('/'),
          data: await fs.readFile(fullPath)
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

      const localHeader = Buffer.concat([
        writeUInt32LE(LFH_SIGNATURE),
        writeUInt16LE(20),
        writeUInt16LE(0),
        writeUInt16LE(0),
        writeUInt16LE(DOS_TIME),
        writeUInt16LE(DOS_DATE),
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
        offset
      });

      offset += localHeader.length + file.data.length;
    }

    const centralDirectoryOffset = offset;

    for (const entry of metadata) {
      const fileName = Buffer.from(entry.path, 'utf-8');
      const directoryRecord = Buffer.concat([
        writeUInt32LE(CD_SIGNATURE),
        writeUInt16LE(20),
        writeUInt16LE(20),
        writeUInt16LE(0),
        writeUInt16LE(0),
        writeUInt16LE(DOS_TIME),
        writeUInt16LE(DOS_DATE),
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
      const fileNameLength = buffer.readUInt16LE(cursor + 28);
      const extraLength = buffer.readUInt16LE(cursor + 30);
      const commentLength = buffer.readUInt16LE(cursor + 32);
      const crc = buffer.readUInt32LE(cursor + 16);
      const localOffset = buffer.readUInt32LE(cursor + 42);
      const fileName = buffer
        .subarray(cursor + 46, cursor + 46 + fileNameLength)
        .toString('utf-8');

      entries.push({
        path: fileName,
        size,
        compressedSize,
        crc32: crc,
        offset: localOffset
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
      const data = this.readEntryFromBuffer(buffer, entry);

      const destination = path.join(outputDir, entry.path);
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
    if (compressionMethod !== 0) {
      throw new Error('Unsupported ZIP compression method');
    }

    const fileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const extraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + entry.size;
    return Buffer.from(buffer.subarray(dataStart, dataEnd));
  }
}
