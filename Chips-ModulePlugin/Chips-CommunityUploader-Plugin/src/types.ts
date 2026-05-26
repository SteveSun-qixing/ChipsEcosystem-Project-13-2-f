import type { CommunityUploaderWarning } from "./errors";

export interface CommunityCardPublishRequest {
  cardFile: string;
  server: {
    baseUrl: string;
    accessToken: string;
  };
  publish?: {
    roomId?: string | null;
    visibility?: "public" | "private";
    idempotencyKey?: string;
  };
  client?: {
    name?: string;
    version?: string;
    platform?: string;
  };
  workspace?: {
    tempDir?: string;
    keepProcessedCard?: boolean;
    processedCardPath?: string;
  };
}

export interface NormalizedCommunityCardPublishRequest {
  cardFile: string;
  server: {
    baseUrl: string;
    accessToken: string;
  };
  publish: {
    roomId?: string | null;
    visibility: "public" | "private";
    idempotencyKey?: string;
  };
  client: {
    name: string;
    version: string;
    platform?: string;
  };
  workspace: {
    tempDir?: string;
    keepProcessedCard: boolean;
    processedCardPath?: string;
  };
}

export interface CommunityCardPublishResult {
  cardId: string;
  status: string;
  renderStatus: string;
  renderStatusUrl: string;
  communityUrl: string;
  processedCardPath?: string;
  uploadedResources: Array<{
    relativePath: string;
    publicUrl: string;
    sizeBytes: number;
    sha256: string;
    mimeType: string;
  }>;
  warnings?: CommunityUploaderWarning[];
}

export interface HostFileStatLike {
  size?: number;
  isFile?: boolean;
  isDirectory?: boolean;
}

export interface HostFileListEntry {
  path: string;
  isFile: boolean;
  isDirectory: boolean;
}

export interface HostCardReadInfo {
  metadata?: Record<string, unknown>;
  status?: unknown;
}

export interface CommunityCardPublishContext {
  logger: {
    debug(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    error(message: string, metadata?: Record<string, unknown>): void;
  };
  host: {
    invoke<TOutput = unknown>(action: string, payload?: Record<string, unknown>): Promise<TOutput>;
  };
  job?: {
    id: string;
    signal: AbortSignal;
    reportProgress(payload: Record<string, unknown>): Promise<void>;
    isCancelled(): boolean;
  };
}
