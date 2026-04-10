import { describe, expect, it } from "vitest";
import os from "node:os";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  listAvailableTemplates,
  renderTemplateToTarget,
} from "../../src/core/template-engine";
import type {
  CreateModuleProjectOptions,
  ModuleScaffoldTemplateMeta,
} from "../../src/core/types";

const FORBIDDEN_PROJECT_DIRS = [
  "需求文档",
  "技术文档",
  "技术手册",
  "开发计划",
];

async function removeDirIfExists(targetDir: string): Promise<void> {
  try {
    await fs.rm(targetDir, { recursive: true, force: true });
  } catch {
    // 忽略清理错误
  }
}

describe("module template-engine", () => {
  it("lists available templates", async () => {
    const templates = await listAvailableTemplates();
    const ids = templates.map((item: ModuleScaffoldTemplateMeta) => item.id);
    expect(ids).toContain("module-standard");
  });

  it("renders module-standard template to target directory", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "chips-module-scaffold-test-")
    );
    const targetDir = path.join(tempRoot, "module-standard-project");

    try {
      const options: CreateModuleProjectOptions = {
        projectName: "module-standard-project",
        targetDir,
        templateId: "module-standard",
        pluginId: "chips.module.standard-project",
        moduleCapability: "module.standard.project",
        displayName: "Standard Module Plugin",
        version: "0.1.0",
        authorName: "Scaffold",
        authorEmail: "dev@example.com",
      };

      const result = await renderTemplateToTarget(options);
      expect(result.projectDir).toBe(targetDir);
      expect(result.templateId).toBe("module-standard");
      expect(result.filesCreated).toBeGreaterThan(0);

      const manifest = await fs.readFile(path.join(targetDir, "manifest.yaml"), "utf8");
      const pkg = JSON.parse(await fs.readFile(path.join(targetDir, "package.json"), "utf8"));
      const moduleDefinitionTest = await fs.readFile(
        path.join(targetDir, "tests", "unit", "module-definition.test.ts"),
        "utf8"
      );

      expect(manifest).toMatch(/type:\s+module/);
      expect(manifest).toMatch(/entry:\s+dist\/index\.mjs/);
      expect(manifest).toMatch(/runtime:\n  targets:\n    desktop:\n      supported:\s+true/);
      expect(manifest).toMatch(/headless:\n      supported:\s+true/);
      expect(manifest).toMatch(/module:\n/);
      expect(manifest).toMatch(/capability:\s+module\.standard\.project/);
      expect(pkg.devDependencies.react).toBeUndefined();
      expect(pkg.devDependencies["chips-sdk"]).toBe("^0.1.0");
      expect(moduleDefinitionTest).toMatch(/runAsync/);
      expect(moduleDefinitionTest).not.toMatch(/mountModule/);

      const readme = await fs.readFile(path.join(targetDir, "README.md"), "utf8");
      expect(readme).toMatch(/Standard Module Plugin/);
      expect(readme).toMatch(/安装到 Host 中的无界面能力模块/);

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
