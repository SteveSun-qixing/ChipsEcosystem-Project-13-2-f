import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ZipEntryMeta {
  path: string;
  size: number;
  compressedSize: number;
  crc32: number;
  offset: number;
}

export interface ZipApi {
  compress(inputDir: string, outputZip: string): Promise<string>;
  extract(zipPath: string, outputDir: string): Promise<string>;
  list(zipPath: string): Promise<ZipEntryMeta[]>;
}

export function createZipApi(client: CoreClient): ZipApi {
  return {
    async compress(inputDir, outputZip) {
      if (!inputDir || !outputZip) {
        throw createError("INVALID_ARGUMENT", "zip.compress: inputDir and outputZip are both required.");
      }

      const result = await client.invoke<{ inputDir: string; outputZip: string }, { outputZip: string }>(
        "zip.compress",
        { inputDir, outputZip },
      );
      return result.outputZip;
    },
    async extract(zipPath, outputDir) {
      if (!zipPath || !outputDir) {
        throw createError("INVALID_ARGUMENT", "zip.extract: zipPath and outputDir are both required.");
      }

      const result = await client.invoke<{ zipPath: string; outputDir: string }, { outputDir: string }>(
        "zip.extract",
        { zipPath, outputDir },
      );
      return result.outputDir;
    },
    async list(zipPath) {
      if (!zipPath) {
        throw createError("INVALID_ARGUMENT", "zip.list: zipPath is required.");
      }

      const result = await client.invoke<{ zipPath: string }, { entries: ZipEntryMeta[] }>("zip.list", {
        zipPath,
      });
      return Array.isArray(result.entries) ? result.entries : [];
    },
  };
}
