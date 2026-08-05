import { describe, expect, it } from "vitest";
import { createMockChipsClient } from "chips-sdk/testing";
import {
  COMMUNITY_SERVER_URL_CONFIG_KEY,
  loadCommunityServerUrl,
  normalizeCommunityServerUrl,
  saveCommunityServerUrl,
} from "../../src/community/lib/server-config";
import { appConfig } from "../../config/app-config";

describe("community server config", () => {
  it("应归一化合法的 http(s) 地址并拒绝非法输入", () => {
    expect(normalizeCommunityServerUrl("  https://www.chipscard.space/  ")).toBe(
      "https://www.chipscard.space",
    );
    expect(normalizeCommunityServerUrl("http://127.0.0.1:8788")).toBe("http://127.0.0.1:8788");
    expect(normalizeCommunityServerUrl("")).toBeNull();
    expect(normalizeCommunityServerUrl("not-a-url")).toBeNull();
    expect(normalizeCommunityServerUrl("ftp://example.com")).toBeNull();
  });

  it("读取服务器地址时应回退到应用默认值", async () => {
    const client = createMockChipsClient();
    client.mockHost.setActionHandler("config.get", () => ({ value: undefined }));
    await expect(loadCommunityServerUrl(client)).resolves.toBe(appConfig.communityServerUrl);

    client.mockHost.setActionHandler("config.get", () => ({ value: "https://community.example.com" }));
    await expect(loadCommunityServerUrl(client)).resolves.toBe("https://community.example.com");
    client.restoreBridge();
  });

  it("保存服务器地址时通过 config.set 持久化", async () => {
    const client = createMockChipsClient();
    const saved: Array<{ key: string; value: unknown }> = [];
    client.mockHost.setActionHandler("config.set", (payload: unknown) => {
      const record = payload as Record<string, unknown>;
      saved.push({ key: String(record.key), value: record.value });
      return {};
    });

    await saveCommunityServerUrl(client, "https://www.chipscard.space/");

    expect(saved).toEqual([
      { key: COMMUNITY_SERVER_URL_CONFIG_KEY, value: "https://www.chipscard.space" },
    ]);
    client.restoreBridge();
  });
});
