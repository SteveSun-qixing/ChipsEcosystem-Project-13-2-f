import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface ThemeTokenLayers {
  ref: Record<string, unknown>;
  sys: Record<string, unknown>;
  comp: Record<string, unknown>;
  motion: Record<string, unknown>;
  layout: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

describe("theme tokens", () => {
  it("produces five-layer tokens structure", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const tokensPath = path.join(projectRoot, "dist", "tokens.json");
    const raw = await fs.readFile(tokensPath, "utf-8");
    const parsed = JSON.parse(raw) as ThemeTokenLayers;

    expect(isRecord(parsed.ref)).toBe(true);
    expect(isRecord(parsed.sys)).toBe(true);
    expect(isRecord(parsed.comp)).toBe(true);
    expect(isRecord(parsed.motion)).toBe(true);
    expect(isRecord(parsed.layout)).toBe(true);
    expect(parsed.comp.chips?.comp?.text?.root?.color?.default).toBeDefined();
    expect(parsed.comp.chips?.comp?.label?.["required-indicator"]?.color).toBeDefined();
    expect(parsed.comp.chips?.comp?.icon?.root?.opsz).toBeDefined();
    expect(parsed.comp.chips?.comp?.["icon-button"]?.root?.size).toBeDefined();
    expect(parsed.comp.chips?.comp?.["toggle-button"]?.root?.surface?.pressed).toBeDefined();
    expect(parsed.comp.chips?.comp?.badge?.root?.surface?.warning).toBeDefined();
    expect(parsed.comp.chips?.comp?.tag?.close?.color?.hover).toBeDefined();
    expect(parsed.comp.chips?.comp?.avatar?.fallback?.color).toBeDefined();
    expect(parsed.comp.chips?.comp?.spinner?.motion?.duration).toBeDefined();
    expect(parsed.comp.chips?.comp?.progress?.range?.surface?.indeterminate).toBeDefined();
    expect(parsed.comp.chips?.comp?.["text-field"]?.root?.border?.error).toBeDefined();
    expect(parsed.comp.chips?.comp?.["text-area"]?.control?.color).toBeDefined();
    expect(parsed.comp.chips?.comp?.["search-field"]?.clear?.color?.hover).toBeDefined();
    expect(parsed.comp.chips?.comp?.["secure-field"]?.toggle?.color?.idle).toBeDefined();
    expect(parsed.comp.chips?.comp?.["segmented-control"]?.item?.surface?.selected).toBeDefined();
    expect(parsed.comp.chips?.comp?.["combo-box"]?.option?.surface?.highlighted).toBeDefined();
    expect(parsed.comp.chips?.comp?.["number-input"]?.root?.border?.error).toBeDefined();
    expect(parsed.comp.chips?.comp?.stepper?.increment?.surface?.active).toBeDefined();
    expect(parsed.comp.chips?.comp?.slider?.thumb?.surface?.active).toBeDefined();
  });
});
