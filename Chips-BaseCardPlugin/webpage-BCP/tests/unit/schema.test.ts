import { describe, expect, it } from "vitest";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("webpage basecard schema", () => {
  it("normalizes bundle resource paths and display rules", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "WebPageCard",
      source_type: "bundle",
      bundle_root: "./web-bundle",
      entry_file: "./index.html",
      resource_paths: ["./web-bundle/index.html", "web-bundle/assets/app.js"],
      display_mode: "free",
      max_height_ratio: 999,
    });

    expect(normalized.bundle_root).toBe("web-bundle");
    expect(normalized.entry_file).toBe("index.html");
    expect(normalized.resource_paths).toEqual([
      "web-bundle/index.html",
      "web-bundle/assets/app.js",
    ]);
    expect(normalized.display_mode).toBe("free");
    expect(normalized.fixed_ratio).toBe("7:16");
  });

  it("accepts an empty initial draft", () => {
    const result = validateBasecardConfig(
      normalizeBasecardConfig({
        card_type: "WebPageCard",
        source_type: "url",
        source_url: "",
      }),
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("rejects invalid webpage urls", () => {
    const result = validateBasecardConfig(
      normalizeBasecardConfig({
        card_type: "WebPageCard",
        source_type: "url",
        source_url: "javascript:alert(1)",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.source_url).toContain("网页地址");
  });
});
