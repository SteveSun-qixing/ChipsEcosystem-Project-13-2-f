#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chips-module-scaffold-e2e-")
  );
  const targetDir = path.join(tmpRoot, "module-standard-project");
  const { renderTemplateToTarget } = require("../dist/src/core/template-engine");

  try {
    await renderTemplateToTarget({
      projectName: "module-standard-project",
      targetDir,
      templateId: "module-standard",
      pluginId: "chips.module.standard-project",
      moduleCapability: "module.standard.project",
      displayName: "Standard Module Plugin",
      version: "0.1.0",
      authorName: "Scaffold",
      authorEmail: "dev@example.com",
    });

    for (const fileName of [
      "manifest.yaml",
      "README.md",
      "src/index.ts",
      "contracts/run.input.schema.json",
      "tests/unit/module-definition.test.ts"
    ]) {
      if (!fs.existsSync(path.join(targetDir, fileName))) {
        throw new Error(`E2E: 生成工程缺少 ${fileName}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log("E2E: 模块脚手架生成工程自检通过。");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("E2E: 生成工程失败", error);
  process.exitCode = 1;
});
