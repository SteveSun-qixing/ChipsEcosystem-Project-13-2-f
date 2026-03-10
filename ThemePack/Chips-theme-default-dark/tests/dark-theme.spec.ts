import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dark theme baseline", () => {
  it("declares the dark theme identity in manifest", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const manifestRaw = await fs.readFile(path.join(projectRoot, "manifest.yaml"), "utf-8");

    expect(manifestRaw).toContain('id: "theme.theme.chips-official-default-dark-theme"');
    expect(manifestRaw).toContain('themeId: "chips-official.default-dark-theme"');
    expect(manifestRaw).toContain('isDefault: false');
  });

  it("emits a dark color-scheme baseline and dark canvas tokens", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const cssRaw = await fs.readFile(path.join(projectRoot, "dist", "theme.css"), "utf-8");
    const tokensRaw = await fs.readFile(path.join(projectRoot, "dist", "tokens.json"), "utf-8");
    const tokens = JSON.parse(tokensRaw) as {
      ref: { chips?: { ref?: { color?: Record<string, string> } } };
      sys: { chips?: { sys?: { color?: Record<string, string> } } };
    };

    expect(cssRaw).toContain('color-scheme: dark;');
    expect(cssRaw).toContain('--chips-base-shadow-color');
    expect(tokens.ref.chips?.ref?.color?.['gray-950']).toBe('#0b0f16');
    expect(tokens.sys.chips?.sys?.color?.canvas).toBe('{chips.ref.color.gray-950}');
    expect(tokens.sys.chips?.sys?.color?.primary).toBe('{chips.ref.color.blue-600}');
  });
});
