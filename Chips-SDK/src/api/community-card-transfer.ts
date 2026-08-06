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

export interface CommunityCardTransferOpenRemoteBoxInput {
  boxId: string;
  server: CommunityCardTransferServer;
  workspace?: {
    tempDir?: string;
  };
}

export interface CommunityCardTransferOpenRemoteBoxResult {
  opened: true;
  url: string;
  localBoxPath?: string;
  surfaceId?: string;
}

export interface CommunityCardTransferBoxUploadInput {
  boxFile: string;
  server: CommunityCardTransferServer;
  publish?: {
    roomId?: string | null;
    idempotencyKey?: string;
  };
  client?: CommunityCardTransferClientInfo;
  workspace?: {
    tempDir?: string;
  };
}

export interface CommunityCardTransferBoxUploadedCard {
  documentId: string;
  cardFile: string;
  communityCardId: string;
  communityUrl: string;
}

export interface CommunityCardTransferBoxSkippedCard {
  entryId?: string;
  documentId?: string;
  url: string;
  reason: "embedded" | "network";
}

export interface CommunityCardTransferBoxUploadResult {
  boxId: string;
  communityUrl: string;
  uploadedCards: CommunityCardTransferBoxUploadedCard[];
  skippedCards: CommunityCardTransferBoxSkippedCard[];
}

export interface CommunityCardTransferApi {
  upload(input: CommunityCardTransferPublishInput): Promise<ModuleInvokeResult>;
  download(input: CommunityCardTransferDownloadInput): Promise<ModuleInvokeResult>;
  openRemote(input: CommunityCardTransferOpenRemoteInput): Promise<ModuleInvokeResult>;
  /**
   * 在本地卡片查看器中打开社区箱子。
   *
   * 流程：请求 `GET /api/v1/boxes/{boxId}/download` 获取预签名下载地址 → 下载 `.box` 到
   * 临时目录 → `surface.open` 启动 `com.chips.card-viewer`，以 `documentKind: 'box'` 渲染箱子。
   *
   * 返回 `ModuleInvokeResult`，其 job 完成数据为 `CommunityCardTransferOpenRemoteBoxResult`：
   * `{ opened, url, localBoxPath?, surfaceId? }`。
   */
  openRemoteBox(input: CommunityCardTransferOpenRemoteBoxInput): Promise<ModuleInvokeResult>;
  /**
   * 上传箱子到社区（预留能力，实际流程由 Chips-CommunityUploader-Plugin 的 `uploadBox` 实现）。
   *
   * 流程：`box.inspect` → `box.unpack` → 收集散落卡片（`file://` 引用）逐个走 `upload` 上传，
   * 内嵌（包内相对路径）与网络（http/https/webdav）卡片跳过；回写工作副本 structure.yaml 后
   * 通过 card-transfer 控制面（contentType=box）上传箱子本体。
   *
   * 返回 `ModuleInvokeResult`，其 job 完成数据为 `CommunityCardTransferBoxUploadResult`：
   * `{ boxId, communityUrl, uploadedCards, skippedCards }`。
   */
  uploadBox(input: CommunityCardTransferBoxUploadInput): Promise<ModuleInvokeResult>;
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
    openRemoteBox(input) {
      return invokeTransferModule(client, "openRemoteBox", input as unknown as Record<string, unknown>);
    },
    uploadBox(input) {
      return invokeTransferModule(client, "uploadBox", input as unknown as Record<string, unknown>);
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
