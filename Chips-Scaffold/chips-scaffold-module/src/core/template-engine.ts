import * as path from "node:path";
import { promises as fs } from "node:fs";
import {
  CreateModuleProjectOptions,
  CreateModuleProjectResult,
  ModuleScaffoldTemplateMeta,
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
  ".svg",
]);

export async function loadTemplateMeta(
  templateId: string
): Promise<ModuleScaffoldTemplateMeta> {
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

  const meta = parsed as ModuleScaffoldTemplateMeta;
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

export async function listAvailableTemplates(): Promise<ModuleScaffoldTemplateMeta[]> {
  const entries = await fs.readdir(TEMPLATE_ROOT, { withFileTypes: true });
  const templates: ModuleScaffoldTemplateMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      templates.push(await loadTemplateMeta(entry.name));
    } catch {
      // 跳过无效模板
    }
  }

  return templates;
}

function assertSafeTemplateId(templateId: string, field: string): void {
  if (
    templateId.trim().length === 0 ||
    templateId.includes("/") ||
    templateId.includes("\\") ||
    templateId.includes("..")
  ) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板元数据包含非法 ${field}：${templateId}`,
      { templateId, field }
    );
  }
}

async function collectTemplateChain(
  templateId: string,
  visited = new Set<string>()
): Promise<Array<{ meta: ModuleScaffoldTemplateMeta; dir: string }>> {
  assertSafeTemplateId(templateId, "id");
  if (visited.has(templateId)) {
    throw createStandardError(
      "TEMPLATE_INVALID",
      `模板继承存在循环引用：${templateId}`,
      { templateId, chain: [...visited] }
    );
  }
  visited.add(templateId);

  const meta = await loadTemplateMeta(templateId);
  const templateDir = path.join(TEMPLATE_ROOT, templateId);
  const templateDirStat = await statPath(templateDir);
  if (!templateDirStat || !templateDirStat.isDirectory()) {
    throw createStandardError(
      "TEMPLATE_NOT_FOUND",
      `找不到模板目录：${templateId}`,
      { templateDir }
    );
  }

  const parentId = meta.extends;
  if (!parentId) {
    return [{ meta, dir: templateDir }];
  }
  assertSafeTemplateId(parentId, "extends");
  const parents = await collectTemplateChain(parentId, visited);
  return [...parents, { meta, dir: templateDir }];
}

function buildTemplateContext(options: CreateModuleProjectOptions): TemplateContext {
  const moduleConsumes = options.moduleConsumes ?? [];
  const moduleConsumesYaml =
    moduleConsumes.length === 0
      ? " []"
      : `\n${moduleConsumes
          .map((item) => {
            const lines = [`    - capability: ${JSON.stringify(item.capability)}`];
            if (item.versionRange) {
              lines.push(`      versionRange: ${JSON.stringify(item.versionRange)}`);
            }
            return lines.join("\n");
          })
          .join("\n")}`;

  return {
    PROJECT_NAME: options.projectName,
    TARGET_DIR: options.targetDir,
    TEMPLATE_ID: options.templateId,
    PLUGIN_ID: options.pluginId,
    MODULE_CAPABILITY: options.moduleCapability,
    MODULE_CONSUMES_YAML: moduleConsumesYaml,
    DISPLAY_NAME: options.displayName,
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

function normalizeTemplatePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function shouldRenderTemplateFile(relativePath: string): boolean {
  return normalizeTemplatePath(relativePath) !== "template.json";
}

export async function renderTemplateToTarget(
  options: CreateModuleProjectOptions
): Promise<CreateModuleProjectResult> {
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
  if (!options.moduleCapability) {
    throw createStandardError("INVALID_ARGUMENT", "模块能力标识不能为空", { options });
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

  const templateChain = await collectTemplateChain(options.templateId);
  const context = buildTemplateContext(options);
  const filesByTarget = new Map<string, { absolutePath: string; sourceRelativePath: string }>();

  for (const item of templateChain) {
    const templateFiles = await listTemplateFiles(item.dir);
    if (templateFiles.length === 0) {
      throw createStandardError(
        "TEMPLATE_INVALID",
        `模板目录为空：${item.meta.id}`,
        { templateDir: item.dir }
      );
    }

    for (const excluded of item.meta.excludeFiles ?? []) {
      filesByTarget.delete(normalizeTemplatePath(excluded));
    }

    for (const file of templateFiles) {
      if (!shouldRenderTemplateFile(file.relativePath)) {
        continue;
      }
      const targetRel = normalizeTemplatePath(targetRelativePath(file.relativePath));
      filesByTarget.set(targetRel, {
        absolutePath: file.absolutePath,
        sourceRelativePath: file.relativePath,
      });
    }
  }

  let filesCreated = 0;
  for (const [targetRel, file] of filesByTarget) {
    const targetPath = path.join(options.targetDir, targetRel);
    if (isTextFile(file.sourceRelativePath)) {
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
