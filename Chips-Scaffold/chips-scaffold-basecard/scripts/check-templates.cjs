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
      path.join("src", "shared", "i18n.ts.tpl"),
      path.join("tests", "unit", "schema.test.ts.tpl"),
    ];
    for (const fileName of required) {
      if (!fs.existsSync(path.join(dir, fileName))) {
        throw new Error(`模板 ${templateId} 缺少必要文件：${fileName}`);
      }
    }

    const manifest = fs.readFileSync(path.join(dir, "manifest.yaml.tpl"), "utf8");
    if (/ui:\s*\n\s*surface:/.test(manifest)) {
      throw new Error(`模板 ${templateId} 的 card manifest 不应声明 ui.surface。`);
    }
    if (manifest.includes("chips-scaffold-basecard")) {
      throw new Error(`模板 ${templateId} 的 manifest 不应泄露脚手架包名。`);
    }

    const readme = fs.readFileSync(path.join(dir, "README.md.tpl"), "utf8");
    if (readme.includes("chips-scaffold-basecard")) {
      throw new Error(`模板 ${templateId} 的 README 不应泄露脚手架包名。`);
    }

    const indexTs = fs.readFileSync(path.join(dir, "src", "index.ts.tpl"), "utf8");
    for (const requiredText of [
      "openResource?:",
      "importArchiveBundle?:",
      "convertTiffToPng?:",
      "collectResourcePaths",
      'previewPointerEvents: "native"',
    ]) {
      if (!indexTs.includes(requiredText)) {
        throw new Error(`模板 ${templateId} 入口契约缺少：${requiredText}`);
      }
    }

    const schemaTs = fs.readFileSync(path.join(dir, "src", "schema", "card-config.ts.tpl"), "utf8");
    for (const requiredText of [
      "resource_path?: string",
      "isCardRootResourcePath",
      "collectBasecardResourcePaths",
    ]) {
      if (!schemaTs.includes(requiredText)) {
        throw new Error(`模板 ${templateId} Schema 缺少：${requiredText}`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("templates 检查通过。");
}

main();
