import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

export interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  compressionMethod: number;
}

export interface RealMaterialArchive {
  filePath: string;
  buffer: Buffer;
  entries: ZipEntry[];
  entryMap: Map<string, ZipEntry>;
  readText(entryName: string): string;
  readYaml<TValue = Record<string, unknown>>(entryName: string): TValue;
}

const helperDir = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(helperDir, "..", "..");
export const testingSpaceRoot = path.join(workspaceRoot, "ProductFinishedProductTestingSpace");

export const toMaterialPath = (relativePath: string): string => path.join(testingSpaceRoot, relativePath);

export const toPosixPath = (filePath: string): string => filePath.split(path.sep).join("/");

export const assertExistingMaterialPath = async (relativePath: string): Promise<string> => {
  const filePath = toMaterialPath(relativePath);
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`Expected ProductFinishedProductTestingSpace material to be a file: ${relativePath}`);
  }
  return filePath;
};

export const assertExistingMaterialDirectory = async (relativePath: string): Promise<string> => {
  const dirPath = toMaterialPath(relativePath);
  const stat = await fs.stat(dirPath);
  if (!stat.isDirectory()) {
    throw new Error(`Expected ProductFinishedProductTestingSpace material to be a directory: ${relativePath}`);
  }
  return dirPath;
};

export const readMaterialText = async (relativePath: string): Promise<string> => {
  return fs.readFile(await assertExistingMaterialPath(relativePath), "utf-8");
};

export const createOfficialHtmlIntermediateFixture = async (
  relativeDirectory: string,
  targetName: string,
  manifest: Record<string, unknown>,
): Promise<string> => {
  const sourceDir = await assertExistingMaterialDirectory(relativeDirectory);
  const outputDir = path.join(os.tmpdir(), "chips-task05604-html-intermediate", targetName);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.cp(sourceDir, outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "conversion-manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
  return outputDir;
};

export const toHostFileStat = (stat: Awaited<ReturnType<typeof fs.stat>>) => ({
  isFile: stat.isFile(),
  isDirectory: stat.isDirectory(),
  size: stat.size,
  mtimeMs: stat.mtimeMs,
});

export const statHostPath = async (filePath: string) => {
  try {
    return toHostFileStat(await fs.stat(filePath));
  } catch {
    return undefined;
  }
};

export const fileUrlForPath = (filePath: string, trailingSlash = false): string => {
  const normalizedPath = trailingSlash ? `${filePath.replace(/[\\/]+$/u, "")}${path.sep}` : filePath;
  return pathToFileURL(normalizedPath).href;
};

const readUInt16 = (buffer: Buffer, offset: number): number => buffer.readUInt16LE(offset);

const readUInt32 = (buffer: Buffer, offset: number): number => buffer.readUInt32LE(offset);

const findEndOfCentralDirectory = (buffer: Buffer): number => {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("ZIP end of central directory was not found.");
};

export const parseZipEntries = (buffer: Buffer): ZipEntry[] => {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at offset ${offset}.`);
    }

    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
    });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

export const readStoredEntryBytes = (buffer: Buffer, entry: ZipEntry): Buffer => {
  if (entry.compressionMethod !== 0) {
    throw new Error(`ZIP entry ${entry.name} is not stored with method 0.`);
  }

  const offset = entry.localHeaderOffset;
  if (readUInt32(buffer, offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.name}.`);
  }

  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  return buffer.subarray(dataOffset, dataOffset + entry.uncompressedSize);
};

export const readStoreZipArchive = async (relativePath: string): Promise<RealMaterialArchive> => {
  const filePath = await assertExistingMaterialPath(relativePath);
  const buffer = await fs.readFile(filePath);
  const entries = parseZipEntries(buffer);
  const entryMap = new Map(entries.map((entry) => [entry.name, entry]));

  const readText = (entryName: string): string => {
    const entry = entryMap.get(entryName);
    if (!entry) {
      throw new Error(`Missing ZIP entry in ${relativePath}: ${entryName}`);
    }
    return readStoredEntryBytes(buffer, entry).toString("utf-8");
  };

  return {
    filePath,
    buffer,
    entries,
    entryMap,
    readText,
    readYaml<TValue = Record<string, unknown>>(entryName: string): TValue {
      return parseYaml(readText(entryName)) as TValue;
    },
  };
};

export const zipFileEntries = (archive: RealMaterialArchive): ZipEntry[] => {
  return archive.entries.filter((entry) => !entry.name.endsWith("/"));
};
