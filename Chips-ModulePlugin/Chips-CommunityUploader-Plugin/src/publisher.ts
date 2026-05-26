import crypto from "node:crypto";
import path from "node:path";
import { createCommunityUploaderError, type CommunityUploaderWarning } from "./errors";
import { normalizeBinaryPayload, toArrayBuffer } from "./binary";
import {
  collectFileBackedRichTextResourcePaths,
  isStructuralCardFile,
  normalizeCardPath,
  readTextFile,
  replaceCoverHtmlUrls,
  replaceYamlResourceUrls,
} from "./card-rewrite";
import type {
  CommunityCardPublishContext,
  CommunityCardPublishRequest,
  CommunityCardPublishResult,
  HostCardReadInfo,
  HostFileListEntry,
  HostFileStatLike,
  NormalizedCommunityCardPublishRequest,
} from "./types";

interface LocalResource {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  mimeType: string;
  bytes: Uint8Array;
}

interface ResourceCollection {
  resources: LocalResource[];
  textResourceMap: Map<string, string>;
  textResources: Array<{
    absolutePath: string;
    relativePath: string;
  }>;
}

interface PresignedResource {
  relativePath: string;
  publicUrl: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
}

const DEFAULT_CLIENT_NAME = "Chips Community Uploader Plugin";
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
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", "server.baseUrl must be a valid URL.");
  }
};

const buildApiUrl = (baseUrl: string, apiPath: string): string => {
  const normalizedBase = baseUrl.endsWith("/api/v1") ? baseUrl.slice(0, -"/api/v1".length) : baseUrl;
  return `${normalizedBase}/api/v1${apiPath}`;
};

const normalizeRequest = (input: CommunityCardPublishRequest): NormalizedCommunityCardPublishRequest => {
  if (!isRecord(input)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", "publish input must be an object.");
  }
  if (!asString(input.cardFile)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", "cardFile is required.");
  }
  if (!isRecord(input.server) || !asString(input.server.baseUrl) || !asString(input.server.accessToken)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", "server.baseUrl and server.accessToken are required.");
  }

  const visibility = input.publish?.visibility ?? "public";
  if (visibility !== "public" && visibility !== "private") {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", "publish.visibility must be public or private.");
  }

  return {
    cardFile: input.cardFile,
    server: {
      baseUrl: normalizeServerBaseUrl(input.server.baseUrl),
      accessToken: input.server.accessToken,
    },
    publish: {
      roomId: input.publish?.roomId ?? null,
      visibility,
      ...(asString(input.publish?.idempotencyKey) ? { idempotencyKey: input.publish?.idempotencyKey } : undefined),
    },
    client: {
      name: input.client?.name ?? DEFAULT_CLIENT_NAME,
      version: input.client?.version ?? DEFAULT_CLIENT_VERSION,
      ...(asString(input.client?.platform) ? { platform: input.client?.platform } : undefined),
    },
    workspace: {
      tempDir: input.workspace?.tempDir,
      keepProcessedCard: input.workspace?.keepProcessedCard ?? false,
      processedCardPath: input.workspace?.processedCardPath,
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
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_CANCELLED", "Community card publishing was cancelled.");
  }
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

const listFiles = async (ctx: CommunityCardPublishContext, dir: string): Promise<HostFileListEntry[]> => {
  const response = await ctx.host.invoke<{ entries?: unknown }>("file.list", {
    dir,
    options: { recursive: true },
  });
  const entries = response && typeof response === "object" && "entries" in response ? response.entries : response;
  if (!Array.isArray(entries)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_FILE_LIST_FAILED", `Host returned invalid file.list result for ${dir}.`);
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

const createWorkspaceRoot = async (ctx: CommunityCardPublishContext, request: NormalizedCommunityCardPublishRequest): Promise<{
  rootDir: string;
  createdByModule: boolean;
}> => {
  if (request.workspace.tempDir) {
    const rootDir = toNormalizedPath(request.workspace.tempDir);
    await ctx.host.invoke("file.mkdir", {
      path: toNativePath(rootDir, request.cardFile),
      options: { recursive: true },
    });
    return { rootDir, createdByModule: false };
  }

  const rootDir = joinNormalized(dirnameNormalized(request.cardFile), `.chips-community-upload-${randomId()}`);
  await ctx.host.invoke("file.mkdir", {
    path: toNativePath(rootDir, request.cardFile),
    options: { recursive: true },
  });
  return { rootDir, createdByModule: true };
};

const resolveProcessedCardPath = (
  request: NormalizedCommunityCardPublishRequest,
  workspaceRoot: string,
): string => {
  if (request.workspace.processedCardPath) {
    return toNormalizedPath(request.workspace.processedCardPath);
  }

  return joinNormalized(workspaceRoot, `${path.posix.basename(toNormalizedPath(request.cardFile), ".card")}.processed.card`);
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
    ".vtt": "text/vtt; charset=utf-8",
    ".srt": "application/x-subrip; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
};

const sha256Bytes = (bytes: Uint8Array): string => {
  return crypto.createHash("sha256").update(bytes).digest("hex");
};

const collectRichTextTextResources = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
  entries: HostFileListEntry[],
): Promise<{
  textResourceMap: Map<string, string>;
  textResources: Array<{ absolutePath: string; relativePath: string }>;
}> => {
  const normalizedRoot = toNormalizedPath(unpackedDir);
  const textResourceCandidateGroups: string[][] = [];
  const textResourceMap = new Map<string, string>();
  const textResources: Array<{ absolutePath: string; relativePath: string }> = [];

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
      textResourceCandidateGroups.push(candidatePaths);
    }
  }

  if (textResourceCandidateGroups.length === 0) {
    return { textResourceMap, textResources };
  }

  const entriesByRelativePath = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }
    const absolutePath = toNormalizedPath(entry.path);
    const relativePath = normalizeCardPath(path.posix.relative(normalizedRoot, absolutePath));
    entriesByRelativePath.set(relativePath, absolutePath);
  }

  const selectedResources = new Map<string, string>();
  for (const candidatePaths of textResourceCandidateGroups) {
    const relativePath = candidatePaths.find((candidatePath) => entriesByRelativePath.has(candidatePath));
    if (!relativePath) {
      throw createCommunityUploaderError(
        "COMMUNITY_UPLOADER_RICHTEXT_RESOURCE_MISSING",
        `RichText markdown resource not found: ${candidatePaths[0] ?? ""}`,
      );
    }
    const absolutePath = entriesByRelativePath.get(relativePath);
    if (absolutePath) {
      selectedResources.set(relativePath, absolutePath);
    }
  }

  for (const [relativePath, absolutePath] of selectedResources) {
    textResourceMap.set(relativePath, await readTextFile(ctx, toNativePath(absolutePath, unpackedDir)));
    textResources.push({ absolutePath, relativePath });
  }

  return { textResourceMap, textResources };
};

const collectResources = async (ctx: CommunityCardPublishContext, unpackedDir: string): Promise<ResourceCollection> => {
  const entries = await listFiles(ctx, unpackedDir);
  const { textResourceMap, textResources } = await collectRichTextTextResources(ctx, unpackedDir, entries);
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
    if (textResourceMap.has(relativePath)) {
      continue;
    }

    const bytes = await readBinaryFile(ctx, toNativePath(absolutePath, unpackedDir));
    resources.push({
      absolutePath,
      relativePath,
      sizeBytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      mimeType: detectMimeType(relativePath),
      bytes,
    });
  }

  resources.sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
  return { resources, textResourceMap, textResources };
};

const authorizedHeaders = (request: NormalizedCommunityCardPublishRequest): HeadersInit => ({
  authorization: `Bearer ${request.server.accessToken}`,
});

const parseJsonResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  let payload: unknown = null;
  const text = await response.text();
  if (text.trim().length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw createCommunityUploaderError("COMMUNITY_UPLOADER_RESPONSE_INVALID", `${fallbackMessage}: invalid JSON response.`, {
        status: response.status,
        body: text.slice(0, 500),
      });
    }
  }

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
    throw createCommunityUploaderError(
      asString(error.code) ?? "COMMUNITY_UPLOADER_HTTP_ERROR",
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
  request: NormalizedCommunityCardPublishRequest,
  fileName: string,
): Promise<{ uploadId: string; expiresAt: string; resourcePrefix: string }> => {
  const response = await fetch(buildApiUrl(request.server.baseUrl, "/upload-sessions"), {
    method: "POST",
    headers: {
      ...authorizedHeaders(request),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      contentType: "card",
      fileName,
      roomId: request.publish.roomId ?? null,
      visibility: request.publish.visibility,
      idempotencyKey: request.publish.idempotencyKey,
      client: request.client,
    }),
  });
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to create upload session");
  if (!isRecord(payload.data) || !asString(payload.data.uploadId)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_RESPONSE_INVALID", "Upload session response is missing uploadId.");
  }
  return {
    uploadId: payload.data.uploadId,
    expiresAt: String(payload.data.expiresAt ?? ""),
    resourcePrefix: String(payload.data.resourcePrefix ?? ""),
  };
};

const presignResources = async (
  request: NormalizedCommunityCardPublishRequest,
  uploadId: string,
  resources: LocalResource[],
): Promise<PresignedResource[]> => {
  if (resources.length === 0) {
    return [];
  }

  const response = await fetch(buildApiUrl(request.server.baseUrl, `/upload-sessions/${uploadId}/resources/presign`), {
    method: "POST",
    headers: {
      ...authorizedHeaders(request),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      resources: resources.map((resource) => ({
        relativePath: resource.relativePath,
        sizeBytes: resource.sizeBytes,
        sha256: resource.sha256,
        mimeType: resource.mimeType,
      })),
    }),
  });
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to presign upload resources");
  if (!isRecord(payload.data) || !Array.isArray(payload.data.resources)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_RESPONSE_INVALID", "Presign response is missing resources.");
  }

  return payload.data.resources.filter(isRecord).map((resource) => ({
    relativePath: String(resource.relativePath ?? ""),
    publicUrl: String(resource.publicUrl ?? ""),
    uploadUrl: String(resource.uploadUrl ?? ""),
    method: resource.method === "PUT" ? "PUT" : "PUT",
    headers: isRecord(resource.headers)
      ? Object.fromEntries(Object.entries(resource.headers).map(([key, value]) => [key, String(value)]))
      : {},
    expiresAt: String(resource.expiresAt ?? ""),
  }));
};

const uploadResourceToStorage = async (resource: LocalResource, presigned: PresignedResource): Promise<void> => {
  const response = await fetch(presigned.uploadUrl, {
    method: presigned.method,
    headers: presigned.headers,
    body: toArrayBuffer(resource.bytes),
  });

  if (!response.ok) {
    throw createCommunityUploaderError(
      "COMMUNITY_UPLOADER_RESOURCE_UPLOAD_FAILED",
      `Failed to upload resource ${resource.relativePath}: HTTP ${response.status}`,
      { relativePath: resource.relativePath, status: response.status },
      response.status >= 500,
    );
  }
};

const writeRewrittenCard = async (
  ctx: CommunityCardPublishContext,
  unpackedDir: string,
  resources: LocalResource[],
  textResources: Array<{ absolutePath: string; relativePath: string }>,
  resourceUrlMap: Map<string, string>,
  textResourceMap: Map<string, string>,
): Promise<void> => {
  const entries = await listFiles(ctx, unpackedDir);

  for (const entry of entries) {
    if (!entry.isFile) {
      continue;
    }

    const normalizedRoot = toNormalizedPath(unpackedDir);
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

  for (const resource of [...resources, ...textResources]) {
    await ctx.host.invoke("file.delete", {
      path: toNativePath(resource.absolutePath, unpackedDir),
    });
  }
};

const submitProcessedCard = async (
  request: NormalizedCommunityCardPublishRequest,
  uploadId: string,
  processedCardPath: string,
  processedCardBytes: Uint8Array,
  resourceManifest: unknown,
): Promise<CommunityCardPublishResult> => {
  const form = new FormData();
  form.append("file", new Blob([toArrayBuffer(processedCardBytes)], { type: CARD_MIME_TYPE }), path.posix.basename(processedCardPath));
  form.append("manifest", JSON.stringify(resourceManifest));

  const response = await fetch(buildApiUrl(request.server.baseUrl, `/upload-sessions/${uploadId}/card`), {
    method: "POST",
    headers: authorizedHeaders(request),
    body: form,
  });
  const payload = await parseJsonResponse<{ data?: unknown }>(response, "Failed to submit processed card");

  if (!isRecord(payload.data) || !asString(payload.data.cardId)) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_RESPONSE_INVALID", "Card submit response is missing cardId.");
  }

  return {
    cardId: payload.data.cardId,
    status: String(payload.data.status ?? "ready"),
    renderStatus: String(payload.data.renderStatus ?? "queued"),
    renderStatusUrl: String(payload.data.renderStatusUrl ?? `/api/v1/cards/${payload.data.cardId}/render-status`),
    communityUrl: String(payload.data.communityUrl ?? `${request.server.baseUrl}/cards/${payload.data.cardId}`),
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

export const publishCommunityCard = async (
  ctx: CommunityCardPublishContext,
  input: CommunityCardPublishRequest,
): Promise<CommunityCardPublishResult> => {
  const request = normalizeRequest(input);
  const warnings: CommunityUploaderWarning[] = [];
  const cardStat = await getFileStat(ctx, request.cardFile);
  if (cardStat.isFile !== true) {
    throw createCommunityUploaderError("COMMUNITY_UPLOADER_INPUT_INVALID", `cardFile is not a readable file: ${request.cardFile}`);
  }

  await reportProgress(ctx, "inspect", 2, "Reading card metadata");
  const cardInfo = await ctx.host.invoke<{ info?: HostCardReadInfo }>("card.readInfo", {
    cardFile: request.cardFile,
  });
  const cardName = asString(cardInfo.info?.metadata?.name) ?? asString(cardInfo.info?.metadata?.title) ?? path.basename(request.cardFile);

  const workspace = await createWorkspaceRoot(ctx, request);
  const unpackedDir = joinNormalized(workspace.rootDir, "unpacked.card");
  const processedCardPath = resolveProcessedCardPath(request, workspace.rootDir);

  try {
    assertNotCancelled(ctx);
    await reportProgress(ctx, "unpack", 8, "Unpacking card");
    await ctx.host.invoke("card.unpack", {
      cardFile: request.cardFile,
      outputDir: toNativePath(unpackedDir, request.cardFile),
    });

    assertNotCancelled(ctx);
    await reportProgress(ctx, "scan", 18, "Scanning card resources");
    const collected = await collectResources(ctx, unpackedDir);
    const { resources, textResourceMap, textResources } = collected;

    assertNotCancelled(ctx);
    await reportProgress(ctx, "session", 26, "Creating community upload session");
    const uploadSession = await createUploadSession(request, path.basename(request.cardFile));

    assertNotCancelled(ctx);
    const presigned = await presignResources(request, uploadSession.uploadId, resources);
    const presignedByPath = new Map(presigned.map((item) => [normalizeCardPath(item.relativePath), item]));

    const resourceUrlMap = new Map<string, string>();
    for (const resource of resources) {
      const target = presignedByPath.get(resource.relativePath);
      if (!target) {
        throw createCommunityUploaderError(
          "COMMUNITY_UPLOADER_RESPONSE_INVALID",
          `Presign response did not include ${resource.relativePath}.`,
        );
      }

      await uploadResourceToStorage(resource, target);
      resourceUrlMap.set(resource.relativePath, target.publicUrl);
    }

    assertNotCancelled(ctx);
    await reportProgress(ctx, "rewrite", 58, "Rewriting card resource links");
    await writeRewrittenCard(ctx, unpackedDir, resources, textResources, resourceUrlMap, textResourceMap);

    assertNotCancelled(ctx);
    await reportProgress(ctx, "pack", 72, "Packing processed card");
    await ctx.host.invoke("card.pack", {
      cardDir: toNativePath(unpackedDir, request.cardFile),
      outputPath: toNativePath(processedCardPath, request.cardFile),
    });

    const processedBytes = await readBinaryFile(ctx, toNativePath(processedCardPath, request.cardFile));
    const uploadedResources = resources.map((resource) => ({
      relativePath: resource.relativePath,
      publicUrl: resourceUrlMap.get(resource.relativePath) ?? "",
      sizeBytes: resource.sizeBytes,
      sha256: resource.sha256,
      mimeType: resource.mimeType,
    }));

    assertNotCancelled(ctx);
    await reportProgress(ctx, "submit", 86, "Submitting processed card");
    const submitResult = await submitProcessedCard(
      request,
      uploadSession.uploadId,
      processedCardPath,
      processedBytes,
      {
        cardName,
        sourceCardFile: request.cardFile,
        uploadId: uploadSession.uploadId,
        resourcePrefix: uploadSession.resourcePrefix,
        resources: uploadedResources,
      },
    );

    await reportProgress(ctx, "completed", 100, "Community card publishing completed");
    ctx.logger.info("Community card publishing completed.", {
      cardId: submitResult.cardId,
      resourceCount: uploadedResources.length,
    });

    return {
      ...submitResult,
      uploadedResources,
      ...(request.workspace.keepProcessedCard || request.workspace.processedCardPath
        ? { processedCardPath: toNativePath(processedCardPath, request.cardFile) }
        : undefined),
      ...(warnings.length > 0 ? { warnings } : undefined),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error) {
      throw error;
    }
    throw createCommunityUploaderError(
      "COMMUNITY_UPLOADER_PUBLISH_FAILED",
      error instanceof Error ? error.message : String(error),
      { cardFile: request.cardFile },
      true,
    );
  } finally {
    if (!request.workspace.keepProcessedCard && !request.workspace.processedCardPath) {
      await ctx.host.invoke("file.delete", {
        path: toNativePath(processedCardPath, request.cardFile),
      }).catch(() => undefined);
    } else if (request.workspace.keepProcessedCard && !request.workspace.processedCardPath) {
      pushWarning(warnings, "COMMUNITY_UPLOADER_PROCESSED_CARD_KEPT", "Processed card file was kept in the temporary workspace.", {
        processedCardPath,
      });
    }

    await ctx.host.invoke("file.delete", {
      path: toNativePath(unpackedDir, request.cardFile),
      options: { recursive: true },
    }).catch(() => undefined);

    if (workspace.createdByModule && !request.workspace.keepProcessedCard && !request.workspace.processedCardPath) {
      await ctx.host.invoke("file.delete", {
        path: toNativePath(workspace.rootDir, request.cardFile),
        options: { recursive: true },
      }).catch(() => undefined);
    }
  }
};
