import type { Client } from "chips-sdk";
import yaml from "yaml";
import {
  buildCompositeRichTextCardFiles,
  collectCompositeRichTextResourcePaths,
  parseCompositeRichTextCard,
  type CompositeCardResourceManifestEntry,
  type RichTextCompositeCardDocument,
} from "./card-document";
import {
  copyPath,
  deletePath,
  ensureDirRecursive,
  ensureParentDir,
  listFiles,
  movePath,
  pathExists,
  readTextFile,
  statFile,
  writeBinaryFile,
  writeTextFile,
} from "./file-client";
import { createSessionRuntimePaths, joinPath, type SessionRuntimePaths } from "./path";

export interface PendingResourceImport {
  path: string;
  data: Uint8Array;
  mimeType?: string;
}

export interface OpenRichTextCompositeCardResult {
  targetFilePath: string;
  runtimePaths: SessionRuntimePaths;
  document: RichTextCompositeCardDocument;
}

export interface SaveRichTextCompositeCardResult {
  targetFilePath: string;
  runtimePaths: SessionRuntimePaths;
  document: RichTextCompositeCardDocument;
  cardFile: string;
}

function guessMimeType(resourcePath: string): string {
  const normalized = resourcePath.toLowerCase();
  if (normalized.endsWith(".md")) {
    return "text/markdown";
  }
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }
  if (normalized.endsWith(".json")) {
    return "application/json";
  }
  if (normalized.endsWith(".txt")) {
    return "text/plain";
  }
  return "application/octet-stream";
}

async function buildResourceManifest(
  client: Client,
  cardRootDir: string,
): Promise<CompositeCardResourceManifestEntry[]> {
  const entries = await listFiles(client, cardRootDir, { recursive: true });
  const resources: CompositeCardResourceManifestEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const normalizedPath = entry.path.replace(/\\/g, "/");
    const relativePath = normalizedPath.startsWith(`${cardRootDir}/`)
      ? normalizedPath.slice(cardRootDir.length + 1)
      : normalizedPath;

    if (!relativePath || relativePath.startsWith(".card/") || relativePath.startsWith("content/")) {
      continue;
    }

    const fileStat = await statFile(client, entry.path);
    resources.push({
      path: relativePath,
      size: fileStat.size,
      type: guessMimeType(relativePath),
    });
  }

  resources.sort((left, right) => left.path.localeCompare(right.path));
  return resources;
}

async function writeReferencedResources(
  client: Client,
  cardRootDir: string,
  resourcePaths: string[],
  pendingImports: Record<string, PendingResourceImport>,
  sourceWorkDir?: string | null,
): Promise<void> {
  for (const resourcePath of resourcePaths) {
    const targetPath = joinPath(cardRootDir, resourcePath);
    const pendingImport = pendingImports[resourcePath];

    await ensureParentDir(client, targetPath);

    if (pendingImport) {
      await writeBinaryFile(client, targetPath, pendingImport.data);
      continue;
    }

    if (sourceWorkDir) {
      const sourcePath = joinPath(sourceWorkDir, resourcePath);
      if (await pathExists(client, sourcePath)) {
        await copyPath(client, sourcePath, targetPath);
        continue;
      }
    }

    throw new Error(`Missing referenced resource: ${resourcePath}`);
  }
}

export async function cleanupRuntimeSession(
  client: Client,
  runtimePaths: SessionRuntimePaths | null | undefined,
): Promise<void> {
  if (!runtimePaths) {
    return;
  }

  if (await pathExists(client, runtimePaths.runtimeDir)) {
    await deletePath(client, runtimePaths.runtimeDir, { recursive: true });
  }
}

export async function openRichTextCompositeCard(
  client: Client,
  targetFilePath: string,
  sessionId: string,
): Promise<OpenRichTextCompositeCardResult> {
  const runtimePaths = createSessionRuntimePaths(targetFilePath, sessionId);

  try {
    await cleanupRuntimeSession(client, runtimePaths);
    await ensureDirRecursive(client, runtimePaths.runtimeRoot);
    await client.card.unpack(targetFilePath, runtimePaths.workDir);

    const metadataYaml = await readTextFile(client, joinPath(runtimePaths.workDir, ".card", "metadata.yaml"));
    const structureYaml = await readTextFile(client, joinPath(runtimePaths.workDir, ".card", "structure.yaml"));
    const structure = yaml.parse(structureYaml) as { structure?: Array<{ id?: unknown }> } | null;
    const baseCardId = Array.isArray(structure?.structure) && typeof structure.structure[0]?.id === "string"
      ? structure.structure[0].id
      : "";
    if (!baseCardId) {
      throw new Error("The composite card structure is missing the rich text base card node.");
    }

    const parsed = parseCompositeRichTextCard({
      metadataYaml,
      structureYaml,
      contentYaml: await readTextFile(client, joinPath(runtimePaths.workDir, "content", `${baseCardId}.yaml`)),
    });

    return {
      targetFilePath,
      runtimePaths,
      document: parsed,
    };
  } catch (error) {
    await cleanupRuntimeSession(client, runtimePaths).catch(() => undefined);
    throw error;
  }
}

export async function saveRichTextCompositeCard(
  client: Client,
  input: {
    targetFilePath: string;
    sessionId: string;
    document: RichTextCompositeCardDocument;
    pendingImports: Record<string, PendingResourceImport>;
    sourceRuntimePaths?: SessionRuntimePaths | null;
  },
): Promise<SaveRichTextCompositeCardResult> {
  const runtimePaths = createSessionRuntimePaths(input.targetFilePath, input.sessionId);
  const stageDir = joinPath(runtimePaths.runtimeDir, `card-stage-${Date.now().toString(36)}`);
  const sourceWorkDir = input.sourceRuntimePaths?.workDir ?? null;
  const nextDocument: RichTextCompositeCardDocument = {
    ...input.document,
    modifiedAt: new Date().toISOString(),
  };

  try {
    if (await pathExists(client, stageDir)) {
      await deletePath(client, stageDir, { recursive: true });
    }

    await ensureDirRecursive(client, joinPath(stageDir, ".card"));
    await ensureDirRecursive(client, joinPath(stageDir, "content"));

    const resourcePaths = collectCompositeRichTextResourcePaths(nextDocument);
    await writeReferencedResources(client, stageDir, resourcePaths, input.pendingImports, sourceWorkDir);

    const emptyBuild = buildCompositeRichTextCardFiles(nextDocument, []);
    await writeTextFile(client, joinPath(stageDir, ".card", "metadata.yaml"), emptyBuild.metadataYaml);
    await writeTextFile(client, joinPath(stageDir, ".card", "cover.html"), emptyBuild.coverHtml);
    await writeTextFile(client, joinPath(stageDir, "content", `${nextDocument.baseCardId}.yaml`), emptyBuild.contentYaml);

    const resourceManifest = await buildResourceManifest(client, stageDir);
    const finalBuild = buildCompositeRichTextCardFiles(nextDocument, resourceManifest);
    await writeTextFile(client, joinPath(stageDir, ".card", "structure.yaml"), finalBuild.structureYaml);

    const cardFile = await client.card.pack(stageDir, input.targetFilePath);

    if (await pathExists(client, runtimePaths.workDir)) {
      await deletePath(client, runtimePaths.workDir, { recursive: true });
    }
    await movePath(client, stageDir, runtimePaths.workDir);

    return {
      targetFilePath: input.targetFilePath,
      runtimePaths,
      document: nextDocument,
      cardFile,
    };
  } catch (error) {
    if (await pathExists(client, stageDir)) {
      await deletePath(client, stageDir, { recursive: true }).catch(() => undefined);
    }
    throw error;
  }
}
