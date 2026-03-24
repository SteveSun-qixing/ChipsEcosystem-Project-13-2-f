import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  BoxlayoutScaffoldTemplateMeta,
  CreateBoxlayoutProjectOptions,
  CreateBoxlayoutProjectResult,
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
    path.join(__dirname, "..", "..", "templates"),
    path.join(__dirname, "..", "..", "..", "templates"),
    path.join(process.cwd(), "templates"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = require("node:fs").statSync(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // ignore missing candidates
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
  ".svg",
]);

export async function loadTemplateMeta(
  templateId: string
): Promise<BoxlayoutScaffoldTemplateMeta> {
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

  const meta = parsed as BoxlayoutScaffoldTemplateMeta;
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

export async function listAvailableTemplates(): Promise<BoxlayoutScaffoldTemplateMeta[]> {
  const entries = await fs.readdir(TEMPLATE_ROOT, { withFileTypes: true });
  const templates: BoxlayoutScaffoldTemplateMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      templates.push(await loadTemplateMeta(entry.name));
    } catch {
      // ignore invalid template dirs
    }
  }

  return templates;
}

function buildTemplateContext(options: CreateBoxlayoutProjectOptions): TemplateContext {
  return {
    PROJECT_NAME: options.projectName,
    TARGET_DIR: options.targetDir,
    TEMPLATE_ID: options.templateId,
    PLUGIN_ID: options.pluginId,
    LAYOUT_TYPE: options.layoutType,
    DISPLAY_NAME: options.displayName,
    DESCRIPTION: options.description,
    VERSION: options.version,
    AUTHOR_NAME: options.authorName,
    AUTHOR_EMAIL: options.authorEmail,
  };
}

function isTextFile(relativePath: string): boolean {
  const ext = path.extname(relativePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ext === ".tpl";
}

function renderTemplateContent(content: string, context: TemplateContext): string {
  return content.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_match, variableName) => {
    const key = variableName as keyof TemplateContext;
    const value = context[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function targetRelativePath(relativePath: string): string {
  return relativePath.endsWith(".tpl") ? relativePath.slice(0, -4) : relativePath;
}

export async function renderTemplateToTarget(
  options: CreateBoxlayoutProjectOptions
): Promise<CreateBoxlayoutProjectResult> {
  if (!options.projectName || !options.targetDir || !options.templateId) {
    throw createStandardError(
      "INVALID_ARGUMENT",
      "创建工程参数不完整：projectName、targetDir、templateId 不能为空",
      { options }
    );
  }
  if (!options.pluginId) {
    throw createStandardError("INVALID_ARGUMENT", "插件 ID 不能为空", { options });
  }
  if (!options.layoutType) {
    throw createStandardError("INVALID_ARGUMENT", "布局类型标识不能为空", { options });
  }
  if (!options.description) {
    throw createStandardError("INVALID_ARGUMENT", "布局描述不能为空", { options });
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

  const templateFiles = await listTemplateFiles(templateDir);
  if (templateFiles.length === 0) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板目录为空：${options.templateId}`,
      { templateDir }
    );
  }

  const context = buildTemplateContext(options);
  let filesCreated = 0;

  for (const file of templateFiles) {
    if (file.relativePath === "template.json") {
      continue;
    }
    const targetPath = path.join(options.targetDir, targetRelativePath(file.relativePath));
    if (isTextFile(file.relativePath)) {
      const content = await readTextFile(file.absolutePath);
      await writeTextFile(targetPath, renderTemplateContent(content, context));
    } else {
      await copyBinaryFile(file.absolutePath, targetPath);
    }
    filesCreated += 1;
  }

  return {
    projectDir: options.targetDir,
    templateId: options.templateId,
    filesCreated,
  };
}
