import { describe, expect, it } from "vitest";
import { resolveCommunityUrl } from "../../src/community/lib/ui";

describe("resolveCommunityUrl", () => {
  it("相对路径应拼接服务器地址", () => {
    expect(resolveCommunityUrl("https://www.chipscard.space", "/api/v1/cards/x/cover")).toBe(
      "https://www.chipscard.space/api/v1/cards/x/cover",
    );
    expect(resolveCommunityUrl("https://www.chipscard.space/", "/admin/")).toBe(
      "https://www.chipscard.space/admin/",
    );
  });

  it("完整绝对 URL 应原样返回（对象存储封面等）", () => {
    expect(
      resolveCommunityUrl(
        "https://www.chipscard.space",
        "http://localhost:9000/chips-covers/boxes/x/cover.png",
      ),
    ).toBe("http://localhost:9000/chips-covers/boxes/x/cover.png");
    expect(
      resolveCommunityUrl(
        "https://www.chipscard.space",
        "https://cdn.example/chips-covers/boxes/x/cover.png",
      ),
    ).toBe("https://cdn.example/chips-covers/boxes/x/cover.png");
  });
});
