import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const run = (cmd: string, cwd: string): void => {
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, CI: "true" } });
};

describe("theme build pipeline", () => {
  it("runs build script without errors", () => {
    const projectRoot = path.resolve(__dirname, "..");
    // 这里假定依赖已安装，脚本在 CI 或本地开发环境中执行。
    run("npm run build", projectRoot);
    expect(true).toBe(true);
  });

  it("emits runtime icon fonts into dist and injects font-face declarations", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const themeCss = await fs.readFile(path.join(projectRoot, "dist", "theme.css"), "utf-8");

    expect(themeCss).toContain("Material Symbols Outlined");
    expect(themeCss).toContain('data-scope="text"');
    expect(themeCss).toContain('data-scope="label"');
    expect(themeCss).toContain('data-scope="icon-button"');
    expect(themeCss).toContain('data-scope="badge"');
    expect(themeCss).toContain('data-scope="progress"');
    expect(themeCss).toContain('data-scope="text-field"');
    expect(themeCss).toContain('data-scope="text-area"');
    expect(themeCss).toContain('data-scope="search-field"');
    expect(themeCss).toContain('data-scope="secure-field"');
    expect(themeCss).toContain('data-scope="segmented-control"');
    expect(themeCss).toContain('data-scope="combo-box"');
    expect(themeCss).toContain('data-scope="number-input"');
    expect(themeCss).toContain('data-scope="stepper"');
    expect(themeCss).toContain('data-scope="slider"');
    expect(themeCss).toContain('data-scope="date-picker"');
    expect(themeCss).toContain('data-scope="time-picker"');
    expect(themeCss).toContain('data-scope="image"');
    expect(themeCss).toContain('data-scope="media"');
    expect(themeCss).toContain('data-scope="error-state"');
    expect(themeCss).toContain("--chips-comp-date-picker-cell-surface-selected");
    expect(themeCss).toContain("--chips-comp-time-picker-option-surface-selected");
    expect(themeCss).toContain("--chips-comp-image-fallback-surface");
    expect(themeCss).toContain("--chips-comp-media-control-surface-idle");
    expect(themeCss).toContain("--chips-comp-error-state-status-color-error");
    expect(themeCss).toContain("--chips-comp-icon-root-color");
    expect(themeCss).toContain('data-scope="view"');
    expect(themeCss).toContain('data-scope="split-view"');
    expect(themeCss).toContain("var(--chips-layout-size-grid-min-item");
    await expect(
      fs.access(path.join(projectRoot, "dist", "icons", "variablefont", "MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectRoot, "dist", "icons", "variablefont", "MaterialSymbolsRounded[FILL,GRAD,opsz,wght].woff2"))
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(projectRoot, "dist", "icons", "variablefont", "MaterialSymbolsSharp[FILL,GRAD,opsz,wght].woff2"))
    ).resolves.toBeUndefined();
  });
});
