import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'yaml';

describe('editing-engine manifest permissions', () => {
  it('declares zip.manage for webpage archive import', async () => {
    const manifestPath = path.resolve(__dirname, '../../manifest.yaml');
    const manifest = yaml.parse(await fs.readFile(manifestPath, 'utf-8')) as {
      permissions?: unknown;
    };

    expect(Array.isArray(manifest.permissions)).toBe(true);
    expect(manifest.permissions).toContain('zip.manage');
  });
});
