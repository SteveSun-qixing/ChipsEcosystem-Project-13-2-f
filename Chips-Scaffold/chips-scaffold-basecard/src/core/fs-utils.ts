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

export async function statPath(p: string): Promise<Stats | null> {
  try {
    return await fs.stat(p);
  } catch (error: any) {
    if (error && typeof error === "object" && (error as any).code === "ENOENT") {
      return null;
    }
    throw createStandardError("FS_ERROR", `无法访问路径：${p}`, { error });
  }
}

export async function listTemplateFiles(
  rootDir: string
): Promise<TemplateFileInfo[]> {
  const results: TemplateFileInfo[] = [];
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
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

export async function writeTextFile(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectory(dir);
  try {
    await fs.writeFile(filePath, content, "utf8");
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法写入文件：${filePath}`, { error });
  }
}

export async function copyBinaryFile(
  sourcePath: string,
  targetPath: string
): Promise<void> {
  const dir = path.dirname(targetPath);
  await ensureDirectory(dir);
  try {
    await fs.copyFile(sourcePath, targetPath);
  } catch (error) {
    throw createStandardError("FS_ERROR", `无法复制文件到：${targetPath}`, {
      error,
    });
  }
}

