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

  it("openBoxInLocalViewer 应下载社区箱子并通过卡片查看器打开", async () => {
    const client = createTransferClient();
    const started: Array<{ capability: string; method: string; input: Record<string, unknown> }> = [];

    client.mockHost.setActionHandler("module.invoke", (payload) => {
      started.push(toRecord(payload) as never);
      return { mode: "job", jobId: "job-open-box-1" };
    });
    client.mockHost.setActionHandler("module.job.get", (payload) => {
      if (toRecord(payload).jobId !== "job-open-box-1") {
        throw new Error(`unexpected job id ${String(toRecord(payload).jobId)}`);
      }
      return completedJob("job-open-box-1", "openRemoteBox", {
        opened: true,
        url: "https://www.chipscard.space/boxes/box-uuid",
        localBoxPath: "/tmp/community-open-remote-box-1/美食网格箱子.box",
        surfaceId: "surface-box-1",
      });
    });

    const service = createCommunityTransferService(client);
    const progress: string[] = [];
    const result = await service.openBoxInLocalViewer("box-uuid", (update) => {
      progress.push(update.stage);
    });

    expect(started[0]).toMatchObject({
      capability: "community.card.transfer",
      method: "openRemoteBox",
      input: {
        boxId: "box-uuid",
        server: { baseUrl: "https://www.chipscard.space", accessToken: "access-token" },
      },
    });
    expect(result).toEqual({
      opened: true,
      url: "https://www.chipscard.space/boxes/box-uuid",
      localBoxPath: "/tmp/community-open-remote-box-1/美食网格箱子.box",
      surfaceId: "surface-box-1",
    });
    client.restoreBridge();
  });

  it("openBoxInLocalViewer 输出缺少 url 时应抛出错误码", async () => {
    const client = createTransferClient();
    client.mockHost.setActionHandler("module.invoke", () => ({ mode: "job", jobId: "job-open-box-2" }));
    client.mockHost.setActionHandler("module.job.get", () =>
      completedJob("job-open-box-2", "openRemoteBox", { opened: true, url: "" }),
    );

    const service = createCommunityTransferService(client);
    await expect(service.openBoxInLocalViewer("box-uuid")).rejects.toThrow(
      "COMMUNITY_TRANSFER_OPEN_FAILED",
    );
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

  it("uploadBox 应提交 boxFile 并返回箱子社区入口与卡片统计", async () => {
    const client = createTransferClient();
    const started: Array<{ capability: string; method: string; input: Record<string, unknown> }> = [];

    client.mockHost.setActionHandler("module.invoke", (payload) => {
      started.push(toRecord(payload) as never);
      return { mode: "job", jobId: "job-box-upload-1" };
    });
    let getCount = 0;
    client.mockHost.setActionHandler("module.job.get", () => {
      getCount += 1;
      if (getCount === 1) {
        return {
          job: {
            jobId: "job-box-upload-1",
            pluginId: "chips.module.chips.community-uploader",
            capability: "community.card.transfer",
            method: "uploadBox",
            status: "running",
            createdAt: Date.now(),
            updatedAt: Date.now(),
            progress: { stage: "box-upload", percent: 40, message: "uploading box" },
          },
        };
      }
      return completedJob("job-box-upload-1", "uploadBox", {
        boxId: "box-uuid",
        communityUrl: "https://www.chipscard.space/boxes/box-uuid",
        uploadedCards: [
          {
            documentId: "doc-day-01",
            cardFile: "day-01.card",
            communityCardId: "card-uuid",
            communityUrl: "https://www.chipscard.space/cards/card-uuid",
          },
        ],
        skippedCards: [
          { entryId: "entry-1", url: "https://example.com/day-02.card", reason: "network" },
        ],
        warnings: [{ code: "BOX_UPLOAD_PARTIAL", message: "some entries were skipped" }],
      });
    });

    const service = createCommunityTransferService(client);
    const progress: string[] = [];
    const result = await service.uploadBox("/local/travel.box", (update) => {
      progress.push(update.stage);
    });

    expect(started[0]).toMatchObject({
      capability: "community.card.transfer",
      method: "uploadBox",
      input: {
        boxFile: "/local/travel.box",
        server: { baseUrl: "https://www.chipscard.space", accessToken: "access-token" },
        publish: { roomId: null },
      },
    });
    expect(result.boxId).toBe("box-uuid");
    expect(result.communityUrl).toBe("https://www.chipscard.space/boxes/box-uuid");
    expect(result.uploadedCards).toHaveLength(1);
    expect(result.uploadedCards[0]).toMatchObject({
      documentId: "doc-day-01",
      communityCardId: "card-uuid",
    });
    expect(result.skippedCards).toHaveLength(1);
    expect(result.skippedCards[0]).toMatchObject({
      reason: "network",
    });
    expect(result.warnings).toEqual([{ code: "BOX_UPLOAD_PARTIAL", message: "some entries were skipped" }]);
    expect(progress).toContain("box-upload");
    client.restoreBridge();
  });

  it("uploadBox 输出缺少 boxId 时应抛出错误码", async () => {
    const client = createTransferClient();
    client.mockHost.setActionHandler("module.invoke", () => ({ mode: "job", jobId: "job-box-bad-1" }));
    client.mockHost.setActionHandler("module.job.get", () =>
      completedJob("job-box-bad-1", "uploadBox", { communityUrl: "" }),
    );

    const service = createCommunityTransferService(client);
    await expect(service.uploadBox("/local/travel.box")).rejects.toThrow(
      "COMMUNITY_TRANSFER_BOX_UPLOAD_FAILED",
    );
    client.restoreBridge();
  });

  it("uploadBox 缺少登录会话时不应发起模块调用", async () => {
    const client = createTransferClient();
    setAccessToken(null);
    configureCommunityApiBaseUrl("");

    const service = createCommunityTransferService(client);
    await expect(service.uploadBox("/local/travel.box")).rejects.toThrow(
      "COMMUNITY_TRANSFER_SESSION_MISSING",
    );
    expect(client.calls.map((call) => call.action)).not.toContain("module.invoke");
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
