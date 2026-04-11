import { describe, expect, it } from "vitest";
import os from "node:os";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  listAvailableTemplates,
  renderTemplateToTarget,
} from "../../src/core/template-engine";
import type {
  BoxlayoutScaffoldTemplateMeta,
  CreateBoxlayoutProjectOptions,
} from "../../src/core/types";

const FORBIDDEN_PROJECT_DIRS = [
  "需求文档",
  "技术文档",
  "技术手册",
  "开发计划",
];

async function removeDirIfExists(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

describe("template-engine", () => {
  it("lists available templates", async () => {
    const templates = await listAvailableTemplates();
    const ids = templates.map((t: BoxlayoutScaffoldTemplateMeta) => t.id);
    expect(ids).toContain("boxlayout-standard");
  });

  it("renders boxlayout-standard template to target directory", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "chips-boxlayout-scaffold-test-")
    );
    const targetDir = path.join(tempRoot, "boxlayout-standard-project");

    try {
      const options: CreateBoxlayoutProjectOptions = {
        projectName: "boxlayout-standard-project",
        targetDir,
        templateId: "boxlayout-standard",
        pluginId: "chips.layout.boxlayout-standard",
        layoutType: "chips.layout.grid",
        displayName: "Standard Box Layout Plugin",
        description: "标准布局插件模板生成工程。",
        version: "0.1.0",
        authorName: "Scaffold",
        authorEmail: "dev@example.com",
      };

      const result = await renderTemplateToTarget(options);
      expect(result.projectDir).toBe(targetDir);
      expect(result.templateId).toBe("boxlayout-standard");
      expect(result.filesCreated).toBeGreaterThan(0);

      const manifest = await fs.readFile(path.join(targetDir, "manifest.yaml"), "utf8");
      const pkg = JSON.parse(await fs.readFile(path.join(targetDir, "package.json"), "utf8"));
      expect(manifest).toMatch(/type:\s+layout/);
      expect(manifest).toMatch(/runtime:\n  targets:\n    desktop:\n      supported:\s+true/);
      expect(manifest).toMatch(/headless:\n      supported:\s+true/);
      expect(manifest).toMatch(/layout:/);
      expect(manifest).toMatch(/layoutType:\s+chips\.layout\.grid/);
      expect(manifest).toMatch(/displayName:\s+Standard Box Layout Plugin/);
      await expect(fs.stat(path.join(targetDir, ".eslintrc.cjs"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "src", "index.ts"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "src", "view", "page.tsx"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "src", "editor", "panel.tsx"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "tests", "unit", "schema.test.ts"))).resolves.toBeTruthy();
      expect(pkg.dependencies.react).toBe("^18.2.0");
      expect(pkg.devDependencies["chips-sdk"]).toBe("^0.1.0");
      await expect(fs.stat(path.join(targetDir, "template.json"))).rejects.toMatchObject({
        code: "ENOENT",
      });

      const indexTs = await fs.readFile(path.join(targetDir, "src", "index.ts"), "utf8");
      expect(indexTs).toMatch(/export const layoutDefinition/);
      expect(indexTs).toMatch(/layoutType:\s*"chips\.layout\.grid"/);
      expect(indexTs).toMatch(/pluginId:\s*"chips\.layout\.boxlayout-standard"/);

      const readme = await fs.readFile(path.join(targetDir, "README.md"), "utf8");
      expect(readme).toMatch(/Standard Box Layout Plugin/);
      expect(readme).toMatch(/layoutDefinition/);

      for (const dirName of FORBIDDEN_PROJECT_DIRS) {
        await expect(fs.stat(path.join(targetDir, dirName))).rejects.toMatchObject({
          code: "ENOENT",
        });
      }
    } finally {
      await removeDirIfExists(tempRoot);
    }
  });
});
