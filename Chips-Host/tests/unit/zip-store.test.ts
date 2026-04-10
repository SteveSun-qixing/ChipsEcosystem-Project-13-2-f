import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { StoreZipService } from '../../packages/zip-service/src';
import { crc32 } from '../../packages/zip-service/src/crc32';

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;

const writeUInt16LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
};

const writeUInt32LE = (value: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
};

const createZipBuffer = (
  entryPath: string,
  content: Buffer,
  options?: { compressionMethod?: 0 | 8 },
): Buffer => {
  const fileName = Buffer.from(entryPath, 'utf-8');
  const compressionMethod = options?.compressionMethod ?? 0;
  const compressedData = compressionMethod === 8 ? zlib.deflateRawSync(content) : content;
  const checksum = crc32(content);

  const localHeader = Buffer.concat([
    writeUInt32LE(LOCAL_FILE_HEADER_SIGNATURE),
    writeUInt16LE(20),
    writeUInt16LE(0),
    writeUInt16LE(compressionMethod),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt32LE(checksum),
    writeUInt32LE(compressedData.length),
    writeUInt32LE(content.length),
    writeUInt16LE(fileName.length),
    writeUInt16LE(0),
    fileName,
  ]);

  const localSection = Buffer.concat([localHeader, compressedData]);
  const centralDirectory = Buffer.concat([
    writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE),
    writeUInt16LE(20),
    writeUInt16LE(20),
    writeUInt16LE(0),
    writeUInt16LE(compressionMethod),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt32LE(checksum),
    writeUInt32LE(compressedData.length),
    writeUInt32LE(content.length),
    writeUInt16LE(fileName.length),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt32LE(0),
    writeUInt32LE(0),
    fileName,
  ]);

  const eocd = Buffer.concat([
    writeUInt32LE(EOCD_SIGNATURE),
    writeUInt16LE(0),
    writeUInt16LE(0),
    writeUInt16LE(1),
    writeUInt16LE(1),
    writeUInt32LE(centralDirectory.length),
    writeUInt32LE(localSection.length),
    writeUInt16LE(0),
  ]);

  return Buffer.concat([localSection, centralDirectory, eocd]);
};

describe('StoreZipService', () => {
  it('compresses and extracts store-only zip archives', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-zip-test-'));
    const inputDir = path.join(workspace, 'input');
    const outputZip = path.join(workspace, 'sample.zip');
    const outputDir = path.join(workspace, 'output');

    await fs.mkdir(path.join(inputDir, 'nested'), { recursive: true });
    await fs.writeFile(path.join(inputDir, 'a.txt'), 'alpha', 'utf-8');
    await fs.writeFile(path.join(inputDir, 'nested', 'b.txt'), 'beta', 'utf-8');

    const zip = new StoreZipService();
    await zip.compress(inputDir, outputZip);

    const entries = await zip.list(outputZip);
    expect(entries.map((entry) => entry.path)).toEqual(['a.txt', 'nested/b.txt']);
    await expect(zip.readEntry(outputZip, 'nested/b.txt')).resolves.toEqual(Buffer.from('beta'));

    await zip.extract(outputZip, outputDir);
    const a = await fs.readFile(path.join(outputDir, 'a.txt'), 'utf-8');
    const b = await fs.readFile(path.join(outputDir, 'nested', 'b.txt'), 'utf-8');

    expect(a).toBe('alpha');
    expect(b).toBe('beta');

    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('extracts standard zip archives that contain directory entries', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-zip-dir-entry-test-'));
    const inputDir = path.join(workspace, 'input');
    const outputZip = path.join(workspace, 'sample-with-directories.zip');
    const outputDir = path.join(workspace, 'output');

    await fs.mkdir(path.join(inputDir, '.box'), { recursive: true });
    await fs.mkdir(path.join(inputDir, 'assets', 'previews'), { recursive: true });
    await fs.writeFile(path.join(inputDir, '.box', 'metadata.yaml'), 'name: demo\n', 'utf-8');
    await fs.writeFile(path.join(inputDir, 'assets', 'previews', 'cover.txt'), 'cover', 'utf-8');

    const probe = spawnSync('zip', ['-v'], { stdio: 'ignore' });
    if (probe.error || probe.status !== 0) {
      throw new Error('zip command is required for directory-entry extraction test.');
    }

    const zipped = spawnSync('zip', ['-0', '-r', outputZip, '.box', 'assets'], {
      cwd: inputDir,
      stdio: 'ignore'
    });
    expect(zipped.status).toBe(0);

    const zip = new StoreZipService();
    const entries = await zip.list(outputZip);
    expect(entries.some((entry) => entry.path === '.box/')).toBe(true);
    expect(entries.some((entry) => entry.path === 'assets/previews/')).toBe(true);

    await zip.extract(outputZip, outputDir);

    await expect(fs.readFile(path.join(outputDir, '.box', 'metadata.yaml'), 'utf-8')).resolves.toBe('name: demo\n');
    await expect(fs.readFile(path.join(outputDir, 'assets', 'previews', 'cover.txt'), 'utf-8')).resolves.toBe('cover');

    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('reads and extracts deflate-compressed user zip entries', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-zip-deflate-test-'));
    const outputZip = path.join(workspace, 'deflate.zip');
    const outputDir = path.join(workspace, 'output');

    await fs.writeFile(outputZip, createZipBuffer('site/index.html', Buffer.from('<h1>hello</h1>'), {
      compressionMethod: 8,
    }));

    const zip = new StoreZipService();

    await expect(zip.readEntry(outputZip, 'site/index.html')).resolves.toEqual(Buffer.from('<h1>hello</h1>'));
    await zip.extract(outputZip, outputDir);
    await expect(fs.readFile(path.join(outputDir, 'site', 'index.html'), 'utf-8')).resolves.toBe('<h1>hello</h1>');

    await fs.rm(workspace, { recursive: true, force: true });
  });

  it('rejects zip entry path traversal during listing and extraction', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-zip-traversal-test-'));
    const outputZip = path.join(workspace, 'traversal.zip');
    const outputDir = path.join(workspace, 'output');

    await fs.writeFile(outputZip, createZipBuffer('../evil.txt', Buffer.from('nope')));

    const zip = new StoreZipService();

    await expect(zip.list(outputZip)).rejects.toThrow('path traversal');
    await expect(zip.extract(outputZip, outputDir)).rejects.toThrow('path traversal');

    await fs.rm(workspace, { recursive: true, force: true });
  });
});
