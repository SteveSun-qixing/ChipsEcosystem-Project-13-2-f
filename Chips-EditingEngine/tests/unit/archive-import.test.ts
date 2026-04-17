import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { FileEntry, ZipEntryMeta } from 'chips-sdk';
import { importArchiveBundleIntoCardRoot, resolveArchivePayloadRoot } from '../../src/editor-runtime/archive-import';

const tempDirs: string[] = [];

function toPosixPath(inputPath: string): string {
  return inputPath.replace(/\\/g, '/');
}

async function createTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function collectEntries(dir: string, recursive = false): Promise<FileEntry[]> {
  const directoryEntries = await fs.readdir(dir, { withFileTypes: true });
  const results: FileEntry[] = [];

  for (const entry of directoryEntries) {
    const entryPath = path.join(dir, entry.name);
    results.push({
      path: toPosixPath(entryPath),
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    });

    if (recursive && entry.isDirectory()) {
      results.push(...(await collectEntries(entryPath, true)));
    }
  }

  return results;
}

function createServices(input: {
  zipPath: string;
  entries: ZipEntryMeta[];
  extractImpl: (outputDir: string) => Promise<void>;
}) {
  const { zipPath, entries, extractImpl } = input;
  return {
    getPathForFile(file: unknown): string {
      return typeof file === 'object' && file !== null && 'name' in file ? zipPath : '';
    },
    async listZipEntries(targetZipPath: string): Promise<ZipEntryMeta[]> {
      expect(targetZipPath).toBe(zipPath);
      return entries;
    },
    async extractZip(_targetZipPath: string, outputDir: string): Promise<string> {
      await fs.mkdir(outputDir, { recursive: true });
      await extractImpl(outputDir);
      return outputDir;
    },
    async listFiles(dir: string, options?: { recursive?: boolean }): Promise<FileEntry[]> {
      return collectEntries(dir, Boolean(options?.recursive));
    },
    async writeBinary(targetPath: string, content: Uint8Array): Promise<void> {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, Buffer.from(content));
    },
    async move(sourcePath: string, destPath: string): Promise<void> {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.rename(sourcePath, destPath);
    },
    async delete(targetPath: string, options?: { recursive?: boolean }): Promise<void> {
      await fs.rm(targetPath, { recursive: Boolean(options?.recursive), force: true });
    },
    async exists(targetPath: string): Promise<boolean> {
      try {
        await fs.access(targetPath);
        return true;
      } catch {
        return false;
      }
    },
  };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

describe('archive-import', () => {
  it('detects payload roots for root-level and single-folder webpage archives', () => {
    expect(resolveArchivePayloadRoot([
      { path: 'index.html' },
      { path: 'assets/app.js' },
    ])).toEqual({
      payloadRoot: '',
      entryFile: 'index.html',
    });

    expect(resolveArchivePayloadRoot([
      { path: 'site/index.html' },
      { path: 'site/assets/app.js' },
    ])).toEqual({
      payloadRoot: 'site',
      entryFile: 'index.html',
    });
  });

  it('imports a webpage archive bundle into the card root and flattens a single top-level folder', async () => {
    const cardRootDir = await createTempDir('chips-card-root-');
    const zipPath = path.join(cardRootDir, 'website.zip');
    await fs.writeFile(zipPath, 'zip');

    const services = createServices({
      zipPath,
      entries: [
        { path: 'site/index.html', size: 10, compressedSize: 10, crc32: 1, offset: 0 },
        { path: 'site/assets/app.js', size: 12, compressedSize: 12, crc32: 2, offset: 10 },
        { path: '__MACOSX/._index.html', size: 1, compressedSize: 1, crc32: 3, offset: 20 },
      ],
      async extractImpl(outputDir) {
        await fs.mkdir(path.join(outputDir, 'site', 'assets'), { recursive: true });
        await fs.mkdir(path.join(outputDir, '__MACOSX'), { recursive: true });
        await fs.writeFile(path.join(outputDir, 'site', 'index.html'), '<html></html>', 'utf-8');
        await fs.writeFile(path.join(outputDir, 'site', 'assets', 'app.js'), 'console.log(1);', 'utf-8');
        await fs.writeFile(path.join(outputDir, 'site', '.DS_Store'), 'ignore', 'utf-8');
        await fs.writeFile(path.join(outputDir, '__MACOSX', '._index.html'), 'ignore', 'utf-8');
      },
    });

    const result = await importArchiveBundleIntoCardRoot({
      cardRootDir: toPosixPath(cardRootDir),
      request: {
        file: { name: 'website.zip' } as File,
        preferredRootDir: 'Web Page Bundle',
        entryFile: 'index.html',
      },
      services,
    });

    expect(result.rootDir).toMatch(/^web-page-bundle-[0-9a-z]{6}$/);
    expect(result.entryFile).toBe('index.html');
    expect(result.resourcePaths).toEqual([
      `${result.rootDir}/assets/app.js`,
      `${result.rootDir}/index.html`,
    ]);
    await expect(
      fs.readFile(path.join(cardRootDir, result.rootDir, 'index.html'), 'utf-8'),
    ).resolves.toContain('<html>');
    await expect(
      fs.readdir(path.join(cardRootDir, '.card', '__archive_import__')),
    ).resolves.toEqual([]);
  });

  it('stages the selected zip bytes when the platform bridge cannot expose a file path', async () => {
    const cardRootDir = await createTempDir('chips-card-root-file-fallback-');
    const zipBuffer = Buffer.from('mock webpage zip');
    const zipArrayBuffer = zipBuffer.buffer.slice(
      zipBuffer.byteOffset,
      zipBuffer.byteOffset + zipBuffer.byteLength,
    );
    let stagedZipPath = '';

    const result = await importArchiveBundleIntoCardRoot({
      cardRootDir: toPosixPath(cardRootDir),
      request: {
        file: {
          name: 'website.zip',
          async arrayBuffer() {
            return zipArrayBuffer;
          },
        } as File,
        preferredRootDir: 'webpage-bundle',
        entryFile: 'index.html',
      },
      services: {
        getPathForFile(): string {
          return '';
        },
        async listZipEntries(targetZipPath: string): Promise<ZipEntryMeta[]> {
          stagedZipPath = targetZipPath;
          await expect(fs.readFile(targetZipPath)).resolves.toEqual(zipBuffer);
          return [
            { path: 'site/index.html', size: 10, compressedSize: 10, crc32: 1, offset: 0 },
            { path: 'site/assets/app.js', size: 12, compressedSize: 12, crc32: 2, offset: 10 },
          ];
        },
        async extractZip(targetZipPath: string, outputDir: string): Promise<string> {
          expect(targetZipPath).toBe(stagedZipPath);
          await fs.mkdir(path.join(outputDir, 'site', 'assets'), { recursive: true });
          await fs.writeFile(path.join(outputDir, 'site', 'index.html'), '<html></html>', 'utf-8');
          await fs.writeFile(path.join(outputDir, 'site', 'assets', 'app.js'), 'console.log(1);', 'utf-8');
          return outputDir;
        },
        async listFiles(dir: string, options?: { recursive?: boolean }): Promise<FileEntry[]> {
          return collectEntries(dir, Boolean(options?.recursive));
        },
        async writeBinary(targetPath: string, content: Uint8Array): Promise<void> {
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.writeFile(targetPath, Buffer.from(content));
        },
        async move(sourcePath: string, destPath: string): Promise<void> {
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.rename(sourcePath, destPath);
        },
        async delete(targetPath: string, options?: { recursive?: boolean }): Promise<void> {
          await fs.rm(targetPath, { recursive: Boolean(options?.recursive), force: true });
        },
        async exists(targetPath: string): Promise<boolean> {
          try {
            await fs.access(targetPath);
            return true;
          } catch {
            return false;
          }
        },
      },
    });

    expect(result.rootDir).toMatch(/^webpage-bundle-[0-9a-z]{6}$/);
    expect(result.resourcePaths).toEqual([
      `${result.rootDir}/assets/app.js`,
      `${result.rootDir}/index.html`,
    ]);
    await expect(
      fs.readdir(path.join(cardRootDir, '.card', '__archive_import__')),
    ).resolves.toEqual([]);
  });

  it('cleans up staged data when the imported archive does not contain index.html', async () => {
    const cardRootDir = await createTempDir('chips-card-root-invalid-');
    const zipPath = path.join(cardRootDir, 'broken.zip');
    await fs.writeFile(zipPath, 'zip');

    const services = createServices({
      zipPath,
      entries: [
        { path: 'broken/app.js', size: 12, compressedSize: 12, crc32: 2, offset: 0 },
      ],
      async extractImpl(outputDir) {
        await fs.mkdir(path.join(outputDir, 'broken'), { recursive: true });
        await fs.writeFile(path.join(outputDir, 'broken', 'app.js'), 'console.log(1);', 'utf-8');
      },
    });

    await expect(importArchiveBundleIntoCardRoot({
      cardRootDir: toPosixPath(cardRootDir),
      request: {
        file: { name: 'broken.zip' } as File,
        preferredRootDir: 'broken-bundle',
        entryFile: 'index.html',
      },
      services,
    })).rejects.toThrow('index.html');

    await expect(fs.readdir(cardRootDir)).resolves.not.toContain('.card');
    await expect(fs.readdir(cardRootDir)).resolves.not.toContain('broken-bundle');
  });
});
