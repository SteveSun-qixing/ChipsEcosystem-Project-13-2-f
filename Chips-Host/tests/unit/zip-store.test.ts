import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { StoreZipService } from '../../packages/zip-service/src';

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
});
