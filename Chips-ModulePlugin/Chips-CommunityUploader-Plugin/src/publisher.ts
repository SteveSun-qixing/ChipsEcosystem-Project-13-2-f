import path from "node:path";
import os from "node:os";
import { createCommunityUploaderError, type CommunityUploaderWarning } from "./errors";
import { normalizeBinaryPayload, toArrayBuffer } from "./binary";
import {
  collectFileBackedRichTextResourcePaths,
  isStructuralCardFile,
  normalizeCardPath,
  readTextFile,
  replaceCoverHtmlUrls,
  replaceYamlResourceUrls,
  restoreCoverHtmlPaths,
  restoreYamlResourcePaths,
} from "./card-rewrite";
import type {
  CommunityCardPublishContext,
  CommunityCardTransferDownloadRequest,
  CommunityCardTransferDownloadResult,
  CommunityCardTransferOpenRemoteRequest,
  CommunityCardTransferOpenRemoteResult,
  CommunityCardTransferUploadedResource,
  CommunityCardTransferUploadRequest,
  CommunityCardTransferUploadResult,
  HostCardReadInfo,
  HostFileListEntry,
  HostFileStatLike,
  HostZipEntryMeta,
  NormalizedCommunityCardTransferDownloadRequest,
  NormalizedCommunityCardTransferUploadRequest,
} from "./types";

interface LocalResource {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  mimeType: string;
}

interface ResourceCollection {
  resources: LocalResource[];
}

interface PresignedObject {
  role: "network-card" | "resource";
  relativePath: string | null;
  bucket: string;
  objectKey: string;
  publicUrl: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
}

interface DownloadPlanResource {
  originalRelativePath: string;
  networkUrl: string;
  bucket: string;
  objectKey: string;
  publicUrl?: string | null;
  downloadUrl: string;
  method?: "GET";
  headers?: Record<string, string>;
  sizeBytes: number;
  mimeType?: string | null;
}

interface DownloadPlan {
  cardId: string;
  versionId?: string | null;
  suggestedFileName?: string;
  networkCard: {
    bucket: string;
    objectKey: string;
    publicUrl?: string | null;
    downloadUrl: string;
    method?: "GET";
    headers?: Record<string, string>;
    sizeBytes: number;
    mimeType?: string | null;
  };
  resources: DownloadPlanResource[];
  restoreManifest?: unknown;
  manifest?: unknown;
}

const DEFAULT_CLIENT_NAME = "Chips Community Transfer Plugin";
const DEFAULT_CLIENT_VERSION = "0.1.0";
const CARD_MIME_TYPE = "application/vnd.chips.card+zip";
const WINDOWS_ABSOLUTE_PATTERN = /^[A-Za-z]:\//;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const detectSeparator = (filePath: string): "/" | "\\" => {
  return filePath.includes("\\") || /^[A-Za-z]:[\\/]/.test(filePath) ? "\\" : "/";
};

const toNormalizedPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/") && normalized !== "/" && !WINDOWS_ABSOLUTE_PATTERN.test(normalized)) {
    return normalized.slice(0, -1);
  }
  return normalized;
};

const toNativePath = (normalizedPath: string, referencePath: string): string => {
  return detectSeparator(referencePath) === "\\" ? normalizedPath.replace(/\//g, "\\") : normalizedPath;
};

const getRoot = (normalizedPath: string): string => {
  if (normalizedPath.startsWith("/")) {
    return "/";
  }
  const driveMatch = normalizedPath.match(/^[A-Za-z]:\//);
  if (driveMatch) {
    return driveMatch[0];
  }
  return "";
};

const splitSegments = (normalizedPath: string): string[] => normalizedPath.split("/").filter(Boolean);

const joinNormalized = (basePath: string, ...segments: string[]): string => {
  const normalizedBase = toNormalizedPath(basePath);
  const root = getRoot(normalizedBase);
  const nextSegments = [...splitSegments(normalizedBase), ...segments.flatMap((segment) => splitSegments(toNormalizedPath(segment)))];
  const joined = nextSegments.join("/");
  if (!root) {
    return joined;
  }
  if (root === "/") {
    return `/${joined}`;
  }
  return `${root}${joined}`;
};

const dirnameNormalized = (filePath: string): string => {
  const normalizedPath = toNormalizedPath(filePath);
  const root = getRoot(normalizedPath);
  const segments = splitSegments(normalizedPath);
  if (segments.length === 0) {
    return root || ".";
  }
  const parent = segments.slice(0, -1).join("/");
  if (!root) {
    return parent || ".";
  }
  if (root === "/") {
    return parent ? `/${parent}` : "/";
  }
  return parent ? `${root}${parent}` : root;
};

const basenameWithoutCardExtension = (filePath: string): string => {
  return path.posix.basename(toNormalizedPath(filePath), ".card");
};

const randomId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `fallback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const normalizeServerBaseUrl = (value: string): string => {
  try {
    return new URL(value).toString().replace(/\/+$/, "");
  } catch {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "server.baseUrl must be a valid URL.");
  }
};

const buildApiUrl = (baseUrl: string, apiPath: string): string => {
  const normalizedBase = baseUrl.endsWith("/api/v1") ? baseUrl.slice(0, -"/api/v1".length) : baseUrl;
  const normalizedPath = apiPath.startsWith("/api/v1") ? apiPath.slice("/api/v1".length) : apiPath;
  return `${normalizedBase}/api/v1${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
};

const normalizeUploadRequest = (input: CommunityCardTransferUploadRequest): NormalizedCommunityCardTransferUploadRequest => {
  if (!isRecord(input)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "upload input must be an object.");
  }
  if (!asString(input.cardFile)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "cardFile is required.");
  }
  if (!isRecord(input.server) || !asString(input.server.baseUrl) || !asString(input.server.accessToken)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "server.baseUrl and server.accessToken are required.");
  }

  return {
    cardFile: input.cardFile,
    server: {
      baseUrl: normalizeServerBaseUrl(input.server.baseUrl),
      accessToken: input.server.accessToken,
    },
    publish: {
      roomId: input.publish?.roomId ?? null,
      ...(asString(input.publish?.idempotencyKey) ? { idempotencyKey: input.publish?.idempotencyKey } : undefined),
    },
    client: {
      name: input.client?.name ?? DEFAULT_CLIENT_NAME,
      version: input.client?.version ?? DEFAULT_CLIENT_VERSION,
      ...(asString(input.client?.platform) ? { platform: input.client?.platform } : undefined),
    },
    workspace: {
      tempDir: input.workspace?.tempDir,
      keepNetworkCard: input.workspace?.keepNetworkCard ?? false,
      networkCardPath: input.workspace?.networkCardPath,
    },
  };
};

const normalizeDownloadRequest = (input: CommunityCardTransferDownloadRequest): NormalizedCommunityCardTransferDownloadRequest => {
  if (!isRecord(input)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "download input must be an object.");
  }
  if (!asString(input.cardId)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "cardId is required.");
  }
  if (!asString(input.outputPath)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "outputPath is required.");
  }
  if (!isRecord(input.server) || !asString(input.server.baseUrl) || !asString(input.server.accessToken)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "server.baseUrl and server.accessToken are required.");
  }

  return {
    cardId: input.cardId,
    outputPath: input.outputPath,
    versionId: input.versionId,
    server: {
      baseUrl: normalizeServerBaseUrl(input.server.baseUrl),
      accessToken: input.server.accessToken,
    },
    client: {
      name: input.client?.name ?? DEFAULT_CLIENT_NAME,
      version: input.client?.version ?? DEFAULT_CLIENT_VERSION,
      ...(asString(input.client?.platform) ? { platform: input.client?.platform } : undefined),
    },
    workspace: {
      tempDir: input.workspace?.tempDir,
    },
  };
};

const reportProgress = async (
  ctx: CommunityCardPublishContext,
  stage: string,
  percent: number,
  message: string,
): Promise<void> => {
  if (!ctx.job) {
    return;
  }
  await ctx.job.reportProgress({ stage, percent, message });
};

const assertNotCancelled = (ctx: CommunityCardPublishContext): void => {
  if (ctx.job?.isCancelled()) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_CANCELLED", "Community card transfer was cancelled.");
  }
};

const jobSignal = (ctx: CommunityCardPublishContext): AbortSignal | undefined => {
  return ctx.job?.signal ?? undefined;
};

const getFileStat = async (ctx: CommunityCardPublishContext, filePath: string): Promise<HostFileStatLike> => {
  const response = await ctx.host.invoke<{ meta?: unknown }>("file.stat", { path: filePath });
  const meta = response && typeof response === "object" && "meta" in response ? response.meta : response;
  return isRecord(meta) ? {
    size: typeof meta.size === "number" ? meta.size : undefined,
    isFile: typeof meta.isFile === "boolean" ? meta.isFile : undefined,
    isDirectory: typeof meta.isDirectory === "boolean" ? meta.isDirectory : undefined,
  } : {};
};

const readBinaryFile = async (ctx: CommunityCardPublishContext, filePath: string): Promise<Uint8Array> => {
  const response = await ctx.host.invoke<{ content?: unknown }>("file.read", {
    path: filePath,
    options: {
      encoding: "binary",
    },
  });
  const payload = response && typeof response === "object" && "content" in response ? response.content : response;
  return normalizeBinaryPayload(payload);
};

const writeBinaryFile = async (ctx: CommunityCardPublishContext, filePath: string, bytes: Uint8Array): Promise<void> => {
  await ctx.host.invoke("file.write", {
    path: filePath,
    content: Array.from(bytes),
    encoding: "binary",
  });
};

const listFiles = async (ctx: CommunityCardPublishContext, dir: string): Promise<HostFileListEntry[]> => {
  const response = await ctx.host.invoke<{ entries?: unknown }>("file.list", {
    dir,
    options: { recursive: true },
  });
  const entries = response && typeof response === "object" && "entries" in response ? response.entries : response;
  if (!Array.isArray(entries)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_FILE_LIST_FAILED", `Host returned invalid file.list result for ${dir}.`);
  }
  return entries
    .filter(isRecord)
    .map((entry) => ({
      path: String(entry.path ?? ""),
      isFile: entry.isFile === true,
      isDirectory: entry.isDirectory === true,
    }))
    .filter((entry) => entry.path.length > 0);
};

const createWorkspaceRoot = async (ctx: CommunityCardPublishContext, baseFilePath: string, tempDir?: string): Promise<{
  rootDir: string;
  createdByModule: boolean;
}> => {
  if (tempDir) {
    const rootDir = toNormalizedPath(tempDir);
    await ctx.host.invoke("file.mkdir", {
      path: toNativePath(rootDir, baseFilePath),
      options: { recursive: true },
    });
    return { rootDir, createdByModule: false };
  }

  const rootDir = joinNormalized(dirnameNormalized(baseFilePath), `.chips-community-transfer-${randomId()}`);
  await ctx.host.invoke("file.mkdir", {
    path: toNativePath(rootDir, baseFilePath),
    options: { recursive: true },
  });
  return { rootDir, createdByModule: true };
};

const resolveNetworkCardPath = (
  request: NormalizedCommunityCardTransferUploadRequest,
  workspaceRoot: string,
): string => {
  if (request.workspace.networkCardPath) {
    return toNormalizedPath(request.workspace.networkCardPath);
  }

  return joinNormalized(workspaceRoot, `${basenameWithoutCardExtension(request.cardFile)}.network.card`);
};

const detectMimeType = (relativePath: string): string => {
  const ext = path.posix.extname(relativePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".aac": "audio/aac",
    ".pdf": "application/pdf",
    ".card": CARD_MIME_TYPE,
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".yaml": "application/yaml; charset=utf-8",
    ".yml": "application/yaml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".vtt": "text/vtt; charset=utf-8",
    ".srt": "application/x-subrip; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
};

const collectResources = async (ctx: CommunityCardPublishContext, unpackedDir: string): Promise<ResourceCollection> => {
  const entries = await listFiles(ctx, unpackedDir);
  const resources: LocalResource[] = [];
  const normalizedRoot = toNormalizedPath(unpackedDir);

  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }
    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));
    if (!relativePath || isStructuralCardFile(relativePath)) {
      continue;
    }

    const stat = await getFileStat(ctx, toNativePath(absolutePath, unpackedDir));
    const sizeBytes = typeof stat.size === "number" && stat.size > 0 ? stat.size : (await readBinaryFile(ctx, toNativePath(absolutePath, unpackedDir))).byteLength;
    resources.push({
      absolutePath,
      relativePath,
      sizeBytes,
      mimeType: detectMimeType(relativePath),
    });
  }

  resources.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
  return { resources };
};

const authorizedHeaders = (server: { accessToken: string }): HeadersInit => ({
  authorization: `Bearer ${server.accessToken}`,
});

const jsonHeaders = (server: { accessToken: string }): HeadersInit => ({
  ...authorizedHeaders(server),
  "content-type": "application/json",
});

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const isTransientHttpStatus = (status: number): boolean => {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
};

const isAuthExpiredStatus = (status: number): boolean => {
  return status === 401 || status === 403;
};

interface RetryOptions {
  label: string;
  maxAttempts: number;
  signal?: AbortSignal;
}

const fetchWithRetry = async (
  url: string,
  init: RequestInit,
  options: RetryOptions,
): Promise<Response> => {
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) {
      throw createCommunityUploaderError(
        "COMMUNITY_TRANSFER_CANCELLED",
        "Community card transfer was cancelled.",
      );
    }

    try {
      const response = await fetch(url, init);
      if (!isTransientHttpStatus(response.status)) {
        if (isAuthExpiredStatus(response.status)) {
          throw createCommunityUploaderError(
            "COMMUNITY_TRANSFER_AUTH_EXPIRED",
            `${options.label}: access token expired or invalid (HTTP ${response.status}).`,
            { status: response.status },
            false,
          );
        }
        return response;
      }

      lastResponse = response;
      await response.arrayBuffer().catch(() => undefined);
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < options.maxAttempts) {
      const backoffMs = Math.min(100 * 2 ** (attempt - 1), 2_000);
      await sleep(backoffMs);
    }
  }

  if (lastError) {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_NETWORK_FAILED",
      `${options.label}: network request failed after ${options.maxAttempts} attempts.`,
      { label: options.label, attempts: options.maxAttempts, error: lastError instanceof Error ? lastError.message : String(lastError) },
      true,
    );
  }

  throw createCommunityUploaderError(
    "COMMUNITY_TRANSFER_HTTP_ERROR",
    `${options.label}: HTTP ${lastResponse?.status ?? "unknown"} after ${options.maxAttempts} attempts.`,
    { label: options.label, status: lastResponse?.status, attempts: options.maxAttempts },
    true,
  );
};

const fetchControlPlane = async (
  request: { server: { baseUrl: string; accessToken: string } },
  apiPath: string,
  init: RequestInit,
  label: string,
  signal?: AbortSignal,
): Promise<Response> => {
  return fetchWithRetry(buildApiUrl(request.server.baseUrl, apiPath), init, {
    label,
    maxAttempts: 3,
    signal,
  });
};

const parseJsonResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  let payload: unknown = null;
  const text = await response.text();
  if (text.trim().length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", `${fallbackMessage}: invalid JSON response.`, {
        status: response.status,
        body: text.slice(0, 500),
      });
    }
  }

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
    throw createCommunityUploaderError(
      asString(error.code) ?? "COMMUNITY_TRANSFER_HTTP_ERROR",
      asString(error.message) ?? `${fallbackMessage}: HTTP ${response.status}`,
      {
        status: response.status,
        response: payload,
      },
      response.status >= 500,
    );
  }

  return payload as T;
};

const createUploadSession = async (
  request: NormalizedCommunityCardTransferUploadRequest,
  fileName: string,
  signal?: AbortSignal,
): Promise<{ uploadId: string; cardId: string; versionId: string; resourcePrefix: string }> => {
  const response = await fetchControlPlane(
    request,
    "/card-transfer/upload-sessions",
    {
      method: "POST",
      headers: jsonHeaders(request.server),
      body: JSON.stringify({
        fileName,
        roomId: request.publish.roomId ?? null,
        idempotencyKey: request.publish.idempotencyKey,
        client: request.client,
      }),
    },
    "create upload session",
    signal,
  );
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to create upload session");
  if (!isRecord(payload.data)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Upload session response is missing identifiers.");
  }
  const uploadId = asString(payload.data.uploadId);
  const cardId = asString(payload.data.cardId);
  const versionId = asString(payload.data.versionId);
  if (!uploadId || !cardId || !versionId) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Upload session response is missing identifiers.");
  }
  return {
    uploadId,
    cardId,
    versionId,
    resourcePrefix: String(payload.data.resourcePrefix ?? ""),
  };
};

const presignObjects = async (
  request: NormalizedCommunityCardTransferUploadRequest,
  uploadId: string,
  objects: Array<{
    role: "network-card" | "resource";
    relativePath?: string;
    sizeBytes: number;
    mimeType: string;
  }>,
  signal?: AbortSignal,
): Promise<PresignedObject[]> => {
  if (objects.length === 0) {
    return [];
  }

  const response = await fetchControlPlane(
    request,
    `/card-transfer/upload-sessions/${uploadId}/objects:presign`,
    {
      method: "POST",
      headers: jsonHeaders(request.server),
      body: JSON.stringify({ objects }),
    },
    "presign transfer objects",
    signal,
  );
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to presign transfer objects");
  if (!isRecord(payload.data) || !Array.isArray(payload.data.objects)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Presign response is missing objects.");
  }

  return payload.data.objects.filter(isRecord).map((object) => ({
    role: object.role === "network-card" ? "network-card" : "resource",
    relativePath: object.relativePath === null || typeof object.relativePath === "undefined" ? null : String(object.relativePath),
    bucket: String(object.bucket ?? ""),
    objectKey: String(object.objectKey ?? ""),
    publicUrl: String(object.publicUrl ?? ""),
    uploadUrl: String(object.uploadUrl ?? ""),
    method: object.method === "PUT" ? "PUT" : "PUT",
    headers: isRecord(object.headers)
      ? Object.fromEntries(Object.entries(object.headers).map(([key, value]) => [key, String(value)]))
      : {},
  }));
};

const uploadBytesToStorage = async (
  label: string,
  bytes: Uint8Array,
  presigned: PresignedObject,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await fetchWithRetry(
    presigned.uploadUrl,
    {
      method: presigned.method,
      headers: presigned.headers,
      body: toArrayBuffer(bytes),
    },
    {
      label: `upload ${label}`,
      maxAttempts: 3,
      signal,
    },
  );

  if (!response.ok) {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_OBJECT_UPLOAD_FAILED",
      `Failed to upload ${label}: HTTP ${response.status}`,
      { label, status: response.status },
      response.status >= 500,
    );
  }
};

const downloadBinary = async (
  resource: { downloadUrl: string; headers?: Record<string, string> },
  label: string,
  signal?: AbortSignal,
): Promise<Uint8Array> => {
  const response = await fetchWithRetry(
    resource.downloadUrl,
    {
      method: "GET",
      headers: resource.headers ?? {},
    },
    {
      label: `download ${label}`,
      maxAttempts: 3,
      signal,
    },
  );
  if (!response.ok) {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_OBJECT_DOWNLOAD_FAILED",
      `Failed to download ${label}: HTTP ${response.status}`,
      { label, status: response.status },
      response.status >= 500,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
};

const getZipEntries = async (ctx: CommunityCardPublishContext, cardFile: string): Promise<HostZipEntryMeta[]> => {
  const response = await ctx.host.invoke<{ entries?: unknown }>("zip.list", {
    zipPath: cardFile,
  });
  const entries = response && typeof response === "object" && "entries" in response ? response.entries : response;
  return Array.isArray(entries) ? entries.filter(isRecord).map((entry) => ({
    path: String(entry.path ?? ""),
    size: Number(entry.size ?? 0),
    compressedSize: Number(entry.compressedSize ?? 0),
    crc32: Number(entry.crc32 ?? 0),
    offset: Number(entry.offset ?? 0),
    isDirectory: entry.isDirectory === true,
    compressionMethod: Number(entry.compressionMethod ?? 0),
    modifiedTime: typeof entry.modifiedTime === "number" ? entry.modifiedTime : undefined,
  })) : [];
};

const assertZipStoreEntries = (entries: HostZipEntryMeta[]): void => {
  const compressed = entries.filter((entry) => !entry.isDirectory && entry.compressionMethod !== 0);
  if (compressed.length > 0) {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_CARD_NOT_STORE_ZIP",
      ".card ZIP entries must use Store mode before publishing.",
      { entries: compressed.slice(0, 20).map((entry) => entry.path) },
    );
  }
};

const writeRewrittenCard = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
  resources: LocalResource[],
  resourceUrlMap: Map<string, string>,
  textResourceMap: Map<string, string>,
): Promise<void> => {
  const entries = await listFiles(ctx, unpackedDir);
  const normalizedRoot = toNormalizedPath(unpackedDir);

  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }

    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));

    if (relativePath.startsWith("content/") && relativePath.endsWith(".yaml")) {
      const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
      await ctx.host.invoke("file.write", {
        path: toNativePath(absolutePath, unpackedDir),
        content: replaceYamlResourceUrls(raw, resourceUrlMap, relativePath, textResourceMap),
      });
    }

    if (relativePath === ".card/cover.html") {
      const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
      await ctx.host.invoke("file.write", {
        path: toNativePath(absolutePath, unpackedDir),
        content: replaceCoverHtmlUrls(raw, resourceUrlMap),
      });
    }
  }

  for (const resource of resources) {
    await ctx.host.invoke("file.delete", {
      path: toNativePath(resource.absolutePath, unpackedDir),
    });
  }
};

const collectTextResourceMap = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
): Promise<Map<string, string>> => {
  const textResourceMap = new Map<string, string>();
  const entries = await listFiles(ctx, unpackedDir);
  const normalizedRoot = toNormalizedPath(unpackedDir);

  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }
    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));
    if (!relativePath.startsWith("content/") || !relativePath.endsWith(".yaml")) {
      continue;
    }

    const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
    for (const candidatePath of collectFileBackedRichTextResourcePaths(raw, relativePath)) {
      const candidateAbsolutePath = joinNormalized(unpackedDir, candidatePath);
      const text = await readTextFile(ctx, toNativePath(candidateAbsolutePath, unpackedDir))
        .catch(() => null);
      if (text !== null) {
        textResourceMap.set(candidatePath, text);
      }
    }
  }

  return textResourceMap;
};

const collectRichTextContentFileMap = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
): Promise<Map<string, string>> => {
  const richTextContentFileMap = new Map<string, string>();
  const entries = await listFiles(ctx, unpackedDir);
  const normalizedRoot = toNormalizedPath(unpackedDir);

  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }
    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));
    if (!relativePath.startsWith("content/") || !relativePath.endsWith(".yaml")) {
      continue;
    }

    const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
    const candidatePaths = collectFileBackedRichTextResourcePaths(raw, relativePath);
    if (candidatePaths.length > 0) {
      richTextContentFileMap.set(relativePath, candidatePaths[0]!);
    }
  }

  return richTextContentFileMap;
};

const extractRichTextContentFileMap = (restoreManifest: unknown): Map<string, string> => {
  const map = new Map<string, string>();
  if (!isRecord(restoreManifest) || !Array.isArray(restoreManifest.richTextContentFiles)) {
    return map;
  }

  for (const item of restoreManifest.richTextContentFiles) {
    if (!isRecord(item)) {
      continue;
    }
    const configPath = asString(item.configPath);
    const contentFile = asString(item.contentFile);
    if (configPath && contentFile) {
      map.set(configPath, contentFile);
    }
  }

  return map;
};

const restoreDownloadedCard = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
  resources: DownloadPlanResource[],
  restoreManifest: unknown,
): Promise<void> => {
  const pathMap = new Map<string, string>();
  for (const resource of resources) {
    pathMap.set(resource.networkUrl, resource.originalRelativePath);
    if (resource.publicUrl) {
      pathMap.set(resource.publicUrl, resource.originalRelativePath);
    }
  }
  const richTextContentFileMap = extractRichTextContentFileMap(restoreManifest);

  const entries = await listFiles(ctx, unpackedDir);
  const normalizedRoot = toNormalizedPath(unpackedDir);
  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }
    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));
    if (relativePath.startsWith("content/") && relativePath.endsWith(".yaml")) {
      const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
      await ctx.host.invoke("file.write", {
        path: toNativePath(absolutePath, unpackedDir),
        content: restoreYamlResourcePaths(raw, pathMap, relativePath, richTextContentFileMap),
      });
    }
    if (relativePath === ".card/cover.html") {
      const raw = await readTextFile(ctx, toNativePath(absolutePath, unpackedDir));
      await ctx.host.invoke("file.write", {
        path: toNativePath(absolutePath, unpackedDir),
        content: restoreCoverHtmlPaths(raw, pathMap),
      });
    }
  }

  for (const resource of resources) {
    const targetPath = joinNormalized(unpackedDir, resource.originalRelativePath);
    const parentDir = dirnameNormalized(targetPath);
    await ctx.host.invoke("file.mkdir", {
      path: toNativePath(parentDir, unpackedDir),
      options: { recursive: true },
    });
    const bytes = await downloadBinary(resource, resource.originalRelativePath, jobSignal(ctx));
    await writeBinaryFile(ctx, toNativePath(targetPath, unpackedDir), bytes);
  }
};

const createRestoreManifest = (params: {
  originalFileName: string;
  cardId: string;
  versionId: string;
  zipEntries: HostZipEntryMeta[];
  resources: CommunityCardTransferUploadedResource[];
  richTextContentFileMap?: Map<string, string>;
}): Record<string, unknown> => {
  return {
    schemaVersion: "1.0.0",
    originalFileName: params.originalFileName,
    cardId: params.cardId,
    versionId: params.versionId,
    resources: params.resources.map((resource) => ({
      originalRelativePath: resource.originalRelativePath,
      networkUrl: resource.networkUrl,
      bucket: resource.bucket,
      objectKey: resource.objectKey,
      sizeBytes: resource.sizeBytes,
      mimeType: resource.mimeType,
    })),
    zipEntries: params.zipEntries.map((entry, index) => ({
      order: index,
      path: entry.path,
      size: entry.size,
      compressedSize: entry.compressedSize,
      crc32: entry.crc32,
      isDirectory: entry.isDirectory,
      compressionMethod: entry.compressionMethod,
      modifiedTime: entry.modifiedTime,
    })),
    richTextContentFiles: params.richTextContentFileMap
      ? Array.from(params.richTextContentFileMap.entries()).map(([configPath, contentFile]) => ({
          configPath,
          contentFile,
        }))
      : [],
  };
};

const extractEntryPlan = (restoreManifest: unknown): Array<{ path: string; modifiedTime?: number }> => {
  if (!isRecord(restoreManifest) || !Array.isArray(restoreManifest.zipEntries)) {
    return [];
  }

  const entries = restoreManifest.zipEntries
    .filter(isRecord)
    .sort((left, right) => Number(left.order ?? 0) - Number(right.order ?? 0))
    .map((entry) => ({
      path: normalizeCardPath(String(entry.path ?? "")),
      ...(typeof entry.modifiedTime === "number" ? { modifiedTime: entry.modifiedTime } : undefined),
    }))
    .filter((entry) => entry.path.length > 0);

  return entries;
};

const completeUpload = async (
  request: NormalizedCommunityCardTransferUploadRequest,
  uploadId: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<CommunityCardTransferUploadResult> => {
  const response = await fetchControlPlane(
    request,
    `/card-transfer/upload-sessions/${uploadId}/complete`,
    {
      method: "POST",
      headers: jsonHeaders(request.server),
      body: JSON.stringify(body),
    },
    "complete card transfer upload",
    signal,
  );
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to complete card transfer upload");

  if (!isRecord(payload.data)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Complete response is missing cardId.");
  }
  const cardId = asString(payload.data.cardId);
  if (!cardId) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Complete response is missing cardId.");
  }

  return {
    cardId,
    versionId: String(payload.data.versionId ?? ""),
    status: String(payload.data.status ?? "ready"),
    renderStatus: String(payload.data.renderStatus ?? "queued"),
    renderStatusUrl: String(payload.data.renderStatusUrl ?? `/api/v1/cards/${cardId}/render-status`),
    communityUrl: String(payload.data.communityUrl ?? `${request.server.baseUrl}/cards/${cardId}`),
    uploadedResources: [],
  };
};

const pushWarning = (
  warnings: CommunityUploaderWarning[],
  code: string,
  message: string,
  details?: unknown,
): void => {
  warnings.push({ code, message, ...(details === undefined ? undefined : { details }) });
};

export const uploadCommunityCard = async (
  ctx: CommunityCardPublishContext,
  input: CommunityCardTransferUploadRequest,
): Promise<CommunityCardTransferUploadResult> => {
  const request = normalizeUploadRequest(input);
  const warnings: CommunityUploaderWarning[] = [];
  const cardStat = await getFileStat(ctx, request.cardFile);
  if (cardStat.isFile !== true) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", `cardFile is not a readable file: ${request.cardFile}`);
  }

  await reportProgress(ctx, "inspect", 2, "Reading card metadata");
  const [cardInfo, zipEntries] = await Promise.all([
    ctx.host.invoke<{ info?: HostCardReadInfo }>("card.readInfo", {
      cardFile: request.cardFile,
    }),
    getZipEntries(ctx, request.cardFile),
  ]);
  assertZipStoreEntries(zipEntries);
  const cardName = asString(cardInfo.info?.metadata?.name) ?? asString(cardInfo.info?.metadata?.title) ?? path.basename(request.cardFile);

  const workspace = await createWorkspaceRoot(ctx, request.cardFile, request.workspace.tempDir);
  const unpackedDir = joinNormalized(workspace.rootDir, "unpacked.card");
  const networkCardPath = resolveNetworkCardPath(request, workspace.rootDir);

  try {
    assertNotCancelled(ctx);
    await reportProgress(ctx, "unpack", 8, "Unpacking card");
    await ctx.host.invoke("card.unpack", {
      cardFile: request.cardFile,
      outputDir: toNativePath(unpackedDir, request.cardFile),
    });

    assertNotCancelled(ctx);
    await reportProgress(ctx, "scan", 18, "Scanning card resources");
    const { resources } = await collectResources(ctx, unpackedDir);

    assertNotCancelled(ctx);
    await reportProgress(ctx, "session", 26, "Creating community transfer session");
    const uploadSession = await createUploadSession(request, path.basename(request.cardFile), jobSignal(ctx));

    assertNotCancelled(ctx);
    await reportProgress(ctx, "upload-resources", 38, "Uploading resources");
    const resourcePresigned = await presignObjects(
      request,
      uploadSession.uploadId,
      resources.map((resource) => ({
        role: "resource",
        relativePath: resource.relativePath,
        sizeBytes: resource.sizeBytes,
        mimeType: resource.mimeType,
      })),
      jobSignal(ctx),
    );
    const presignedByPath = new Map(resourcePresigned.map((item) => [normalizeCardPath(item.relativePath ?? ""), item]));

    const resourceUrlMap = new Map<string, string>();
    const uploadedResources: CommunityCardTransferUploadedResource[] = [];
    for (const resource of resources) {
      const target = presignedByPath.get(resource.relativePath);
      if (!target) {
        throw createCommunityUploaderError(
          "COMMUNITY_TRANSFER_RESPONSE_INVALID",
          `Presign response did not include ${resource.relativePath}.`,
        );
      }
      const resourceBytes = await readBinaryFile(ctx, toNativePath(resource.absolutePath, unpackedDir));
      await uploadBytesToStorage(resource.relativePath, resourceBytes, target, jobSignal(ctx));
      resourceUrlMap.set(resource.relativePath, target.publicUrl);
      uploadedResources.push({
        originalRelativePath: resource.relativePath,
        networkUrl: target.publicUrl,
        publicUrl: target.publicUrl,
        bucket: target.bucket,
        objectKey: target.objectKey,
        sizeBytes: resource.sizeBytes,
        mimeType: resource.mimeType,
      });
    }

    assertNotCancelled(ctx);
    await reportProgress(ctx, "rewrite", 58, "Generating network resource card");
    const textResourceMap = await collectTextResourceMap(ctx, unpackedDir);
    const richTextContentFileMap = await collectRichTextContentFileMap(ctx, unpackedDir);
    await writeRewrittenCard(ctx, unpackedDir, resources, resourceUrlMap, textResourceMap);

    assertNotCancelled(ctx);
    await reportProgress(ctx, "pack", 72, "Packing network resource card");
    await ctx.host.invoke("card.pack", {
      cardDir: toNativePath(unpackedDir, request.cardFile),
      outputPath: toNativePath(networkCardPath, request.cardFile),
    });
    const networkCardBytes = await readBinaryFile(ctx, toNativePath(networkCardPath, request.cardFile));
    const [networkCardPresigned] = await presignObjects(request, uploadSession.uploadId, [
      {
        role: "network-card",
        sizeBytes: networkCardBytes.byteLength,
        mimeType: CARD_MIME_TYPE,
      },
    ], jobSignal(ctx));
    if (!networkCardPresigned || networkCardPresigned.role !== "network-card") {
      throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Presign response is missing network card object.");
    }
    await uploadBytesToStorage("network-card", networkCardBytes, networkCardPresigned, jobSignal(ctx));

    assertNotCancelled(ctx);
    await reportProgress(ctx, "submit", 86, "Submitting transfer manifest");
    const restoreManifest = createRestoreManifest({
      originalFileName: path.basename(request.cardFile),
      cardId: uploadSession.cardId,
      versionId: uploadSession.versionId,
      zipEntries,
      resources: uploadedResources,
      richTextContentFileMap,
    });
    const submitResult = await completeUpload(request, uploadSession.uploadId, {
      title: cardName,
      cardFileId: asString(cardInfo.info?.metadata?.card_id) ?? asString(cardInfo.info?.metadata?.id) ?? null,
      coverRatio: asString(cardInfo.info?.metadata?.cover_ratio) ?? null,
      networkCard: {
        bucket: networkCardPresigned.bucket,
        objectKey: networkCardPresigned.objectKey,
        publicUrl: networkCardPresigned.publicUrl,
        sizeBytes: networkCardBytes.byteLength,
        mimeType: CARD_MIME_TYPE,
      },
      resources: uploadedResources,
      restoreManifest,
      cardMetadata: cardInfo.info?.metadata ?? null,
    }, jobSignal(ctx));

    await reportProgress(ctx, "completed", 100, "Community card transfer upload completed");
    ctx.logger.info("Community card transfer upload completed.", {
      cardId: submitResult.cardId,
      resourceCount: uploadedResources.length,
    });

    return {
      ...submitResult,
      uploadedResources,
      ...(request.workspace.keepNetworkCard || request.workspace.networkCardPath
        ? { networkCardPath: toNativePath(networkCardPath, request.cardFile) }
        : undefined),
      ...(warnings.length > 0 ? { warnings } : undefined),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_UPLOAD_FAILED",
      error instanceof Error ? error.message : String(error),
      { cardFile: request.cardFile },
      true,
    );
  } finally {
    if (!request.workspace.keepNetworkCard && !request.workspace.networkCardPath) {
      await ctx.host.invoke("file.delete", {
        path: toNativePath(networkCardPath, request.cardFile),
      }).catch(() => undefined);
    } else if (request.workspace.keepNetworkCard && !request.workspace.networkCardPath) {
      pushWarning(warnings, "COMMUNITY_TRANSFER_NETWORK_CARD_KEPT", "Network resource card file was kept in the temporary workspace.", {
        networkCardPath,
      });
    }

    await ctx.host.invoke("file.delete", {
      path: toNativePath(unpackedDir, request.cardFile),
      options: { recursive: true },
    }).catch(() => undefined);

    if (workspace.createdByModule && !request.workspace.keepNetworkCard && !request.workspace.networkCardPath) {
      await ctx.host.invoke("file.delete", {
        path: toNativePath(workspace.rootDir, request.cardFile),
        options: { recursive: true },
      }).catch(() => undefined);
    }
  }
};

const createDownloadSession = async (
  request: NormalizedCommunityCardTransferDownloadRequest,
  signal?: AbortSignal,
): Promise<{ planUrl: string; cardId: string; versionId?: string | null }> => {
  const response = await fetchControlPlane(
    request,
    "/card-transfer/download-sessions",
    {
      method: "POST",
      headers: jsonHeaders(request.server),
      body: JSON.stringify({
        cardId: request.cardId,
        versionId: request.versionId,
        client: request.client,
      }),
    },
    "create download session",
    signal,
  );
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to create download session");
  if (!isRecord(payload.data)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Download session response is missing planUrl.");
  }
  const planUrl = asString(payload.data.planUrl);
  if (!planUrl) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Download session response is missing planUrl.");
  }
  return {
    planUrl,
    cardId: String(payload.data.cardId ?? request.cardId),
    versionId: typeof payload.data.versionId === "string" ? payload.data.versionId : null,
  };
};

const getDownloadPlan = async (
  request: NormalizedCommunityCardTransferDownloadRequest,
  planUrl: string,
  signal?: AbortSignal,
): Promise<DownloadPlan> => {
  const response = await fetchControlPlane(
    request,
    planUrl,
    {
      method: "GET",
      headers: authorizedHeaders(request.server),
    },
    "get download plan",
    signal,
  );
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to get download plan");
  if (!isRecord(payload.data) || !isRecord(payload.data.networkCard) || !Array.isArray(payload.data.resources)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_RESPONSE_INVALID", "Download plan is missing networkCard or resources.");
  }
  return {
    cardId: String(payload.data.cardId ?? request.cardId),
    versionId: typeof payload.data.versionId === "string" ? payload.data.versionId : null,
    suggestedFileName: typeof payload.data.suggestedFileName === "string" ? payload.data.suggestedFileName : undefined,
    networkCard: {
      bucket: String(payload.data.networkCard.bucket ?? ""),
      objectKey: String(payload.data.networkCard.objectKey ?? ""),
      publicUrl: typeof payload.data.networkCard.publicUrl === "string" ? payload.data.networkCard.publicUrl : null,
      downloadUrl: String(payload.data.networkCard.downloadUrl ?? ""),
      headers: isRecord(payload.data.networkCard.headers)
        ? Object.fromEntries(Object.entries(payload.data.networkCard.headers).map(([key, value]) => [key, String(value)]))
        : {},
      sizeBytes: Number(payload.data.networkCard.sizeBytes ?? 0),
      mimeType: typeof payload.data.networkCard.mimeType === "string" ? payload.data.networkCard.mimeType : null,
    },
    resources: payload.data.resources.filter(isRecord).map((resource) => ({
      originalRelativePath: normalizeCardPath(String(resource.originalRelativePath ?? "")),
      networkUrl: String(resource.networkUrl ?? resource.publicUrl ?? ""),
      bucket: String(resource.bucket ?? ""),
      objectKey: String(resource.objectKey ?? ""),
      publicUrl: typeof resource.publicUrl === "string" ? resource.publicUrl : null,
      downloadUrl: String(resource.downloadUrl ?? resource.publicUrl ?? resource.networkUrl ?? ""),
      headers: isRecord(resource.headers)
        ? Object.fromEntries(Object.entries(resource.headers).map(([key, value]) => [key, String(value)]))
        : {},
      sizeBytes: Number(resource.sizeBytes ?? 0),
      mimeType: typeof resource.mimeType === "string" ? resource.mimeType : null,
    })),
    restoreManifest: payload.data.restoreManifest,
    manifest: payload.data.manifest,
  };
};

const verifyRestoredCard = async (
  ctx: CommunityCardPublishContext,
  restoredCardPath: string,
): Promise<void> => {
  const info = await ctx.host.invoke<{ info?: unknown }>("card.readInfo", {
    cardFile: restoredCardPath,
  });
  if (!info || !isRecord(info.info)) {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_DOWNLOAD_VERIFY_FAILED",
      `Restored card failed readInfo verification: ${restoredCardPath}`,
      { restoredCardPath },
    );
  }

  await ctx.host.invoke("card.render", {
    cardFile: restoredCardPath,
  }).catch((error) => {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_DOWNLOAD_VERIFY_FAILED",
      `Restored card failed render verification: ${restoredCardPath}`,
      {
        restoredCardPath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  });

  await ctx.host.invoke("card.open", {
    cardFile: restoredCardPath,
  }).catch((error) => {
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_DOWNLOAD_VERIFY_FAILED",
      `Restored card failed open verification: ${restoredCardPath}`,
      {
        restoredCardPath,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  });
};

const completeDownload = async (
  ctx: CommunityCardPublishContext,
  plan: DownloadPlan,
  unpackedDir: string,
  outputPath: string,
  request: NormalizedCommunityCardTransferDownloadRequest,
): Promise<CommunityCardTransferDownloadResult> => {
  assertNotCancelled(ctx);
  await reportProgress(ctx, "pack", 85, "Packing restored card");
  const entryPlan = extractEntryPlan(plan.restoreManifest ?? plan.manifest);
  await ctx.host.invoke("card.pack", {
    cardDir: toNativePath(unpackedDir, outputPath),
    outputPath: toNativePath(outputPath, outputPath),
    ...(entryPlan.length > 0 ? { entryPlan } : undefined),
  });

  assertNotCancelled(ctx);
  await reportProgress(ctx, "verify", 95, "Verifying restored card");
  await verifyRestoredCard(ctx, toNativePath(outputPath, outputPath));

  await reportProgress(ctx, "completed", 100, "Community card transfer download completed");
  ctx.logger.info("Community card transfer download completed.", {
    cardId: plan.cardId,
    resourceCount: plan.resources.length,
  });

  return {
    cardId: plan.cardId,
    versionId: plan.versionId,
    outputPath: toNativePath(outputPath, outputPath),
    restoredResourceCount: plan.resources.length,
    suggestedFileName: plan.suggestedFileName,
  };
};

export const downloadCommunityCard = async (
  ctx: CommunityCardPublishContext,
  input: CommunityCardTransferDownloadRequest,
): Promise<CommunityCardTransferDownloadResult> => {
  const request = normalizeDownloadRequest(input);
  const outputPath = toNormalizedPath(request.outputPath);
  const workspace = await createWorkspaceRoot(ctx, outputPath, request.workspace.tempDir);
  const networkCardPath = joinNormalized(workspace.rootDir, "network.card");
  const unpackedDir = joinNormalized(workspace.rootDir, "restored.card");

  try {
    assertNotCancelled(ctx);
    await reportProgress(ctx, "session", 10, "Creating download session");
    const session = await createDownloadSession(request, jobSignal(ctx));
    const plan = await getDownloadPlan(request, session.planUrl, jobSignal(ctx));

    assertNotCancelled(ctx);
    await reportProgress(ctx, "download-card", 25, "Downloading network resource card");
    const networkCardBytes = await downloadBinary(plan.networkCard, "network-card", jobSignal(ctx));
    await writeBinaryFile(ctx, toNativePath(networkCardPath, outputPath), networkCardBytes);

    assertNotCancelled(ctx);
    await reportProgress(ctx, "unpack", 35, "Unpacking network resource card");
    await ctx.host.invoke("card.unpack", {
      cardFile: toNativePath(networkCardPath, outputPath),
      outputDir: toNativePath(unpackedDir, outputPath),
    });

    assertNotCancelled(ctx);
    await reportProgress(ctx, "restore", 55, "Restoring original card resources");
    await restoreDownloadedCard(ctx, unpackedDir, plan.resources, plan.restoreManifest ?? plan.manifest);

    return await completeDownload(ctx, plan, unpackedDir, outputPath, request);
  } catch (error) {
    await ctx.host.invoke("file.delete", {
      path: toNativePath(outputPath, outputPath),
    }).catch(() => undefined);
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_DOWNLOAD_FAILED",
      error instanceof Error ? error.message : String(error),
      { cardId: request.cardId },
      true,
    );
  } finally {
    await ctx.host.invoke("file.delete", {
      path: toNativePath(networkCardPath, outputPath),
    }).catch(() => undefined);
    await ctx.host.invoke("file.delete", {
      path: toNativePath(unpackedDir, outputPath),
      options: { recursive: true },
    }).catch(() => undefined);
    if (workspace.createdByModule) {
      await ctx.host.invoke("file.delete", {
        path: toNativePath(workspace.rootDir, outputPath),
        options: { recursive: true },
      }).catch(() => undefined);
    }
  }
};

export const openRemoteCommunityCard = async (
  ctx: CommunityCardPublishContext,
  input: CommunityCardTransferOpenRemoteRequest,
): Promise<CommunityCardTransferOpenRemoteResult> => {
  const cardId = asString(input.cardId);
  if (!cardId) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "openRemote requires cardId.");
  }
  if (!isRecord(input.server) || !asString(input.server.baseUrl) || !asString(input.server.accessToken)) {
    throw createCommunityUploaderError("COMMUNITY_TRANSFER_INPUT_INVALID", "openRemote requires server.baseUrl and server.accessToken.");
  }

  const server = {
    baseUrl: normalizeServerBaseUrl(input.server.baseUrl),
    accessToken: input.server.accessToken,
  };

  try {
    const request: NormalizedCommunityCardTransferDownloadRequest = {
      cardId,
      server,
      outputPath: "",
      client: {
        name: DEFAULT_CLIENT_NAME,
        version: DEFAULT_CLIENT_VERSION,
      },
      workspace: {
        tempDir: input.workspace?.tempDir,
      },
    };

    assertNotCancelled(ctx);
    await reportProgress(ctx, "session", 10, "Creating download session");
    const session = await createDownloadSession(request, jobSignal(ctx));
    const plan = await getDownloadPlan(request, session.planUrl, jobSignal(ctx));

    assertNotCancelled(ctx);
    await reportProgress(ctx, "download-card", 40, "Downloading network resource card");
    const networkCardBytes = await downloadBinary(plan.networkCard, "network-card", jobSignal(ctx));

    const workspace = await createWorkspaceRoot(
      ctx,
      path.join(os.tmpdir(), `community-open-remote-${randomId()}`),
      request.workspace.tempDir,
    );
    const localCardPath = joinNormalized(workspace.rootDir, `${plan.suggestedFileName ?? `${cardId}.card`}`);
    await writeBinaryFile(ctx, toNativePath(localCardPath, os.tmpdir()), networkCardBytes);

    assertNotCancelled(ctx);
    await reportProgress(ctx, "open", 80, "Opening card in local viewer");

    const surface = await ctx.host.invoke<{ surface: { id: string } }>("surface.open", {
      request: {
        kind: "window",
        target: {
          type: "plugin",
          pluginId: "com.chips.card-viewer",
          launchParams: {
            trigger: "community-open-remote",
            cardSource: {
              kind: "local-file",
              documentKind: "card",
              filePath: toNativePath(localCardPath, os.tmpdir()),
            },
            communityServer: {
              baseUrl: server.baseUrl,
              accessToken: server.accessToken,
            },
          },
        },
        presentation: {
          title: plan.suggestedFileName ?? "社区卡片",
          width: 1024,
          height: 720,
          resizable: true,
        },
      },
    });

    await reportProgress(ctx, "completed", 100, "Remote card opened in local viewer");
    return {
      opened: true,
      url: `${server.baseUrl}/cards/${cardId}`,
      localCardPath: toNativePath(localCardPath, os.tmpdir()),
      surfaceId: isRecord(surface.surface) ? String(surface.surface.id ?? "") : undefined,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw createCommunityUploaderError(
      "COMMUNITY_TRANSFER_OPEN_REMOTE_FAILED",
      "Failed to open remote community card locally.",
      {
        cardId,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetail: isRecord(error)
          ? {
              code: String((error as { code?: unknown }).code ?? ""),
              message: String((error as { message?: unknown }).message ?? ""),
              details: (error as { details?: unknown }).details,
            }
          : undefined,
      },
    );
  }
};
