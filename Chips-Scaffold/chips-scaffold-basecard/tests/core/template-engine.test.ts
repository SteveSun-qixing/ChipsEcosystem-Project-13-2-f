import { describe, it, expect } from "vitest";
import os from "node:os";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  listAvailableTemplates,
  renderTemplateToTarget,
} from "../../src/core/template-engine";
import type {
  BasecardScaffoldTemplateMeta,
  CreateBasecardProjectOptions,
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
    // 忽略清理错误
  }
}

describe("template-engine", () => {
  it("lists available templates", async () => {
    const templates = await listAvailableTemplates();
    const ids = templates.map((t: BasecardScaffoldTemplateMeta) => t.id);
    expect(ids).toContain("card-standard");
  });

  it("renders card-standard template to target directory", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "chips-basecard-scaffold-test-")
    );
    const targetDir = path.join(tempRoot, "card-standard-project");

    try {
      const options: CreateBasecardProjectOptions = {
        projectName: "card-standard-project",
        targetDir,
        templateId: "card-standard",
        pluginId: "com.example.card-standard",
        cardType: "base.text",
        displayName: "Standard Basecard Plugin",
        version: "0.1.0",
        authorName: "Scaffold",
        authorEmail: "dev@example.com",
      };

      const result = await renderTemplateToTarget(options);
      expect(result.projectDir).toBe(targetDir);
      expect(result.templateId).toBe("card-standard");
      expect(result.filesCreated).toBeGreaterThan(0);

      const manifest = await fs.readFile(
        path.join(targetDir, "manifest.yaml"),
        "utf8"
      );
      const pkg = JSON.parse(
        await fs.readFile(path.join(targetDir, "package.json"), "utf8")
      );
      expect(manifest).toMatch(/type:\s+card/);
      expect(manifest).toMatch(/runtime:\n  targets:\n    desktop:\n      supported:\s+true/);
      expect(manifest).toMatch(/headless:\n      supported:\s+true/);
      expect(manifest).toMatch(/capabilities:/);
      await expect(fs.stat(path.join(targetDir, ".eslintrc.cjs"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "src", "shared", "i18n.ts"))).resolves.toBeTruthy();
      await expect(fs.stat(path.join(targetDir, "tests", "unit", "schema.test.ts"))).resolves.toBeTruthy();
      expect(pkg.dependencies.react).toBe("^18.2.0");
      expect(pkg.dependencies["react-dom"]).toBe("^18.2.0");
      expect(pkg.devDependencies["@types/react"]).toBe("^18.2.66");
      expect(pkg.devDependencies.eslint).toBe("^8.57.1");
      expect(pkg.devDependencies["@typescript-eslint/parser"]).toBe("^7.18.0");
      expect(pkg.devDependencies["chips-sdk"]).toBe("^0.1.0");

      const readme = await fs.readFile(
        path.join(targetDir, "README.md"),
        "utf8"
      );
      const indexTs = await fs.readFile(
        path.join(targetDir, "src", "index.ts"),
        "utf8"
      );
      expect(readme).toMatch(/Standard Basecard Plugin/);
      expect(readme).toMatch(/basecardDefinition/);
      expect(indexTs).toMatch(/export const basecardDefinition/);
      expect(indexTs).toMatch(/export function renderBasecardView/);
      expect(indexTs).toMatch(/export function renderBasecardEditor/);
      expect(indexTs).toMatch(/cardType:\s*"base\.text"/);
      expect(indexTs).toMatch(/pluginId:\s*"com\.example\.card-standard"/);

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
