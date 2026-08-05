import type { CommunityUploaderWarning } from "./errors";

export interface CommunityCardTransferServer {
  baseUrl: string;
  accessToken: string;
}

export interface CommunityCardTransferClientInfo {
  name?: string;
  version?: string;
  platform?: string;
}

export interface CommunityCardTransferUploadRequest {
  cardFile: string;
  server: CommunityCardTransferServer;
  publish?: {
    roomId?: string | null;
    idempotencyKey?: string;
  };
  client?: CommunityCardTransferClientInfo;
  workspace?: {
    tempDir?: string;
    keepNetworkCard?: boolean;
    networkCardPath?: string;
  };
}

export interface NormalizedCommunityCardTransferUploadRequest {
  cardFile: string;
  server: CommunityCardTransferServer;
  publish: {
    roomId?: string | null;
    idempotencyKey?: string;
  };
  client: Required<Pick<CommunityCardTransferClientInfo, "name" | "version">> & {
    platform?: string;
  };
  workspace: {
    tempDir?: string;
    keepNetworkCard: boolean;
    networkCardPath?: string;
  };
}

export interface CommunityCardTransferUploadedResource {
  originalRelativePath: string;
  networkUrl: string;
  publicUrl: string;
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface CommunityCardTransferUploadResult {
  cardId: string;
  versionId: string;
  status: string;
  renderStatus: string;
  renderStatusUrl: string;
  communityUrl: string;
  networkCardPath?: string;
  uploadedResources: CommunityCardTransferUploadedResource[];
  warnings?: CommunityUploaderWarning[];
}

export interface CommunityCardTransferDownloadRequest {
  cardId: string;
  server: CommunityCardTransferServer;
  outputPath: string;
  versionId?: string;
  client?: CommunityCardTransferClientInfo;
  workspace?: {
    tempDir?: string;
  };
}

export interface NormalizedCommunityCardTransferDownloadRequest {
  cardId: string;
  server: CommunityCardTransferServer;
  outputPath: string;
  versionId?: string;
  client: Required<Pick<CommunityCardTransferClientInfo, "name" | "version">> & {
    platform?: string;
  };
  workspace: {
    tempDir?: string;
  };
}

export interface CommunityCardTransferDownloadResult {
  cardId: string;
  versionId?: string | null;
  outputPath: string;
  restoredResourceCount: number;
  suggestedFileName?: string;
}

export interface CommunityCardTransferOpenRemoteRequest {
  cardId?: string;
  url?: string;
  server?: CommunityCardTransferServer;
  workspace?: {
    tempDir?: string;
  };
}

export interface CommunityCardTransferOpenRemoteResult {
  opened: true;
  url: string;
  localCardPath?: string;
  surfaceId?: string;
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

export interface HostZipEntryMeta {
  path: string;
  size: number;
  compressedSize: number;
  crc32: number;
  offset: number;
  isDirectory: boolean;
  compressionMethod: number;
  modifiedTime?: number;
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
