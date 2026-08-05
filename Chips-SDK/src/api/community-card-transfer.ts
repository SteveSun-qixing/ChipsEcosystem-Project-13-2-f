import type { CoreClient } from "../types/client";
import type { ModuleInvokeResult } from "./module";

export const COMMUNITY_CARD_TRANSFER_CAPABILITY = "community.card.transfer";

export interface CommunityCardTransferServer {
  baseUrl: string;
  accessToken: string;
}

export interface CommunityCardTransferClientInfo {
  name?: string;
  version?: string;
  platform?: string;
}

export interface CommunityCardTransferPublishInput {
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

export interface CommunityCardTransferDownloadInput {
  cardId: string;
  server: CommunityCardTransferServer;
  outputPath: string;
  versionId?: string;
  client?: CommunityCardTransferClientInfo;
  workspace?: {
    tempDir?: string;
  };
}

export interface CommunityCardTransferOpenRemoteInput {
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

export interface CommunityCardTransferApi {
  upload(input: CommunityCardTransferPublishInput): Promise<ModuleInvokeResult>;
  download(input: CommunityCardTransferDownloadInput): Promise<ModuleInvokeResult>;
  openRemote(input: CommunityCardTransferOpenRemoteInput): Promise<ModuleInvokeResult>;
  getStatus(taskId: string): Promise<unknown>;
  cancel(taskId: string): Promise<void>;
}

function invokeTransferModule(
  client: CoreClient,
  method: string,
  input: Record<string, unknown>,
): Promise<ModuleInvokeResult> {
  return client.invoke("module.invoke", {
    capability: COMMUNITY_CARD_TRANSFER_CAPABILITY,
    method,
    input,
  });
}

export function createCommunityCardTransferApi(client: CoreClient): CommunityCardTransferApi {
  return {
    upload(input) {
      return invokeTransferModule(client, "upload", input as unknown as Record<string, unknown>);
    },
    download(input) {
      return invokeTransferModule(client, "download", input as unknown as Record<string, unknown>);
    },
    openRemote(input) {
      return invokeTransferModule(client, "openRemote", input as unknown as Record<string, unknown>);
    },
    async getStatus(taskId) {
      const result = await client.invoke<{ jobId: string }, { job: unknown }>("module.job.get", { jobId: taskId });
      return result.job;
    },
    async cancel(taskId) {
      await client.invoke("module.job.cancel", { jobId: taskId });
    },
  };
}
