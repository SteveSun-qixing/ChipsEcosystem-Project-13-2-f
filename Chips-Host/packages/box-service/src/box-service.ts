import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createError } from '../../../src/shared/errors';
import { parseYamlLite } from '../../../src/shared/yaml-lite';
import { StoreZipService } from '../../zip-service/src';

export interface BoxInspection {
  metadata: Record<string, unknown>;
  cards: Array<{ id: string; path: string; internal: boolean }>;
  layout: Record<string, unknown>;
}

export class BoxService {
  public constructor(private readonly zip = new StoreZipService()) {}

  public async pack(boxDir: string, outputPath: string): Promise<string> {
    await this.zip.compress(boxDir, outputPath);
    return outputPath;
  }

  public async unpack(boxFile: string, outputDir: string): Promise<string> {
    await this.zip.extract(boxFile, outputDir);
    return outputDir;
  }

  public async inspect(boxFile: string): Promise<BoxInspection> {
    const valid = await this.validate(boxFile);
    if (!valid.valid) {
      throw createError('BOX_FORMAT_INVALID', 'Box format validation failed', valid.errors);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-box-inspect-'));
    try {
      await this.zip.extract(boxFile, tempDir);
      const metadata = parseYamlLite(await fs.readFile(path.join(tempDir, '.box/metadata.yaml'), 'utf-8'));
      const structure = parseYamlLite(await fs.readFile(path.join(tempDir, '.box/structure.yaml'), 'utf-8'));
      const layout = parseYamlLite(await fs.readFile(path.join(tempDir, '.box/content.yaml'), 'utf-8'));

      const cards = this.normalizeCards(structure);
      return {
        metadata,
        cards,
        layout
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  public async validate(boxFile: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const entries = await this.zip.list(boxFile);
      const names = new Set(entries.map((entry) => entry.path));
      const required = ['.box/metadata.yaml', '.box/structure.yaml', '.box/content.yaml'];
      const errors = required.filter((requiredPath) => !names.has(requiredPath));

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [String(error)]
      };
    }
  }

  private normalizeCards(structure: Record<string, unknown>): Array<{ id: string; path: string; internal: boolean }> {
    const rawCards = structure.cards;
    if (!Array.isArray(rawCards)) {
      return [];
    }

    return rawCards
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return undefined;
        }
        const record = item as Record<string, unknown>;
        if (typeof record.id !== 'string' || typeof record.path !== 'string') {
          return undefined;
        }

        return {
          id: record.id,
          path: record.path,
          internal: typeof record.internal === 'boolean' ? record.internal : false
        };
      })
      .filter((value): value is { id: string; path: string; internal: boolean } => Boolean(value));
  }
}
