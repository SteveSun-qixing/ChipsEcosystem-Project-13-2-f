import { describe, expect, it } from "vitest";
import { createMockChipsClient } from "chips-sdk/testing";
import { createCommunityTransferService } from "../../src/community/lib/transfer";
import {
  configureCommunityApiBaseUrl,
  setAccessToken,
} from "../../src/community/api/client";

function createTransferClient() {
  const client = createMockChipsClient();
  configureCommunityApiBaseUrl("https://www.chipscard.space");
  setAccessToken("access-token");
  return client;
}

function toRecord(payload: unknown): Record<string, unknown> {
  return (payload ?? {}) as Record<string, unknown>;
}

function completedJob(jobId: string, method: string, output: Record<string, unknown>) {
  return {
    job: {
      jobId,
      pluginId: "chips.module.chips.community-uploader",
      capability: "community.card.transfer",
      method,
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      output,
    },
  };
}

describe("community transfer service", () => {
  it("openInLocalViewer 应创建下载会话并打开本地查看器", async () => {
    const client = createTransferClient();
    const started: Array<{ capability: string; method: string; input: Record<string, unknown> }> = [];

    client.mockHost.setActionHandler("module.invoke", (payload) => {
      started.push(toRecord(payload) as never);
      return { mode: "job", jobId: "job-open-1" };
    });
    client.mockHost.setActionHandler("module.job.get", (payload) => {
      if (toRecord(payload).jobId !== "job-open-1") {
        throw new Error(`unexpected job id ${String(toRecord(payload).jobId)}`);
      }
      return completedJob("job-open-1", "openRemote", {
        opened: true,
        url: "https://www.chipscard.space/cards/uuid",
        localCardPath: "/tmp/community-open-remote-1/card.card",
        surfaceId: "surface-1",
      });
    });

    const service = createCommunityTransferService(client);
    const progress: string[] = [];
    const result = await service.openInLocalViewer("uuid", (update) => {
      progress.push(update.stage);
    });

    expect(started[0]).toMatchObject({
      capability: "community.card.transfer",
      method: "openRemote",
      input: {
        cardId: "uuid",
        server: { baseUrl: "https://www.chipscard.space", accessToken: "access-token" },
      },
    });
    expect(result).toEqual({
      opened: true,
      url: "https://www.chipscard.space/cards/uuid",
      localCardPath: "/tmp/community-open-remote-1/card.card",
      surfaceId: "surface-1",
    });
    client.restoreBridge();
  });

  it("uploadCard 应提交 cardFile 并返回社区入口", async () => {
    const client = createTransferClient();
    const started: Array<{ capability: string; method: string; input: Record<string, unknown> }> = [];

    client.mockHost.setActionHandler("module.invoke", (payload) => {
      started.push(toRecord(payload) as never);
      return { mode: "job", jobId: "job-upload-1" };
    });
    client.mockHost.setActionHandler("module.job.get", () =>
      completedJob("job-upload-1", "upload", {
        cardId: "card-uuid",
        versionId: "version-uuid",
        status: "ready",
        renderStatus: "queued",
        renderStatusUrl: "/api/v1/cards/card-uuid/render-status",
        communityUrl: "https://www.chipscard.space/cards/card-uuid",
        uploadedResources: [],
      }),
    );

    const service = createCommunityTransferService(client);
    const result = await service.uploadCard("/local/demo.card");

    expect(started[0]).toMatchObject({
      capability: "community.card.transfer",
      method: "upload",
      input: {
        cardFile: "/local/demo.card",
        publish: { roomId: null },
      },
    });
    expect(result.cardId).toBe("card-uuid");
    expect(result.communityUrl).toBe("https://www.chipscard.space/cards/card-uuid");
    client.restoreBridge();
  });

  it("downloadCard 应保存到输出路径", async () => {
    const client = createTransferClient();
    client.mockHost.setActionHandler("module.invoke", () => ({ mode: "job", jobId: "job-download-1" }));
    client.mockHost.setActionHandler("module.job.get", () =>
      completedJob("job-download-1", "download", {
        cardId: "card-uuid",
        outputPath: "/local/demo.card",
        restoredResourceCount: 3,
        suggestedFileName: "demo.card",
      }),
    );

    const service = createCommunityTransferService(client);
    const result = await service.downloadCard("card-uuid", "/local/demo.card");

    expect(result).toEqual({
      cardId: "card-uuid",
      outputPath: "/local/demo.card",
      restoredResourceCount: 3,
      suggestedFileName: "demo.card",
    });
    client.restoreBridge();
  });

  it("任务失败时应抛出带错误码的错误", async () => {
    const client = createTransferClient();
    client.mockHost.setActionHandler("module.invoke", () => ({ mode: "job", jobId: "job-failed-1" }));
    client.mockHost.setActionHandler("module.job.get", () => ({
      job: {
        jobId: "job-failed-1",
        pluginId: "chips.module.chips.community-uploader",
        capability: "community.card.transfer",
        method: "upload",
        status: "failed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        error: { code: "COMMUNITY_TRANSFER_UPLOAD_FAILED", message: "boom" },
      },
    }));

    const service = createCommunityTransferService(client);
    await expect(service.uploadCard("/local/demo.card")).rejects.toThrow(
      "COMMUNITY_TRANSFER_UPLOAD_FAILED: boom",
    );
    client.restoreBridge();
  });

  it("缺少登录会话时不应发起模块调用", async () => {
    const client = createTransferClient();
    setAccessToken(null);
    configureCommunityApiBaseUrl("");

    const service = createCommunityTransferService(client);
    await expect(service.openInLocalViewer("uuid")).rejects.toThrow(
      "COMMUNITY_TRANSFER_SESSION_MISSING",
    );
    expect(client.calls.map((call) => call.action)).not.toContain("module.invoke");
    client.restoreBridge();
  });
});
