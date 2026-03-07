import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface BoxInspectResult {
  path: string;
  type: "full" | "shell" | "mixed";
  cards: Array<{ path: string; type: "internal" | "external" }>;
  metadata?: Record<string, unknown>;
}

export interface BoxApi {
  pack(inputDir: string, options?: { output?: string }): Promise<string>;
  unpack(boxFile: string, outputDir: string): Promise<void>;
  inspect(boxFile: string): Promise<BoxInspectResult>;
}

export function createBoxApi(client: CoreClient): BoxApi {
  return {
    async pack(inputDir, options) {
      if (!inputDir) {
        throw createError("INVALID_ARGUMENT", "box.pack: inputDir is required.");
      }
      return client.invoke("box.pack", { inputDir, ...options });
    },
    async unpack(boxFile, outputDir) {
      if (!boxFile || !outputDir) {
        throw createError(
          "INVALID_ARGUMENT",
          "box.unpack: boxFile and outputDir are both required.",
        );
      }
      return client.invoke("box.unpack", { boxFile, outputDir });
    },
    async inspect(boxFile) {
      if (!boxFile) {
        throw createError("INVALID_ARGUMENT", "box.inspect: boxFile is required.");
      }
      return client.invoke("box.inspect", { boxFile });
    },
  };
}

