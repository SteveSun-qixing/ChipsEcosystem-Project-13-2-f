#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE_ROOT = path.join(__dirname, "..", "templates");

const TEXT_TEMPLATE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

function collectFiles(dir, predicate) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(entryPath, predicate));
      continue;
    }
    if (entry.isFile() && predicate(entryPath)) {
      files.push(entryPath);
    }
  }
  return files;
}

function isTextTemplateFile(filePath) {
  if (path.basename(filePath) === "template.json") {
    return true;
  }
  if (!filePath.endsWith(".tpl")) {
    return false;
  }
  const withoutTemplateExt = filePath.slice(0, -4);
  return TEXT_TEMPLATE_EXTENSIONS.has(path.extname(withoutTemplateExt).toLowerCase());
}

function isRuntimeSourceTemplate(filePath) {
  return /[/\\]src[/\\].*\.(?:ts|tsx|js|jsx|mjs|cjs)\.tpl$/.test(filePath);
}

function assertNotMatches(templateId, filePath, source, checks) {
  const relativePath = path.relative(path.join(TEMPLATE_ROOT, templateId), filePath);
  for (const { pattern, message } of checks) {
    if (pattern.test(source)) {
      throw new Error(`模板 ${templateId} 的 ${relativePath} ${message}：${pattern}`);
    }
  }
}

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
      "vitest.config.mts.tpl",
      "chips.config.mjs.tpl",
      "README.md.tpl",
      path.join("src", "shared", "i18n.ts.tpl"),
      path.join("tests", "unit", "render-view.test.tsx.tpl"),
      path.join("tests", "unit", "editor-panel.test.tsx.tpl"),
      path.join("tests", "unit", "schema.test.ts.tpl"),
      path.join("tests", "integration", "card-flow.test.ts.tpl"),
    ];
    for (const fileName of required) {
      if (!fs.existsSync(path.join(dir, fileName))) {
        throw new Error(`模板 ${templateId} 缺少必要文件：${fileName}`);
      }
    }

    const textTemplateFiles = collectFiles(dir, isTextTemplateFile);
    for (const filePath of textTemplateFiles) {
      const source = fs.readFileSync(filePath, "utf8");
      assertNotMatches(templateId, filePath, source, [
        { pattern: /\b(?:TODO|FIXME)\b/i, message: "不应包含未收口标记" },
        { pattern: /\bchips dev\b/, message: "不应包含旧 chips dev 命令写法" },
        { pattern: /chips-scaffold-basecard/, message: "不应泄露脚手架包名" },
        { pattern: /占位实现|临时实现|最小可用结构/, message: "不应包含临时或占位实现描述" },
      ]);
    }

    const runtimeSourceText = collectFiles(dir, isRuntimeSourceTemplate)
      .map((filePath) => fs.readFileSync(filePath, "utf8"))
      .join("\n");
    for (const [pattern, message] of [
      [/#[0-9A-Fa-f]{3,8}\b/, "运行时源码不应包含硬编码颜色"],
      [/\bbox-shadow\s*:/, "运行时源码不应包含硬编码阴影"],
      [/\bradial-gradient\s*\(/, "运行时源码不应包含硬编码渐变"],
      [/\brgba\s*\(/, "运行时源码不应包含硬编码 rgba 颜色"],
      [/\bbackground(?:-color)?\s*:\s*#/, "运行时源码不应包含硬编码背景色"],
      [/\bcolor\s*:\s*#/, "运行时源码不应包含硬编码文本色"],
      [/\b(?:localStorage|indexedDB)\b/, "运行时源码不应直接使用浏览器持久化存储"],
      [/\b(?:file:\/\/|blob:|data:image)\b/, "运行时源码不应持久化运行时 URL"],
      [/\b(?:readFile|writeFile|readdir)\b/, "运行时源码不应直接执行文件系统读写"],
      [/\bfrom\s+["'](?:node:)?fs["']|\brequire\(["'](?:node:)?fs["']\)/, "运行时源码不应直接引入 fs"],
      [/window\.chips\.invoke/, "运行时源码不应绕过 SDK/正式上下文直连 Bridge"],
      [/>[^<{]*[\u4e00-\u9fff][^<{]*</, "运行时源码不应硬编码中文用户文案"],
    ]) {
      if (pattern.test(runtimeSourceText)) {
        throw new Error(`模板 ${templateId} ${message}：${pattern}`);
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
    for (const scriptName of ["lint", "typecheck", "test", "build", "validate", "package", "verify"]) {
      if (typeof packageJson.scripts?.[scriptName] !== "string") {
        throw new Error(`模板 ${templateId} package.json.tpl 缺少脚本：${scriptName}`);
      }
    }
    for (const requiredCommand of [
      "npm run lint",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm run validate",
      "npm run package",
    ]) {
      if (!packageJson.scripts.verify.includes(requiredCommand)) {
        throw new Error(`模板 ${templateId} verify 脚本缺少：${requiredCommand}`);
      }
    }

    const vitestConfig = fs.readFileSync(path.join(dir, "vitest.config.mts.tpl"), "utf8");
    for (const requiredText of ["react/jsx-runtime", "react-dom/client", "dedupe: [\"react\", \"react-dom\"]"]) {
      if (!vitestConfig.includes(requiredText)) {
        throw new Error(`模板 ${templateId} vitest.config.mts.tpl 缺少 React 去重配置：${requiredText}`);
      }
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
    for (const requiredText of ["resolveResourceUrl", "releaseResourceUrl", "openResource"]) {
      if (!renderView.includes(requiredText)) {
        throw new Error(`模板 ${templateId} 查看态缺少资源桥样板：${requiredText}`);
      }
    }
    for (const requiredText of ["importResource", "deleteResource", "resource_path"]) {
      if (!editorPanel.includes(requiredText)) {
        throw new Error(`模板 ${templateId} 编辑态缺少资源桥样板：${requiredText}`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("templates 检查通过。");
}

main();
