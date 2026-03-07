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
exports.ensureDirectory = ensureDirectory;
exports.statPath = statPath;
exports.listTemplateFiles = listTemplateFiles;
exports.readTextFile = readTextFile;
exports.writeTextFile = writeTextFile;
exports.copyBinaryFile = copyBinaryFile;
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const errors_1 = require("./errors");
async function ensureDirectory(dir) {
    try {
        await node_fs_1.promises.mkdir(dir, { recursive: true });
    }
    catch (error) {
        throw (0, errors_1.createStandardError)("FS_ERROR", `无法创建目录：${dir}`, { error });
    }
}
async function statPath(p) {
    try {
        return await node_fs_1.promises.stat(p);
    }
    catch (error) {
        if (error && typeof error === "object" && error.code === "ENOENT") {
            return null;
        }
        throw (0, errors_1.createStandardError)("FS_ERROR", `无法访问路径：${p}`, { error });
    }
}
async function listTemplateFiles(rootDir) {
    const results = [];
    async function walk(currentDir) {
        const entries = await node_fs_1.promises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(absolutePath);
            }
            else if (entry.isFile()) {
                const stats = await node_fs_1.promises.stat(absolutePath);
                const relativePath = path.relative(rootDir, absolutePath);
                results.push({ absolutePath, relativePath, stats });
            }
        }
    }
    await walk(rootDir);
    return results;
}
async function readTextFile(filePath) {
    try {
        return await node_fs_1.promises.readFile(filePath, "utf8");
    }
    catch (error) {
        throw (0, errors_1.createStandardError)("FS_ERROR", `无法读取文件：${filePath}`, { error });
    }
}
async function writeTextFile(filePath, content) {
    const dir = path.dirname(filePath);
    await ensureDirectory(dir);
    try {
        await node_fs_1.promises.writeFile(filePath, content, "utf8");
    }
    catch (error) {
        throw (0, errors_1.createStandardError)("FS_ERROR", `无法写入文件：${filePath}`, { error });
    }
}
async function copyBinaryFile(sourcePath, targetPath) {
    const dir = path.dirname(targetPath);
    await ensureDirectory(dir);
    try {
        await node_fs_1.promises.copyFile(sourcePath, targetPath);
    }
    catch (error) {
        throw (0, errors_1.createStandardError)("FS_ERROR", `无法复制文件到：${targetPath}`, {
            error,
        });
    }
}
