import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  BasecardScaffoldTemplateMeta,
  CreateBasecardProjectOptions,
  CreateBasecardProjectResult,
  TemplateContext,
} from "./types";
import { createStandardError } from "./errors";
import {
  copyBinaryFile,
  listTemplateFiles,
  readTextFile,
  statPath,
  writeTextFile,
} from "./fs-utils";

function resolveTemplateRoot(): string {
  const candidates = [
    // 源码执行（vitest 直接跑 src）
    path.join(__dirname, "..", "..", "templates"),
    // 编译产物执行（dist/src/core）
    path.join(__dirname, "..", "..", "..", "templates"),
    // 工作区根目录
    path.join(process.cwd(), "templates"),
  ];
  for (const candidate of candidates) {
    try {
      const stat = require("node:fs").statSync(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // 忽略不存在的候选路径
    }
  }
  throw createStandardError(
    "TEMPLATE_NOT_FOUND",
    "无法解析模板根目录，templates 目录不存在。",
    { candidates }
  );
}

const TEMPLATE_ROOT = resolveTemplateRoot();

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
]);

export async function loadTemplateMeta(
  templateId: string
): Promise<BasecardScaffoldTemplateMeta> {
  const metaPath = path.join(TEMPLATE_ROOT, templateId, "template.json");
  const stat = await statPath(metaPath);
  if (!stat || !stat.isFile()) {
    throw createStandardError(
      "TEMPLATE_NOT_FOUND",
      `模板不存在或缺少元数据文件：${templateId}`,
      { templateId, metaPath }
    );
  }
  const raw = await readTextFile(metaPath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板元数据不是有效的 JSON：${templateId}`,
      { error, metaPath }
    );
  }
  const meta = parsed as BasecardScaffoldTemplateMeta;
  if (!meta.id || meta.id !== templateId) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板元数据缺少正确的 id 字段：${templateId}`,
      { meta }
    );
  }
  if (!meta.name || !meta.version) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板元数据缺少必要字段：${templateId}`,
      { meta }
    );
  }
  return meta;
}

export async function listAvailableTemplates(): Promise<
  BasecardScaffoldTemplateMeta[]
> {
  const entries = await fs.readdir(TEMPLATE_ROOT, { withFileTypes: true });
  const templates: BasecardScaffoldTemplateMeta[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const templateId = entry.name;
    try {
      const meta = await loadTemplateMeta(templateId);
      templates.push(meta);
    } catch {
      // 跳过无效模板，详细错误由调用者在按需加载时处理
    }
  }
  return templates;
}

function buildTemplateContext(
  options: CreateBasecardProjectOptions
): TemplateContext {
  return {
    PROJECT_NAME: options.projectName,
    TARGET_DIR: options.targetDir,
    TEMPLATE_ID: options.templateId,
    PLUGIN_ID: options.pluginId,
    CARD_TYPE: options.cardType,
    DISPLAY_NAME: options.displayName,
    VERSION: options.version,
    AUTHOR_NAME: options.authorName,
    AUTHOR_EMAIL: options.authorEmail,
  };
}

function isTextFile(relativePath: string): boolean {
  const ext = path.extname(relativePath).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  // .tpl 视为文本
  if (ext === ".tpl") {
    return true;
  }
  return false;
}

function renderTemplateContent(
  content: string,
  context: TemplateContext
): string {
  let result = content;
  const pattern = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
  result = result.replace(pattern, (match, variableName) => {
    const key = variableName as keyof TemplateContext;
    const value = context[key];
    if (value === undefined || value === null) {
      return "";
    }
    return String(value);
  });
  return result;
}

function targetRelativePath(relativePath: string): string {
  if (relativePath.endsWith(".tpl")) {
    return relativePath.slice(0, -4);
  }
  return relativePath;
}

export async function renderTemplateToTarget(
  options: CreateBasecardProjectOptions
): Promise<CreateBasecardProjectResult> {
  if (!options.projectName || !options.targetDir || !options.templateId) {
    throw createStandardError(
      "INVALID_ARGUMENT",
      "创建工程参数不完整：projectName、targetDir、templateId 不能为空",
      { options }
    );
  }
  if (!options.pluginId) {
    throw createStandardError(
      "INVALID_ARGUMENT",
      "插件 ID 不能为空",
      { options }
    );
  }
  if (!options.cardType) {
    throw createStandardError(
      "INVALID_ARGUMENT",
      "基础卡片类型标识不能为空",
      { options }
    );
  }

  const existing = await statPath(options.targetDir);
  if (existing && existing.isDirectory()) {
    const files = await fs.readdir(options.targetDir);
    if (files.length > 0) {
      throw createStandardError(
        "TARGET_DIR_EXISTS",
        `目标目录已存在且非空：${options.targetDir}`,
        { targetDir: options.targetDir }
      );
    }
  }

  const templateDir = path.join(TEMPLATE_ROOT, options.templateId);
  const templateDirStat = await statPath(templateDir);
  if (!templateDirStat || !templateDirStat.isDirectory()) {
    throw createStandardError(
      "TEMPLATE_NOT_FOUND",
      `找不到模板目录：${options.templateId}`,
      { templateDir }
    );
  }

  const context = buildTemplateContext(options);
  const templateFiles = await listTemplateFiles(templateDir);
  if (templateFiles.length === 0) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板目录为空：${options.templateId}`,
      { templateDir }
    );
  }

  let filesCreated = 0;
  for (const file of templateFiles) {
    const rel = file.relativePath;
    const targetRel = targetRelativePath(rel);
    const targetPath = path.join(options.targetDir, targetRel);

    if (isTextFile(rel)) {
      const content = await readTextFile(file.absolutePath);
      const rendered = renderTemplateContent(content, context);
      await writeTextFile(targetPath, rendered);
      filesCreated += 1;
    } else {
      await copyBinaryFile(file.absolutePath, targetPath);
      filesCreated += 1;
    }
  }

  return {
    projectDir: options.targetDir,
    templateId: options.templateId,
    filesCreated,
  };
}
