import type { EmbeddedArtwork } from "./audio-metadata";
import { convertEmbeddedArtworkToPngBytes } from "./artwork-runtime";
import { joinPath, resolveFileName, resolveStem } from "./music-player";

interface FileStatLike {
  isDirectory: boolean;
}

interface EmbeddedArtworkCacheClient {
  file: {
    stat(path: string): Promise<FileStatLike>;
    mkdir(path: string): Promise<void>;
    write(path: string, content: string | Uint8Array): Promise<void>;
    delete(path: string, options?: { recursive?: boolean }): Promise<void>;
  };
  resource: {
    resolve(resourceId: string): Promise<{ uri: string }>;
    convertTiffToPng(request: {
      resourceId: string;
      outputFile: string;
      overwrite?: boolean;
    }): Promise<unknown>;
  };
}

interface EmbeddedArtworkCacheLogger {
  warn(message: string, details?: unknown): void;
}

export interface PersistEmbeddedArtworkOptions {
  client: EmbeddedArtworkCacheClient;
  workspacePath?: string;
  sourceId: string;
  fileName?: string;
  artwork: EmbeddedArtwork;
  logger?: EmbeddedArtworkCacheLogger;
}

export interface PersistedEmbeddedArtwork {
  filePath: string;
  uri: string;
}

const EMBEDDED_ARTWORK_CACHE_DIR = ".music-player-artwork-cache";

function normalizeMimeType(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : "application/octet-stream";
}

function isPngMimeType(mimeType: string): boolean {
  return mimeType === "image/png";
}

function isTiffMimeType(mimeType: string): boolean {
  return mimeType === "image/tiff" || mimeType === "image/tif";
}

function sanitizeFileSegment(value: string): string {
  const normalized = value.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return normalized.length > 0 ? normalized : "audio-artwork";
}

function computeArtworkKey(sourceId: string, artwork: EmbeddedArtwork): string {
  let hash = 0x811c9dc5;

  const pushByte = (byte: number) => {
    hash ^= byte & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  };

  for (const character of `${sourceId}\u0000${normalizeMimeType(artwork.mimeType)}\u0000`) {
    pushByte(character.charCodeAt(0));
  }

  for (const byte of artwork.bytes) {
    pushByte(byte);
  }

  return hash.toString(16).padStart(8, "0");
}

async function ensureCacheDirectory(client: EmbeddedArtworkCacheClient, workspacePath: string): Promise<string> {
  const cacheDir = joinPath(workspacePath, EMBEDDED_ARTWORK_CACHE_DIR);

  try {
    const stat = await client.file.stat(cacheDir);
    if (stat.isDirectory) {
      return cacheDir;
    }
  } catch {
    // ignore and create below
  }

  await client.file.mkdir(cacheDir);
  return cacheDir;
}

async function resolvePersistedArtwork(client: EmbeddedArtworkCacheClient, outputFile: string): Promise<PersistedEmbeddedArtwork> {
  const resolved = await client.resource.resolve(outputFile);
  return {
    filePath: outputFile,
    uri: resolved.uri,
  };
}

export async function persistEmbeddedArtworkPngToWorkspace(
  options: PersistEmbeddedArtworkOptions,
): Promise<PersistedEmbeddedArtwork | null> {
  const workspacePath = options.workspacePath?.trim();
  if (!workspacePath) {
    return null;
  }

  const cacheDir = await ensureCacheDirectory(options.client, workspacePath);
  const sourceLabel = options.fileName ?? resolveFileName(options.sourceId) ?? "audio-artwork";
  const sourceStem = sanitizeFileSegment(resolveStem(sourceLabel));
  const artworkKey = computeArtworkKey(options.sourceId, options.artwork);
  const outputFile = joinPath(cacheDir, `${sourceStem}-${artworkKey}.png`);
  const mimeType = normalizeMimeType(options.artwork.mimeType);

  if (isPngMimeType(mimeType)) {
    await options.client.file.write(outputFile, options.artwork.bytes);
    return resolvePersistedArtwork(options.client, outputFile);
  }

  if (isTiffMimeType(mimeType)) {
    const sourceFile = joinPath(cacheDir, `${sourceStem}-${artworkKey}.tiff`);
    await options.client.file.write(sourceFile, options.artwork.bytes);

    try {
      await options.client.resource.convertTiffToPng({
        resourceId: sourceFile,
        outputFile,
        overwrite: true,
      });
      return await resolvePersistedArtwork(options.client, outputFile);
    } finally {
      await options.client.file.delete(sourceFile).catch((error) => {
        options.logger?.warn("清理临时 TIFF 封面文件失败，保留已有 PNG 结果", {
          sourceFile,
          error,
        });
      });
    }
  }

  const pngBytes = await convertEmbeddedArtworkToPngBytes(options.artwork);
  if (!pngBytes) {
    return null;
  }

  await options.client.file.write(outputFile, pngBytes);
  return resolvePersistedArtwork(options.client, outputFile);
}
