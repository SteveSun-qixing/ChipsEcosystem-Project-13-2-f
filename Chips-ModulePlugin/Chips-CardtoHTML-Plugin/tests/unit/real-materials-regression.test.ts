import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { CardToHtmlContext } from "../../src/types";
import {
  fileUrlForPath,
  readStoreZipArchive,
  statHostPath,
  toMaterialPath,
  toPosixPath,
  zipFileEntries,
} from "../../../tests/real-materials";

type HostWrite = {
  path: string;
  content: string;
};

const escapeSrcdoc = (html: string): string => {
  return html
    .replace(/&/gu, "&amp;")
    .replace(/"/gu, "&quot;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;");
};

const createContext = (
  writes: HostWrite[],
  copiedFiles: Array<{ sourcePath: string; destPath: string }>,
): CardToHtmlContext => {
  const invoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    if (action === "file.stat") {
      return { meta: await statHostPath(String(payload?.path ?? "")) };
    }

    if (action === "file.mkdir") {
      return { ack: true };
    }

    if (action === "file.write") {
      writes.push({
        path: String(payload?.path ?? ""),
        content: String(payload?.content ?? ""),
      });
      return { ack: true };
    }

    if (action === "file.copy") {
      copiedFiles.push({
        sourcePath: String(payload?.sourcePath ?? ""),
        destPath: String(payload?.destPath ?? ""),
      });
      return { ack: true };
    }

    if (action === "file.delete") {
      return { ack: true };
    }

    if (action === "card.releaseRenderSession") {
      return { ack: true };
    }

    throw new Error(`Unexpected host action: ${action}`);
  }) as unknown as CardToHtmlContext["host"]["invoke"];

  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    host: {
      invoke,
    },
    job: {
      id: "job-card-to-html-real-material",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(false),
    },
  };
};

describe("card to html real finished materials", () => {
  it("uses Host card.render output and rewrites a real rich text card asset tree into a formal HTML directory", async () => {
    const archive = await readStoreZipArchive("富文本基础卡片.card");
    const cardFile = archive.filePath;
    const metadata = archive.readYaml<{ name: string }>(".card/metadata.yaml");
    const structure = archive.readYaml<{
      structure: Array<{ id: string; type: string }>;
      manifest: { resources: Array<{ path: string; type: string }> };
    }>(".card/structure.yaml");
    const richText = archive.readYaml<{ content_text: string }>("content/magrpV5bWu.yaml");
    const image = archive.readYaml<{ images: Array<{ file_path: string }> }>("content/s2J2SH1yMR.yaml");
    const music = archive.readYaml<{ audio_file: string; album_cover: string }>("content/qIIDkJWai3.yaml");

    expect(metadata.name).toBe("富文本基础卡片");
    expect(structure.structure.map((node) => node.type)).toEqual(["base.richtext", "base.image", "base.music"]);
    expect(structure.manifest.resources.length).toBeGreaterThanOrEqual(13);
    expect(zipFileEntries(archive).every((entry) => entry.compressionMethod === 0)).toBe(true);

    const cardRoot = path.dirname(cardFile);
    const outputDir = path.join(workspaceOutputRoot(), "富文本基础卡片-html");
    const firstImagePath = image.images[0]?.file_path;
    expect(firstImagePath).toBeTruthy();
    expect(archive.entryMap.has(firstImagePath ?? "")).toBe(true);
    expect(archive.entryMap.has(music.audio_file)).toBe(true);
    expect(archive.entryMap.has(music.album_cover)).toBe(true);

    const writes: HostWrite[] = [];
    const copiedFiles: Array<{ sourcePath: string; destPath: string }> = [];
    const ctx = createContext(writes, copiedFiles);
    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    hostInvoke.mockImplementation(async (action: string, payload?: Record<string, unknown>) => {
      if (action === "card.render") {
        expect(payload).toEqual({
          cardFile,
          options: {
            target: "offscreen-render",
            themeId: "chips-official.default-dark-theme",
            locale: "zh-CN",
          },
        });
        const baseHref = fileUrlForPath(cardRoot, true);
        const frameHtml = [
          "<!doctype html>",
          "<html>",
          "<head>",
          `<base href="${baseHref}" />`,
          "</head>",
          "<body>",
          `<article data-real-card="richtext">${richText.content_text}</article>`,
          `<img src="${fileUrlForPath(path.join(cardRoot, firstImagePath ?? ""))}" />`,
          `<audio src="${fileUrlForPath(path.join(cardRoot, music.audio_file))}"></audio>`,
          "</body>",
          "</html>",
        ].join("");
        const escapedFrame = escapeSrcdoc(frameHtml);
        return {
          view: {
            title: metadata.name,
            body: [
              "<!doctype html>",
              "<html>",
              "<body>",
              `<iframe data-node-id=\"${structure.structure[0]?.id}\" srcdoc=\"${escapedFrame}\"></iframe>`,
              "</body>",
              "</html>",
            ].join(""),
            documentUrl: fileUrlForPath(path.join(cardRoot, ".card", "render-session", "index.html")),
            sessionId: "real-richtext-render-session",
            semanticHash: "real-richtext-semantic-hash",
            target: "offscreen-render",
            contentFiles: structure.structure.map((node) => `content/${node.id}.yaml`),
            diagnostics: [{ code: "REAL_MATERIAL_RENDERED", material: "富文本基础卡片.card" }],
            consistency: { status: "passed" },
          },
        };
      }

      if (action === "file.list") {
        expect(payload).toEqual({
          dir: cardRoot,
          options: { recursive: true },
        });
        return {
          entries: zipFileEntries(archive).map((entry) => ({
            path: path.join(cardRoot, entry.name),
            isFile: true,
            isDirectory: false,
          })),
        };
      }

      if (action === "file.stat") {
        return { meta: await statHostPath(String(payload?.path ?? "")) };
      }
      if (action === "file.write") {
        writes.push({
          path: String(payload?.path ?? ""),
          content: String(payload?.content ?? ""),
        });
        return { ack: true };
      }
      if (action === "file.copy") {
        copiedFiles.push({
          sourcePath: String(payload?.sourcePath ?? ""),
          destPath: String(payload?.destPath ?? ""),
        });
        return { ack: true };
      }
      return { ack: true };
    });

    const result = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile,
      output: {
        path: outputDir,
        packageMode: "directory",
        overwrite: true,
      },
      options: {
        includeAssets: true,
        includeManifest: true,
        themeId: "chips-official.default-dark-theme",
        locale: "zh-CN",
      },
    });

    expect(result).toMatchObject({
      packageMode: "directory",
      outputPath: outputDir,
      entryFile: "index.html",
      manifestFile: "conversion-manifest.json",
      semanticHash: "real-richtext-semantic-hash",
    });
    expect(result.assetCount).toBeGreaterThanOrEqual(archive.entries.length);

    const indexWrite = writes.find((item) => item.path === path.join(outputDir, "index.html"));
    const frameWrite = writes.find((item) => item.path === path.join(outputDir, `${structure.structure[0]?.id}.html`));
    const manifestWrite = writes.find((item) => item.path === path.join(outputDir, "conversion-manifest.json"));
    expect(indexWrite?.content).toContain(`src="./${structure.structure[0]?.id}.html"`);
    expect(indexWrite?.content).not.toContain("srcdoc=");
    expect(indexWrite?.content).toContain("chips-export-stage");
    expect(frameWrite?.content).toContain("data-real-card=\"richtext\"");
    expect(frameWrite?.content).toContain("./assets/content/");
    expect(frameWrite?.content).not.toContain(fileUrlForPath(cardRoot, true));
    expect(manifestWrite?.content).toContain("\"type\": \"card-to-html\"");
    expect(manifestWrite?.content).toContain("\"requestedThemeId\": \"chips-official.default-dark-theme\"");
    expect(manifestWrite?.content).toContain("\"requestedLocale\": \"zh-CN\"");

    expect(copiedFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePath: path.join(cardRoot, ".card", "metadata.yaml"),
          destPath: path.join(outputDir, "assets", "content", ".card", "metadata.yaml"),
        }),
        expect.objectContaining({
          sourcePath: path.join(cardRoot, firstImagePath ?? ""),
          destPath: path.join(outputDir, "assets", "content", firstImagePath ?? ""),
        }),
        expect.objectContaining({
          sourcePath: path.join(cardRoot, music.audio_file),
          destPath: path.join(outputDir, "assets", "content", music.audio_file),
        }),
      ]),
    );
    expect(toPosixPath(copiedFiles[0]?.destPath ?? "")).toContain("assets/content");
  });
});

const workspaceOutputRoot = (): string => {
  return path.join(toMaterialPath("."), "..", "test-results", "task05604-card-to-html");
};
