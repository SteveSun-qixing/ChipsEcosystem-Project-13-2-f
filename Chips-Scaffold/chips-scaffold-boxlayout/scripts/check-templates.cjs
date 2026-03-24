#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE_ROOT = path.join(__dirname, "..", "templates");

function main() {
  const templates = fs.readdirSync(TEMPLATE_ROOT, { withFileTypes: true });
  if (templates.length === 0) {
    throw new Error("templates 目录为空，至少需要一个模板。");
  }

  for (const entry of templates) {
    if (!entry.isDirectory()) {
      continue;
    }

    const templateId = entry.name;
    const dir = path.join(TEMPLATE_ROOT, templateId);
    const metaPath = path.join(dir, "template.json");
    if (!fs.existsSync(metaPath)) {
      throw new Error(`模板 ${templateId} 缺少 template.json 元数据文件。`);
    }

    const required = [
      "manifest.yaml.tpl",
      "package.json.tpl",
      ".eslintrc.cjs.tpl",
      "tsconfig.json.tpl",
      "chips.config.mjs.tpl",
      "vitest.config.mts.tpl",
      path.join("src", "index.ts.tpl"),
      path.join("src", "view", "page.tsx.tpl"),
      path.join("src", "editor", "panel.tsx.tpl"),
      path.join("src", "schema", "layout-config.ts.tpl"),
      path.join("src", "shared", "i18n.ts.tpl"),
      path.join("tests", "unit", "schema.test.ts.tpl"),
      path.join("tests", "unit", "layout-definition.test.tsx.tpl"),
    ];

    for (const fileName of required) {
      if (!fs.existsSync(path.join(dir, fileName))) {
        throw new Error(`模板 ${templateId} 缺少必要文件：${fileName}`);
      }
    }
  }

  console.log("templates 检查通过。");
}

main();
