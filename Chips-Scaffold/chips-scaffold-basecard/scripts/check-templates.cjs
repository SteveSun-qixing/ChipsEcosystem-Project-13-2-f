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
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (meta.supports?.componentLibrary !== true) {
      throw new Error(`模板 ${templateId} 必须声明支持组件库。`);
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
    if (!readme.includes("@chips/component-library")) {
      throw new Error(`模板 ${templateId} 的 README 必须说明组件库接入。`);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(dir, "package.json.tpl"), "utf8"));
    if (packageJson.dependencies?.["@chips/component-library"] !== "^0.1.0") {
      throw new Error(`模板 ${templateId} 必须依赖 @chips/component-library 正式 semver。`);
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

    const renderView = fs.readFileSync(path.join(dir, "src", "render", "view.tsx.tpl"), "utf8");
    const editorPanel = fs.readFileSync(path.join(dir, "src", "editor", "panel.tsx.tpl"), "utf8");
    for (const [fileName, source] of [
      ["src/render/view.tsx.tpl", renderView],
      ["src/editor/panel.tsx.tpl", editorPanel],
    ]) {
      for (const forbiddenText of [
        "chips-basecard__surface",
        "box-shadow",
        "radial-gradient",
        "rgba(",
      ]) {
        if (source.includes(forbiddenText)) {
          throw new Error(`模板 ${templateId} 的 ${fileName} 不应包含私有视觉值：${forbiddenText}`);
        }
      }
    }
    if (!renderView.includes("@chips/component-library")) {
      throw new Error(`模板 ${templateId} 查看态必须消费 @chips/component-library。`);
    }
    for (const requiredText of ["ChipsForm", "ChipsTextField", "ChipsTextArea", "ChipsErrorState"]) {
      if (!editorPanel.includes(requiredText)) {
        throw new Error(`模板 ${templateId} 编辑态缺少组件库控件：${requiredText}`);
      }
    }
    for (const forbiddenText of ["<input", "<textarea", "chips-basecard-editor__input"]) {
      if (editorPanel.includes(forbiddenText)) {
        throw new Error(`模板 ${templateId} 编辑态不应保留原生控件样板：${forbiddenText}`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("templates 检查通过。");
}

main();
