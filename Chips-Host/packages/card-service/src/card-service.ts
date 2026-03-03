import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createError } from '../../../src/shared/errors';
import { createId } from '../../../src/shared/utils';
import { StoreZipService } from '../../zip-service/src';
import { parseYamlLite } from './yaml-lite';

export interface CardAst {
  metadata: Record<string, unknown>;
  structure: Record<string, unknown>;
  contentFiles: string[];
}

export interface RenderedCardView {
  title: string;
  body: string;
  contentFiles: string[];
}

export class CardService {
  public constructor(private readonly zip = new StoreZipService()) {}

  public async validate(cardFile: string): Promise<{ valid: boolean; errors: string[] }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-'));
    try {
      await this.zip.extract(cardFile, tempDir);
      const required = ['.card/metadata.yaml', '.card/structure.yaml', '.card/cover.html'];
      const entries = await this.zip.list(cardFile);
      const names = new Set(entries.map((entry) => entry.path));
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
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  public async parse(cardFile: string): Promise<CardAst> {
    const check = await this.validate(cardFile);
    if (!check.valid) {
      throw createError('CARD_SCHEMA_INVALID', 'Card format validation failed', check.errors);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-parse-'));
    try {
      await this.zip.extract(cardFile, tempDir);
      const metadata = parseYamlLite(await fs.readFile(path.join(tempDir, '.card/metadata.yaml'), 'utf-8'));
      const structure = parseYamlLite(await fs.readFile(path.join(tempDir, '.card/structure.yaml'), 'utf-8'));
      const contentRoot = path.join(tempDir, 'content');
      const contentFiles = await this.readFiles(contentRoot);

      return {
        metadata,
        structure,
        contentFiles
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  public async render(cardFile: string): Promise<RenderedCardView> {
    const ast = await this.parse(cardFile);
    const title = typeof ast.metadata.name === 'string' ? ast.metadata.name : 'Untitled Card';
    const cardId = typeof ast.metadata.id === 'string' ? ast.metadata.id : createId();

    const body = `<article data-card-id="${cardId}"><header><h1>${title}</h1></header><section>${ast.contentFiles
      .map((name) => `<p>${name}</p>`)
      .join('')}</section></article>`;

    return {
      title,
      body,
      contentFiles: ast.contentFiles
    };
  }

  private async readFiles(root: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const stack = [root];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
          continue;
        }

        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
          } else {
            files.push(path.relative(root, full).split(path.sep).join('/'));
          }
        }
      }
      files.sort();
      return files;
    } catch {
      return [];
    }
  }
}
