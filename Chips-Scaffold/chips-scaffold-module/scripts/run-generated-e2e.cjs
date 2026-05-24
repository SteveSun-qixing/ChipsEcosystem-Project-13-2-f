#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function main() {
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chips-module-scaffold-e2e-")
  );
  const { renderTemplateToTarget } = require("../dist/src/core/template-engine");
  const templates = [
    {
      id: "module-standard",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/run.input.schema.json",
        "contracts/runAsync.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-pure-function",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/run.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-file-conversion",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/convert.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-html-rendering",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/convert.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-image-processing",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/process.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-color-extraction",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/pick.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ]
    },
    {
      id: "module-orchestration",
      files: [
        "manifest.yaml",
        "README.md",
        "src/index.ts",
        "contracts/execute.input.schema.json",
        "tests/unit/module-definition.test.ts"
      ],
      moduleConsumes: [{ capability: "module.example.step", versionRange: "^1.0.0" }]
    }
  ];

  try {
    for (const template of templates) {
      const targetDir = path.join(tmpRoot, `${template.id}-project`);
      await renderTemplateToTarget({
        projectName: `${template.id}-project`,
        targetDir,
        templateId: template.id,
        pluginId: `chips.module.${template.id.replace(/^module-/, "").replace(/-/g, ".")}`,
        moduleCapability: `module.${template.id.replace(/^module-/, "").replace(/-/g, ".")}`,
        moduleConsumes: template.moduleConsumes ?? [],
        displayName: `${template.id} Module Plugin`,
        version: "0.1.0",
        authorName: "Scaffold",
        authorEmail: "dev@example.com",
      });

      for (const fileName of template.files) {
        if (!fs.existsSync(path.join(targetDir, fileName))) {
          throw new Error(`E2E: 模板 ${template.id} 生成工程缺少 ${fileName}`);
        }
      }
      if (fs.existsSync(path.join(targetDir, "template.json"))) {
        throw new Error(`E2E: 模板 ${template.id} 不应生成 template.json`);
      }
    }

    // eslint-disable-next-line no-console
    console.log("E2E: 模块脚手架模板矩阵生成工程自检通过。");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("E2E: 生成工程失败", error);
  process.exitCode = 1;
});
