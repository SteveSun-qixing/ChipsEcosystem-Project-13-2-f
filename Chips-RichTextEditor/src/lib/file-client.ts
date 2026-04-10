import type { Client, FileEntry, FileListOptions, FileStat } from "chips-sdk";
import { dirname } from "./path";

function unwrap<T>(value: unknown, key: string): T {
  if (value && typeof value === "object" && key in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>)[key] as T;
  }
  return value as T;
}

export async function readTextFile(client: Client, path: string): Promise<string> {
  const result = await client.file.read(path, { encoding: "utf-8" });
  const content = unwrap<string>(result, "content");
  if (typeof content !== "string") {
    throw new Error(`Expected text content at ${path}`);
  }
  return content;
}

export async function writeTextFile(client: Client, path: string, content: string): Promise<void> {
  await client.file.write(path, content, { encoding: "utf-8" });
}

export async function writeBinaryFile(client: Client, path: string, content: Uint8Array): Promise<void> {
  await client.file.write(path, content, { encoding: "binary" });
}

export async function deletePath(client: Client, path: string, options?: { recursive?: boolean }): Promise<void> {
  await client.file.delete(path, options);
}

export async function copyPath(client: Client, sourcePath: string, destPath: string): Promise<void> {
  await client.file.copy(sourcePath, destPath);
}

export async function movePath(client: Client, sourcePath: string, destPath: string): Promise<void> {
  await client.file.move(sourcePath, destPath);
}

export async function listFiles(client: Client, dir: string, options?: FileListOptions): Promise<FileEntry[]> {
  const result = await client.file.list(dir, options);
  const entries = unwrap<FileEntry[]>(result, "entries");
  return Array.isArray(entries) ? entries : [];
}

export async function statFile(client: Client, path: string): Promise<FileStat> {
  const result = await client.file.stat(path);
  return unwrap<FileStat>(result, "meta");
}

export async function pathExists(client: Client, path: string): Promise<boolean> {
  try {
    await statFile(client, path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureDirRecursive(client: Client, path: string): Promise<void> {
  const normalized = path.replace(/\\/g, "/").trim();
  if (!normalized) {
    return;
  }

  const isAbsolute = normalized.startsWith("/");
  const drivePrefix = /^[A-Za-z]:/.test(normalized) ? normalized.slice(0, 2) : "";
  const segments = normalized
    .replace(/^[A-Za-z]:/, "")
    .split("/")
    .filter((segment) => segment.length > 0);

  let current = drivePrefix ? `${drivePrefix}/` : isAbsolute ? "/" : "";
  for (const segment of segments) {
    current = current === "/" ? `/${segment}` : current ? `${current.replace(/\/$/, "")}/${segment}` : segment;
    if (await pathExists(client, current)) {
      continue;
    }
    await client.file.mkdir(current);
  }
}

export async function ensureParentDir(client: Client, path: string): Promise<void> {
  const parent = dirname(path);
  if (!parent) {
    return;
  }
  await ensureDirRecursive(client, parent);
}
