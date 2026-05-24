import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "../..");

function readProjectFile(relativePath: string) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("应用插件预览与质量脚本 smoke", () => {
  it("应生成完整 verify 脚本与预览 smoke 校验入口", () => {
    const pkg = JSON.parse(readProjectFile("package.json"));
    expect(pkg.scripts.typecheck).toBe("tsc -p tsconfig.json --noEmit");
    expect(pkg.scripts["preview:smoke"]).toContain("chipsdev preview --mode mock --target app");
    expect(pkg.scripts["quality:gate"]).toContain("chipsdev quality gate");
    expect(pkg.scripts.verify).toContain("npm run preview:smoke");
    expect(pkg.scripts.verify).toContain("npm run quality:gate");
  });

  it("应保持 manifest、预览脚本与源码身份干净", () => {
    const manifest = readProjectFile("manifest.yaml");
    const previewSmoke = readProjectFile("src/preview/preview-smoke.js");
    const sourceBundle = [
      readProjectFile("src/App.tsx"),
      readProjectFile("src/app/AppRoot.tsx"),
      readProjectFile("src/app/AppRuntimeProvider.tsx"),
      readProjectFile("src/app/AppShell.tsx"),
      readProjectFile("src/app/scene-registry.ts"),
      readProjectFile("src/i18n/locales.ts"),
    ].join("\n");

    expect(manifest).toContain("type: app");
    expect(manifest).not.toMatch(/^commands\s*:/m);
    expect(previewSmoke).toContain("chipsdev.preview");
    expect(previewSmoke).toContain("manifest.runtimeTargets");
    expect(previewSmoke).toContain("manifest.surface");
    const forbiddenIdentityPattern = new RegExp([
      "app-" + "standard",
      "chips-" + "scaffold-app",
      "Example" + "Panel",
    ].join("|"));
    expect(sourceBundle).not.toMatch(forbiddenIdentityPattern);
    expect(sourceBundle).not.toContain("style={{");
  });
});
