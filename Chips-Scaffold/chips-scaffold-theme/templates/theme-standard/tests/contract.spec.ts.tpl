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

const flattenLayer = (layer: Record<string, unknown>): Record<string, unknown> => {
  const flat: Record<string, unknown> = {};
  const walk = (node: unknown, pathParts: string[]): void => {
    if (!isRecord(node)) {
      const key = pathParts.join(".");
      flat[key] = node;
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      walk(v, [...pathParts, k]);
    }
  };
  walk(layer, []);
  return flat;
};

describe("theme contract", () => {
  it("provides required component tokens for button", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const tokensPath = path.join(projectRoot, "dist", "tokens.json");
    const raw = await fs.readFile(tokensPath, "utf-8");
    const parsed = JSON.parse(raw) as ThemeTokenLayers;

    const compFlat = flattenLayer(parsed.comp);

    expect("chips.comp.button.background" in compFlat).toBe(true);
    expect("chips.comp.button.color" in compFlat).toBe(true);
  });
});

