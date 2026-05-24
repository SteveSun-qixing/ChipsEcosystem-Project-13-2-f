#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const TEMPLATE_ROOT = path.join(__dirname, "..", "templates");
const FORBIDDEN_TEMPLATE_PATTERNS = [
  { pattern: /TODO|FIXME/, label: "TODO/FIXME" },
  { pattern: /mountModule/, label: "旧模块挂载入口 mountModule" },
  { pattern: /ctx\.services/, label: "旧 Host service wrapper ctx.services" },
  { pattern: /ui\.surface/, label: "模块模板不应声明 ui.surface" },
  { pattern: /runtime\.tsx/, label: "旧 UI runtime.tsx" },
  { pattern: /\bchips dev\b/i, label: "旧 chips dev 命令" }
];

const FORBIDDEN_OUTPUT_PATTERNS = [
  ...FORBIDDEN_TEMPLATE_PATTERNS,
  { pattern: /\{\{\s*[A-Z0-9_]+\s*\}\}/, label: "未渲染模板占位符" },
  { pattern: /template\.json/, label: "template.json 泄漏到生成产物" }
];

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".yaml",
  ".yml",
  ".md",
  ".html",
  ".css",
  ".mjs",
  ".cjs",
  ".txt",
  ".svg",
  ".tpl"
]);

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "归档") {
          stack.push(fullPath);
        }
        continue;
      }
      if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function assertSafeTemplateId(templateId, field) {
  if (!templateId || templateId.includes("/") || templateId.includes("\\") || templateId.includes("..")) {
    throw new Error(`模板 ${field} 非法：${templateId}`);
  }
}

function readTemplateMeta(templateId) {
  assertSafeTemplateId(templateId, "id");
  const dir = path.join(TEMPLATE_ROOT, templateId);
  const metaPath = path.join(dir, "template.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`模板 ${templateId} 缺少 template.json 元数据文件。`);
  }

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch (error) {
    throw new Error(`模板 ${templateId} 的 template.json 不是有效 JSON：${error.message}`);
  }

  if (meta.id !== templateId) {
    throw new Error(`模板 ${templateId} 的 template.json id 不匹配。`);
  }
  if (!meta.name || !meta.description || !meta.version) {
    throw new Error(`模板 ${templateId} 缺少 name/description/version。`);
  }
  if (meta.extends) {
    assertSafeTemplateId(meta.extends, "extends");
    const parentMetaPath = path.join(TEMPLATE_ROOT, meta.extends, "template.json");
    if (!fs.existsSync(parentMetaPath)) {
      throw new Error(`模板 ${templateId} 继承的父模板不存在：${meta.extends}`);
    }
  }
  if (meta.excludeFiles && !Array.isArray(meta.excludeFiles)) {
    throw new Error(`模板 ${templateId} 的 excludeFiles 必须是数组。`);
  }

  return meta;
}

function assertTemplateTextClean(templateId, dir) {
  for (const filePath of walkFiles(dir)) {
    if (!isTextFile(filePath)) {
      continue;
    }
    const relativePath = path.relative(dir, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf-8");
    if (relativePath === "template.json") {
      continue;
    }
    for (const item of FORBIDDEN_TEMPLATE_PATTERNS) {
      if (item.pattern.test(content)) {
        throw new Error(`模板 ${templateId} 文件 ${relativePath} 包含禁用内容：${item.label}`);
      }
    }
  }
}

function assertRenderedOutputClean(templateId, targetDir) {
  for (const filePath of walkFiles(targetDir)) {
    if (!isTextFile(filePath)) {
      continue;
    }
    const relativePath = path.relative(targetDir, filePath).split(path.sep).join("/");
    const content = fs.readFileSync(filePath, "utf-8");
    for (const item of FORBIDDEN_OUTPUT_PATTERNS) {
      if (item.pattern.test(content)) {
        throw new Error(`模板 ${templateId} 生成文件 ${relativePath} 包含禁用内容：${item.label}`);
      }
    }
  }
}

async function main() {
  const templates = fs.readdirSync(TEMPLATE_ROOT, { withFileTypes: true });
  if (templates.length === 0) {
    throw new Error("templates 目录为空，至少需要一个模板。");
  }

  const { renderTemplateToTarget } = require("../dist/src/core/template-engine");
  const tempRoot = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "chips-module-template-check-"));
  const templateIds = [];

  for (const entry of templates) {
    if (!entry.isDirectory()) {
      continue;
    }

    const templateId = entry.name;
    const dir = path.join(TEMPLATE_ROOT, templateId);
    const meta = readTemplateMeta(templateId);
    templateIds.push(templateId);

    const required = [
      "README.md.tpl",
      "manifest.yaml.tpl",
      "src/index.ts.tpl",
      "tests/unit/module-definition.test.ts.tpl"
    ];

    if (!meta.extends) {
      required.push(
        ".eslintrc.cjs.tpl",
        "chips.config.mjs.tpl",
        "package.json.tpl",
        "tsconfig.json.tpl",
        "vitest.config.mts.tpl"
      );
    }

    for (const fileName of required) {
      if (!fs.existsSync(path.join(dir, fileName))) {
        throw new Error(`模板 ${templateId} 缺少必要文件：${fileName}`);
      }
    }

    assertTemplateTextClean(templateId, dir);

    const targetDir = path.join(tempRoot, templateId);
    await renderTemplateToTarget({
      projectName: `${templateId}-project`,
      targetDir,
      templateId,
      pluginId: `chips.module.${templateId.replace(/^module-/, "").replace(/-/g, ".")}`,
      moduleCapability: `module.${templateId.replace(/^module-/, "").replace(/-/g, ".")}`,
      moduleConsumes:
        templateId === "module-orchestration"
          ? [{ capability: "module.example.step", versionRange: "^1.0.0" }]
          : [],
      displayName: `${templateId} Project`,
      version: "0.1.0",
      authorName: "Scaffold",
      authorEmail: "dev@example.com"
    });

    if (fs.existsSync(path.join(targetDir, "template.json"))) {
      throw new Error(`模板 ${templateId} 生成产物不应包含 template.json。`);
    }
    assertRenderedOutputClean(templateId, targetDir);
  }

  fs.rmSync(tempRoot, { recursive: true, force: true });

  for (const expected of [
    "module-standard",
    "module-pure-function",
    "module-file-conversion",
    "module-html-rendering",
    "module-image-processing",
    "module-color-extraction",
    "module-orchestration"
  ]) {
    if (!templateIds.includes(expected)) {
      throw new Error(`缺少模块模板：${expected}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log("templates 检查通过。");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
