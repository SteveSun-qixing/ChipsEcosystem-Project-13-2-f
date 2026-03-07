import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  listTemplateMetas,
  createAppProjectInternal,
} from "../src/core/template-engine.js";
import type { CreateAppProjectOptions } from "../src/core/types.js";

test("listTemplateMetas 应返回至少一个模板（app-standard）", async () => {
  const metas = await listTemplateMetas();
  assert.ok(Array.isArray(metas));
  const standard = metas.find((m) => m.id === "app-standard");
  assert.ok(standard, "应包含 id 为 app-standard 的模板");
});

test("createAppProjectInternal 可在临时目录生成完整工程骨架", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "chips-app-scaffold-"));
  const targetDir = path.join(tmpRoot, "my-app");

  const options: CreateAppProjectOptions = {
    projectName: "my-app",
    targetDir,
    templateId: "app-standard",
    pluginId: "com.example.my-app",
    displayName: "示例应用插件",
    version: "0.1.0",
    authorName: "Scaffold Tester",
    authorEmail: "tester@example.com",
  };

  try {
    const result = await createAppProjectInternal(options);
    assert.equal(result.projectDir, targetDir);
    assert.equal(result.templateId, "app-standard");
    assert.ok(result.filesCreated > 0);

    const manifestPath = path.join(targetDir, "manifest.yaml");
    const pkgPath = path.join(targetDir, "package.json");
    const indexHtmlPath = path.join(targetDir, "index.html");

    await stat(manifestPath);
    await stat(pkgPath);
    await stat(indexHtmlPath);

    const manifestContent = await readFile(manifestPath, "utf8");
    assert.ok(
      manifestContent.includes("type: app"),
      "manifest.yaml 应声明 type: app",
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

