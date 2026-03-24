import { promises as fs, Stats } from "node:fs";
import * as path from "node:path";
import { createStandardError } from "./errors";
import type { TemplateFileInfo } from "./types";

export async function ensureDirectory(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法创建目录：${dir}`, { error });
  }
}

export async function statPath(targetPath: string): Promise<Stats | null> {
  try {
    return await fs.stat(targetPath);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return null;
    }
    throw createStandardError("FS_ERROR", `无法访问路径：${targetPath}`, { error });
  }
}

export async function listTemplateFiles(rootDir: string): Promise<TemplateFileInfo[]> {
  const results: TemplateFileInfo[] = [];
  const SKIP_DIR_NAMES = new Set(["归档"]);

  async function walk(currentDir: string): Promise<void> {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        await walk(absolutePath);
        continue;
      }
      if (entry.isFile()) {
        const stats = await fs.stat(absolutePath);
        const relativePath = path.relative(rootDir, absolutePath);
        results.push({ absolutePath, relativePath, stats });
      }
    }
  }

  await walk(rootDir);
  return results;
}

export async function readTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法读取文件：${filePath}`, { error });
  }
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  try {
    await fs.writeFile(filePath, content, "utf8");
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法写入文件：${filePath}`, { error });
  }
}

export async function copyBinaryFile(sourcePath: string, targetPath: string): Promise<void> {
  await ensureDirectory(path.dirname(targetPath));
  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法复制文件到：${targetPath}`, { error });
  }
}
