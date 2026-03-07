import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface FileReadOptions {
  encoding?: "utf-8" | "binary";
}

export type FileContent = string | Uint8Array;

export interface FileStat {
  path: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  mtimeMs: number;
}

export interface FileEntry {
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

export interface FileApi {
  read(path: string, options?: FileReadOptions): Promise<FileContent>;
  write(path: string, content: FileContent, options?: { encoding?: "utf-8" | "binary" }): Promise<void>;
  stat(path: string): Promise<FileStat>;
  list(dir: string): Promise<FileEntry[]>;
}

export function createFileApi(client: CoreClient): FileApi {
  return {
    async read(path, options) {
      if (!path) {
        throw createError("INVALID_ARGUMENT", "file.read: path is required.");
      }
      return client.invoke("file.read", { path, ...options });
    },
    async write(path, content, options) {
      if (!path) {
        throw createError("INVALID_ARGUMENT", "file.write: path is required.");
      }
      return client.invoke("file.write", { path, content, ...options });
    },
    async stat(path) {
      if (!path) {
        throw createError("INVALID_ARGUMENT", "file.stat: path is required.");
      }
      return client.invoke("file.stat", { path });
    },
    async list(dir) {
      if (!dir) {
        throw createError("INVALID_ARGUMENT", "file.list: dir is required.");
      }
      return client.invoke("file.list", { dir });
    },
  };
}

