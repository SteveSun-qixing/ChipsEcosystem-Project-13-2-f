import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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
});
