"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTemplateMeta = loadTemplateMeta;
exports.listAvailableTemplates = listAvailableTemplates;
exports.renderTemplateToTarget = renderTemplateToTarget;
const path = __importStar(require("node:path"));
const node_fs_1 = require("node:fs");
const errors_1 = require("./errors");
const fs_utils_1 = require("./fs-utils");
function resolveTemplateRoot() {
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
        }
        catch {
            // 忽略不存在的候选路径
        }
    }
    throw (0, errors_1.createStandardError)("TEMPLATE_NOT_FOUND", "无法解析模板根目录，templates 目录不存在。", { candidates });
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
async function loadTemplateMeta(templateId) {
    const metaPath = path.join(TEMPLATE_ROOT, templateId, "template.json");
    const stat = await (0, fs_utils_1.statPath)(metaPath);
    if (!stat || !stat.isFile()) {
        throw (0, errors_1.createStandardError)("TEMPLATE_NOT_FOUND", `模板不存在或缺少元数据文件：${templateId}`, { templateId, metaPath });
    }
    const raw = await (0, fs_utils_1.readTextFile)(metaPath);
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (error) {
        throw (0, errors_1.createStandardError)("TEMPLATE_INVALID", `模板元数据不是有效的 JSON：${templateId}`, { error, metaPath });
    }
    const meta = parsed;
    if (!meta.id || meta.id !== templateId) {
        throw (0, errors_1.createStandardError)("TEMPLATE_INVALID", `模板元数据缺少正确的 id 字段：${templateId}`, { meta });
    }
    if (!meta.name || !meta.version) {
        throw (0, errors_1.createStandardError)("TEMPLATE_INVALID", `模板元数据缺少必要字段：${templateId}`, { meta });
    }
    return meta;
}
async function listAvailableTemplates() {
    const entries = await node_fs_1.promises.readdir(TEMPLATE_ROOT, { withFileTypes: true });
    const templates = [];
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const templateId = entry.name;
        try {
            const meta = await loadTemplateMeta(templateId);
            templates.push(meta);
        }
        catch {
            // 跳过无效模板，详细错误由调用者在按需加载时处理
        }
    }
    return templates;
}
function buildTemplateContext(options) {
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
function isTextFile(relativePath) {
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
function renderTemplateContent(content, context) {
    let result = content;
    const pattern = /\{\{\s*([A-Z0-9_]+)\s*\}\}/g;
    result = result.replace(pattern, (match, variableName) => {
        const key = variableName;
        const value = context[key];
        if (value === undefined || value === null) {
            return "";
        }
        return String(value);
    });
    return result;
}
function targetRelativePath(relativePath) {
    if (relativePath.endsWith(".tpl")) {
        return relativePath.slice(0, -4);
    }
    return relativePath;
}
async function renderTemplateToTarget(options) {
    if (!options.projectName || !options.targetDir || !options.templateId) {
        throw (0, errors_1.createStandardError)("INVALID_ARGUMENT", "创建工程参数不完整：projectName、targetDir、templateId 不能为空", { options });
    }
    if (!options.pluginId) {
        throw (0, errors_1.createStandardError)("INVALID_ARGUMENT", "插件 ID 不能为空", { options });
    }
    if (!options.cardType) {
        throw (0, errors_1.createStandardError)("INVALID_ARGUMENT", "基础卡片类型标识不能为空", { options });
    }
    const existing = await (0, fs_utils_1.statPath)(options.targetDir);
    if (existing && existing.isDirectory()) {
        const files = await node_fs_1.promises.readdir(options.targetDir);
        if (files.length > 0) {
            throw (0, errors_1.createStandardError)("TARGET_DIR_EXISTS", `目标目录已存在且非空：${options.targetDir}`, { targetDir: options.targetDir });
        }
    }
    const templateDir = path.join(TEMPLATE_ROOT, options.templateId);
    const templateDirStat = await (0, fs_utils_1.statPath)(templateDir);
    if (!templateDirStat || !templateDirStat.isDirectory()) {
        throw (0, errors_1.createStandardError)("TEMPLATE_NOT_FOUND", `找不到模板目录：${options.templateId}`, { templateDir });
    }
    const context = buildTemplateContext(options);
    const templateFiles = await (0, fs_utils_1.listTemplateFiles)(templateDir);
    if (templateFiles.length === 0) {
        throw (0, errors_1.createStandardError)("TEMPLATE_INVALID", `模板目录为空：${options.templateId}`, { templateDir });
    }
    let filesCreated = 0;
    for (const file of templateFiles) {
        const rel = file.relativePath;
        const targetRel = targetRelativePath(rel);
        const targetPath = path.join(options.targetDir, targetRel);
        if (isTextFile(rel)) {
            const content = await (0, fs_utils_1.readTextFile)(file.absolutePath);
            const rendered = renderTemplateContent(content, context);
            await (0, fs_utils_1.writeTextFile)(targetPath, rendered);
            filesCreated += 1;
        }
        else {
            await (0, fs_utils_1.copyBinaryFile)(file.absolutePath, targetPath);
            filesCreated += 1;
        }
    }
    return {
        projectDir: options.targetDir,
        templateId: options.templateId,
        filesCreated,
    };
}
