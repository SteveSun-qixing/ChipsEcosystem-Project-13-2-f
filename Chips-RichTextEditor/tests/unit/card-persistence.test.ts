import { describe, expect, it } from "vitest";
import yaml from "yaml";
import type { Client, FileEntry, FileStat } from "chips-sdk";
import {
  buildCompositeRichTextCardFiles,
  createEmptyRichTextCardDocument,
  parseCompositeRichTextCard,
} from "../../src/lib/card-document";
import {
  openRichTextCompositeCard,
  saveRichTextCompositeCard,
  type PendingResourceImport,
} from "../../src/lib/card-persistence";
import { collectRichTextResourcePaths, createFileBasecardConfig } from "../../src/lib/richtext-card";

type MemoryEntry = {
  kind: "file";
  content: string | Uint8Array;
} | {
  kind: "dir";
};

function normalizePath(input: string): string {
  return input.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function parentPath(input: string): string {
  const normalized = normalizePath(input);
  if (normalized === "/") {
    return "";
  }
  const slashIndex = normalized.lastIndexOf("/");
  return slashIndex <= 0 ? "/" : normalized.slice(0, slashIndex);
}

function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function cloneContent(content: string | Uint8Array): string | Uint8Array {
  return typeof content === "string" ? content : new Uint8Array(content);
}

function createMemoryClient(): Client {
  const entries = new Map<string, MemoryEntry>();
  const archives = new Map<string, Map<string, string | Uint8Array>>();
  entries.set("/", { kind: "dir" });

  function ensureParentDirs(path: string): void {
    const parent = parentPath(path);
    if (!parent) {
      return;
    }
    const segments = parent.split("/").filter(Boolean);
    let current = parent.startsWith("/") ? "/" : "";
    for (const segment of segments) {
      current = current === "/" ? `/${segment}` : current ? `${current}/${segment}` : segment;
      entries.set(current, { kind: "dir" });
    }
  }

  function writeFile(path: string, content: string | Uint8Array): void {
    const normalized = normalizePath(path);
    ensureParentDirs(normalized);
    entries.set(normalized, {
      kind: "file",
      content: cloneContent(content),
    });
  }

  function copyTree(sourcePath: string, destPath: string): void {
    const source = normalizePath(sourcePath);
    const dest = normalizePath(destPath);
    const sourceEntry = entries.get(source);
    if (!sourceEntry) {
      throw new Error(`Missing source: ${source}`);
    }

    if (sourceEntry.kind === "file") {
      writeFile(dest, sourceEntry.content);
      return;
    }

    entries.set(dest, { kind: "dir" });
    for (const [path, entry] of Array.from(entries.entries())) {
      if (!path.startsWith(`${source}/`)) {
        continue;
      }
      const relativePath = path.slice(source.length + 1);
      const targetPath = joinPath(dest, relativePath);
      if (entry.kind === "dir") {
        entries.set(targetPath, { kind: "dir" });
      } else {
        writeFile(targetPath, entry.content);
      }
    }
  }

  function deleteTree(path: string): void {
    const normalized = normalizePath(path);
    for (const candidate of Array.from(entries.keys())) {
      if (candidate === normalized || candidate.startsWith(`${normalized}/`)) {
        entries.delete(candidate);
      }
    }
  }

  const file = {
    async read(path: string, options?: { encoding?: "utf-8" | "binary" }) {
      const entry = entries.get(normalizePath(path));
      if (!entry || entry.kind !== "file") {
        throw new Error(`Missing file: ${path}`);
      }
      if (options?.encoding === "binary") {
        return typeof entry.content === "string"
          ? new TextEncoder().encode(entry.content)
          : new Uint8Array(entry.content);
      }
      if (typeof entry.content !== "string") {
        return new TextDecoder().decode(entry.content);
      }
      return entry.content;
    },
    async write(path: string, content: string | Uint8Array) {
      writeFile(path, content);
    },
    async stat(path: string): Promise<FileStat> {
      const normalized = normalizePath(path);
      const entry = entries.get(normalized);
      if (!entry) {
        throw new Error(`Missing path: ${normalized}`);
      }
      const size = entry.kind === "dir"
        ? 0
        : typeof entry.content === "string"
          ? new TextEncoder().encode(entry.content).byteLength
          : entry.content.byteLength;
      return {
        path: normalized,
        size,
        isFile: entry.kind === "file",
        isDirectory: entry.kind === "dir",
        mtimeMs: 0,
      };
    },
    async list(dir: string, options?: { recursive?: boolean }): Promise<FileEntry[]> {
      const normalizedDir = normalizePath(dir);
      return Array.from(entries.entries())
        .filter(([path]) => {
          if (path === normalizedDir || !path.startsWith(`${normalizedDir}/`)) {
            return false;
          }
          const relativePath = path.slice(normalizedDir.length + 1);
          return options?.recursive === true || !relativePath.includes("/");
        })
        .map(([path, entry]) => ({
          path,
          isFile: entry.kind === "file",
          isDirectory: entry.kind === "dir",
        }))
        .sort((left, right) => left.path.localeCompare(right.path));
    },
    async mkdir(path: string) {
      const normalized = normalizePath(path);
      ensureParentDirs(normalized);
      entries.set(normalized, { kind: "dir" });
    },
    async delete(path: string) {
      deleteTree(path);
    },
    async move(sourcePath: string, destPath: string) {
      copyTree(sourcePath, destPath);
      deleteTree(sourcePath);
    },
    async copy(sourcePath: string, destPath: string) {
      copyTree(sourcePath, destPath);
    },
    async watch() {
      return null;
    },
  };

  const card = {
    async pack(cardDir: string, outputPath: string): Promise<string> {
      const normalizedDir = normalizePath(cardDir);
      const archive = new Map<string, string | Uint8Array>();
      for (const [path, entry] of entries.entries()) {
        if (entry.kind !== "file" || !path.startsWith(`${normalizedDir}/`)) {
          continue;
        }
        archive.set(path.slice(normalizedDir.length + 1), cloneContent(entry.content));
      }
      archives.set(normalizePath(outputPath), archive);
      return outputPath;
    },
    async unpack(cardFile: string, outputDir: string): Promise<void> {
      const archive = archives.get(normalizePath(cardFile));
      if (!archive) {
        throw new Error(`Missing archive: ${cardFile}`);
      }
      for (const [relativePath, content] of archive.entries()) {
        writeFile(joinPath(outputDir, relativePath), content);
      }
    },
  };

  return {
    file,
    card,
    invoke: async () => ({}),
    events: {
      on: () => () => undefined,
      once: () => () => undefined,
      emit: async () => undefined,
    },
  } as unknown as Client;
}

describe("富文本复合卡片持久化链路", () => {
  it("应当保存后重新打开，并保留 Markdown 资源与 manifest.resources", async () => {
    const client = createMemoryClient();
    const document = createEmptyRichTextCardDocument("a1B2c3D4e5", "f6G7h8I9j0", "长文稿");
    document.config = createFileBasecardConfig("richtext/body.md");
    expect(collectRichTextResourcePaths(document.config)).toEqual(["richtext/body.md"]);
    const pendingImports: Record<string, PendingResourceImport> = {
      "richtext/body.md": {
        path: "richtext/body.md",
        data: new TextEncoder().encode("# 长文稿\n\n".repeat(40)),
        mimeType: "text/markdown",
      },
    };

    const saved = await saveRichTextCompositeCard(client, {
      targetFilePath: "/tmp/rich-text.card",
      sessionId: "session-a",
      document,
      pendingImports,
    });
    expect(
      (await client.file.list(saved.runtimePaths.workDir, { recursive: true })).map((entry) => entry.path),
    ).toContain(`${saved.runtimePaths.workDir}/richtext/body.md`);
    const savedStructureText = await client.file.read(
      `${saved.runtimePaths.workDir}/.card/structure.yaml`,
      { encoding: "utf-8" },
    );
    const savedStructure = yaml.parse(String(savedStructureText)) as {
      manifest?: {
        resource_count?: number;
        resources?: Array<{ path?: string; type?: string }>;
      };
    };
    expect(savedStructure.manifest?.resource_count).toBe(1);
    const opened = await openRichTextCompositeCard(client, saved.targetFilePath, "session-b");
    const structureText = await client.file.read(
      `${opened.runtimePaths.workDir}/.card/structure.yaml`,
      { encoding: "utf-8" },
    );
    const structure = yaml.parse(String(structureText)) as {
      manifest?: {
        resource_count?: number;
        resources?: Array<{ path?: string; type?: string }>;
      };
    };

    expect(opened.document.cardId).toBe("a1B2c3D4e5");
    expect(opened.document.baseCardId).toBe("f6G7h8I9j0");
    expect(opened.document.config.card_type).toBe("base.richtext");
    expect(opened.document.config.content_source).toBe("file");
    expect(opened.document.config.content_file).toBe("richtext/body.md");
    expect(opened.document.config.markdown_capabilities.gfm).toBe(true);
    expect(structure.manifest?.resource_count).toBe(1);
    expect(structure.manifest?.resources?.[0]).toMatchObject({
      path: "richtext/body.md",
      type: "text/markdown",
    });
  });

  it("应当拒绝包含多个基础卡片节点的结构", () => {
    const document = createEmptyRichTextCardDocument("k1L2m3N4o5", "p6Q7r8S9t0", "非法结构");
    const files = buildCompositeRichTextCardFiles(document, []);

    expect(() =>
      parseCompositeRichTextCard({
        metadataYaml: files.metadataYaml,
        structureYaml: yaml.stringify({
        structure: [
          { id: "p6Q7r8S9t0", type: "base.richtext" },
          { id: "u1V2w3X4y5", type: "base.richtext" },
        ],
        manifest: {
          card_count: 2,
          resource_count: 0,
          resources: [],
        },
      }),
        contentYaml: files.contentYaml,
      }),
    ).toThrow(/single-base-card/);
  });
});
