import type { Client, ModuleInvokeResult, ModuleJobRecord } from "chips-sdk";
import { getAccessToken, getCommunityApiBaseUrl } from "../api/client";

export interface CommunityServerSession {
  baseUrl: string;
  accessToken: string;
}

export interface TransferJobProgress {
  stage: string;
  percent: number;
  message: string;
}

export interface TransferJobHandle<T = unknown> {
  jobId: string;
  poll(): Promise<TransferJobState<T>>;
  cancel(): Promise<void>;
}

export type TransferJobState<T = unknown> =
  | { status: "running"; progress: TransferJobProgress | null }
  | { status: "completed"; output: T }
  | { status: "failed"; code: string; message: string }
  | { status: "cancelled" };

export interface CommunityBoxUploadedCard {
  entryId?: string;
  documentId?: string;
  cardFile: string;
  communityCardId: string;
  communityUrl: string;
}

export interface CommunityBoxSkippedCard {
  entryId?: string;
  documentId?: string;
  url: string;
  reason: "embedded" | "network";
}

export interface BoxUploadResult {
  boxId: string;
  versionId: string;
  status: string;
  communityUrl: string;
  boxViewUrl?: string;
  uploadedCards: CommunityBoxUploadedCard[];
  skippedCards: CommunityBoxSkippedCard[];
  warnings?: Array<{ code: string; message: string }>;
}

export interface CommunityTransferService {
  openInLocalViewer(cardId: string, onProgress?: (progress: TransferJobProgress) => void): Promise<{
    opened: boolean;
    url: string;
    localCardPath?: string;
    surfaceId?: string;
  }>;
  openBoxInLocalViewer(boxId: string, onProgress?: (progress: TransferJobProgress) => void): Promise<{
    opened: boolean;
    url: string;
    localBoxPath?: string;
    surfaceId?: string;
  }>;
  uploadCard(cardFile: string, onProgress?: (progress: TransferJobProgress) => void): Promise<{
    cardId: string;
    versionId: string;
    status: string;
    renderStatus: string;
    renderStatusUrl: string;
    communityUrl: string;
    uploadedResources: unknown[];
    warnings?: Array<{ code: string; message: string }>;
  }>;
  uploadBox(boxFile: string, onProgress?: (progress: TransferJobProgress) => void): Promise<BoxUploadResult>;
  downloadCard(cardId: string, outputPath: string, onProgress?: (progress: TransferJobProgress) => void): Promise<{
    cardId: string;
    outputPath: string;
    restoredResourceCount: number;
    suggestedFileName?: string;
  }>;
  resolveServerSession(): CommunityServerSession | null;
}

const JOB_POLL_INTERVAL_MS = 1200;
const JOB_POLL_TIMEOUT_MS = 30 * 60 * 1000;

function normalizeProgress(progress: ModuleJobRecord["progress"]): TransferJobProgress | null {
  if (!progress || typeof progress !== "object") {
    return null;
  }

  const record = progress as Record<string, unknown>;
  const stage = typeof record.stage === "string" ? record.stage : "";
  const percent = Number(record.percent);
  const message = typeof record.message === "string" ? record.message : "";

  if (!stage && !message) {
    return null;
  }

  return {
    stage,
    percent: Number.isFinite(percent) ? percent : 0,
    message,
  };
}

function readJobError(error: ModuleJobRecord["error"]): { code: string; message: string } {
  if (error && typeof error === "object" && typeof error.message === "string") {
    return {
      code: typeof error.code === "string" ? error.code : "COMMUNITY_TRANSFER_FAILED",
      message: error.message,
    };
  }
  return { code: "COMMUNITY_TRANSFER_FAILED", message: "Community card transfer failed." };
}

export function createCommunityTransferService(client: Client): CommunityTransferService {
  async function runJob(
    started: ModuleInvokeResult,
    onProgress?: (progress: TransferJobProgress) => void,
  ): Promise<{ jobId: string; output: unknown }> {
    if (started.mode !== "job") {
      throw new Error("Community card transfer returned an invalid non-job result.");
    }

    const jobId = started.jobId;
    const startedAt = Date.now();

    while (Date.now() - startedAt < JOB_POLL_TIMEOUT_MS) {
      const job = await client.module.job.get(jobId);
      const progress = normalizeProgress(job.progress);
      if (progress) {
        onProgress?.(progress);
      }

      if (job.status === "completed") {
        return { jobId, output: job.output };
      }
      if (job.status === "failed") {
        const error = readJobError(job.error);
        throw new Error(`${error.code}: ${error.message}`);
      }
      if (job.status === "cancelled") {
        throw new Error("COMMUNITY_TRANSFER_CANCELLED: Community card transfer was cancelled.");
      }

      await new Promise((resolve) => globalThis.setTimeout(resolve, JOB_POLL_INTERVAL_MS));
    }

    throw new Error("COMMUNITY_TRANSFER_TIMEOUT: Community card transfer timed out.");
  }

  function resolveServerSession(): CommunityServerSession | null {
    const baseUrl = getCommunityApiBaseUrl();
    const accessToken = getAccessToken();
    if (!baseUrl || !accessToken) {
      return null;
    }
    return { baseUrl, accessToken };
  }

  return {
    resolveServerSession,

    async openInLocalViewer(cardId, onProgress) {
      const session = resolveServerSession();
      if (!session) {
        throw new Error("COMMUNITY_TRANSFER_SESSION_MISSING: Community session is not available.");
      }

      const started = await client.communityCardTransfer.openRemote({
        cardId,
        server: {
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        },
      });

      const { output } = await runJob(started, onProgress);
      const record = (output ?? {}) as Record<string, unknown>;
      if (record.opened !== true || typeof record.url !== "string") {
        throw new Error("COMMUNITY_TRANSFER_OPEN_FAILED: Failed to open the community card locally.");
      }

      return {
        opened: true,
        url: record.url,
        localCardPath: typeof record.localCardPath === "string" ? record.localCardPath : undefined,
        surfaceId: typeof record.surfaceId === "string" ? record.surfaceId : undefined,
      };
    },

    async openBoxInLocalViewer(boxId, onProgress) {
      const session = resolveServerSession();
      if (!session) {
        throw new Error("COMMUNITY_TRANSFER_SESSION_MISSING: Community session is not available.");
      }

      const started = await client.communityCardTransfer.openRemoteBox({
        boxId,
        server: {
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        },
      });

      const { output } = await runJob(started, onProgress);
      const record = (output ?? {}) as Record<string, unknown>;
      if (record.opened !== true || typeof record.url !== "string" || record.url.trim().length === 0) {
        throw new Error("COMMUNITY_TRANSFER_OPEN_FAILED: Failed to open the community box locally.");
      }

      return {
        opened: true,
        url: record.url,
        localBoxPath: typeof record.localBoxPath === "string" ? record.localBoxPath : undefined,
        surfaceId: typeof record.surfaceId === "string" ? record.surfaceId : undefined,
      };
    },

    async uploadCard(cardFile, onProgress) {
      const session = resolveServerSession();
      if (!session) {
        throw new Error("COMMUNITY_TRANSFER_SESSION_MISSING: Community session is not available.");
      }

      const started = await client.communityCardTransfer.upload({
        cardFile,
        server: {
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        },
        publish: {
          roomId: null,
          idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `community-upload-${Date.now()}`,
        },
      });

      const { output } = await runJob(started, onProgress);
      const record = (output ?? {}) as Record<string, unknown>;
      if (typeof record.cardId !== "string") {
        throw new Error("COMMUNITY_TRANSFER_UPLOAD_FAILED: Failed to publish the community card.");
      }

      return {
        cardId: record.cardId,
        versionId: typeof record.versionId === "string" ? record.versionId : "",
        status: typeof record.status === "string" ? record.status : "ready",
        renderStatus: typeof record.renderStatus === "string" ? record.renderStatus : "queued",
        renderStatusUrl: typeof record.renderStatusUrl === "string" ? record.renderStatusUrl : "",
        communityUrl: typeof record.communityUrl === "string" ? record.communityUrl : "",
        uploadedResources: Array.isArray(record.uploadedResources) ? record.uploadedResources : [],
        warnings: Array.isArray(record.warnings) ? record.warnings as Array<{ code: string; message: string }> : undefined,
      };
    },

    async uploadBox(boxFile, onProgress) {
      const session = resolveServerSession();
      if (!session) {
        throw new Error("COMMUNITY_TRANSFER_SESSION_MISSING: Community session is not available.");
      }

      const started = await client.communityCardTransfer.uploadBox({
        boxFile,
        server: {
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        },
        publish: {
          roomId: null,
          idempotencyKey: typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `community-box-upload-${Date.now()}`,
        },
      });

      const { output } = await runJob(started, onProgress);
      const record = (output ?? {}) as Record<string, unknown>;
      if (typeof record.boxId !== "string") {
        throw new Error("COMMUNITY_TRANSFER_BOX_UPLOAD_FAILED: Failed to publish the community box.");
      }

      return {
        boxId: record.boxId,
        versionId: typeof record.versionId === "string" ? record.versionId : "",
        status: typeof record.status === "string" ? record.status : "ready",
        communityUrl: typeof record.communityUrl === "string" ? record.communityUrl : "",
        boxViewUrl: typeof record.boxViewUrl === "string" ? record.boxViewUrl : undefined,
        uploadedCards: Array.isArray(record.uploadedCards)
          ? record.uploadedCards as CommunityBoxUploadedCard[]
          : [],
        skippedCards: Array.isArray(record.skippedCards)
          ? record.skippedCards as CommunityBoxSkippedCard[]
          : [],
        warnings: Array.isArray(record.warnings) ? record.warnings as Array<{ code: string; message: string }> : undefined,
      };
    },

    async downloadCard(cardId, outputPath, onProgress) {
      const session = resolveServerSession();
      if (!session) {
        throw new Error("COMMUNITY_TRANSFER_SESSION_MISSING: Community session is not available.");
      }

      const started = await client.communityCardTransfer.download({
        cardId,
        outputPath,
        server: {
          baseUrl: session.baseUrl,
          accessToken: session.accessToken,
        },
      });

      const { output } = await runJob(started, onProgress);
      const record = (output ?? {}) as Record<string, unknown>;
      if (typeof record.cardId !== "string") {
        throw new Error("COMMUNITY_TRANSFER_DOWNLOAD_FAILED: Failed to download the community card.");
      }

      return {
        cardId: record.cardId,
        outputPath: typeof record.outputPath === "string" ? record.outputPath : outputPath,
        restoredResourceCount: Number(record.restoredResourceCount ?? 0),
        suggestedFileName: typeof record.suggestedFileName === "string" ? record.suggestedFileName : undefined,
      };
    },
  };
}
