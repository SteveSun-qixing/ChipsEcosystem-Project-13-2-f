import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { CardToHtmlContext } from "../../src/types";

const createContext = (
  invokeImpl: (action: string, payload?: Record<string, unknown>) => Promise<unknown>,
): CardToHtmlContext => {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    host: {
      invoke: vi.fn(invokeImpl),
    },
    job: {
      id: "job-1",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(false),
    },
  };
};

describe("card to html module", () => {
  it("exports the formal converter.card.to-html capability", () => {
    expect(moduleDefinition.providers[0]?.capability).toBe("converter.card.to-html");
    expect(typeof moduleDefinition.providers[0]?.methods.convert).toBe("function");
  });

  it("renders, rewrites and writes a directory export", async () => {
    const cardRoot = path.resolve("/tmp/card-source");
    const outputDir = path.resolve("/tmp/export-html");
    const renderedBody = [
      "<!doctype html>",
      "<html lang=\"en-US\">",
      "<body>",
      "<iframe srcdoc=\"&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;base href=&quot;file:///tmp/card-source/&quot; /&gt;&lt;/head&gt;&lt;body&gt;&lt;img src=&quot;file:///tmp/card-source/content/demo%20image.png&quot; /&gt;&lt;/body&gt;&lt;/html&gt;\"></iframe>",
      "</body>",
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        const target = payload?.path;
        if (target === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        expect(payload).toEqual({
          cardFile: path.resolve("/tmp/demo.card"),
          options: {
            target: "offscreen-render",
            themeId: "chips-official.default-dark-theme",
            locale: "en-US",
          },
        });
        return {
          view: {
            title: "Demo Card",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session/index.html",
            sessionId: "render-session-1",
            semanticHash: "semantic-hash-001",
            target: "offscreen-render",
          },
        };
      }

      if (action === "file.list") {
        expect(payload).toEqual({
          dir: cardRoot,
          options: { recursive: true },
        });
        return {
          entries: [
            { path: path.join(cardRoot, ".card"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, ".card", "metadata.yaml"), isFile: true, isDirectory: false },
            { path: path.join(cardRoot, "content"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, "content", "demo image.png"), isFile: true, isDirectory: false },
          ],
        };
      }

      return { ack: true };
    });

    const result = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile: path.resolve("/tmp/demo.card"),
      output: {
        path: outputDir,
        packageMode: "directory",
      },
      options: {
        themeId: "chips-official.default-dark-theme",
        locale: "en-US",
      },
    });

    expect(result).toEqual({
      packageMode: "directory",
      outputPath: outputDir,
      entryFile: "index.html",
      manifestFile: "conversion-manifest.json",
      semanticHash: "semantic-hash-001",
      assetCount: 2,
    });

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('src="./frame-1.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('class="chips-export-stage"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('class="chips-export-stage__viewport"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining("--chips-export-stage-max-width"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.not.stringContaining("srcdoc="),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "conversion-manifest.json"),
      content: expect.stringContaining("\"requestedLocale\": \"en-US\""),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining('<base href="./assets/content/" />'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining('<img src="./assets/content/content/demo%20image.png" />'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.copy", {
      sourcePath: path.join(cardRoot, ".card", "metadata.yaml"),
      destPath: path.join(outputDir, "assets", "content", ".card", "metadata.yaml"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.copy", {
      sourcePath: path.join(cardRoot, "content", "demo image.png"),
      destPath: path.join(outputDir, "assets", "content", "content", "demo image.png"),
    });
  });

  it("rewrites escaped file URLs without swallowing encoded quote delimiters", async () => {
    const outputDir = path.resolve("/tmp/export-html-escaped");
    const renderedBody = [
      "<!doctype html>",
      "<html lang=\"en-US\">",
      "<body>",
      "<iframe srcdoc=\"&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;base href=&quot;file:///tmp/card-source/&quot; /&gt;&lt;/head&gt;&lt;body&gt;&lt;script&gt;const resourceBaseUrl = &quot;file:///tmp/card-source/&quot;; const iconUrl = &quot;file:///tmp/card-source/content/icon.png&quot;;&lt;/script&gt;&lt;/body&gt;&lt;/html&gt;\"></iframe>",
      "</body>",
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Escaped URLs",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session/index.html",
            sessionId: "render-session-2",
            semanticHash: "semantic-escaped",
            target: "offscreen-render",
          },
        };
      }

      if (action === "file.list") {
        return {
          entries: [
            { path: path.join("/tmp/card-source", "content"), isFile: false, isDirectory: true },
            { path: path.join("/tmp/card-source", "content", "icon.png"), isFile: true, isDirectory: false },
          ],
        };
      }

      return { ack: true };
    });

    await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile: path.resolve("/tmp/demo.card"),
      output: {
        path: outputDir,
        packageMode: "directory",
      },
    });

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('src="./frame-1.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining('const resourceBaseUrl = "./assets/content/";'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.not.stringContaining("%26quot"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.not.stringContaining("srcdoc="),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('class="chips-export-stage__content"'),
    });
  });

  it("packages zip exports through zip.compress and cleans temporary directories", async () => {
    const tempRoots: string[] = [];
    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        const target = payload?.path;
        if (target === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (typeof target === "string" && target.includes(".chips-card-to-html-")) {
          return { meta: { isFile: false, isDirectory: true } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Zip Demo",
            body: "<html><body>zip</body></html>",
            documentUrl: "file:///tmp/render-session/index.html",
            sessionId: "render-session-3",
            semanticHash: "semantic-hash-zip",
            target: "offscreen-render",
          },
        };
      }

      if (action === "file.mkdir" && typeof payload?.path === "string" && payload.path.includes(".chips-card-to-html-")) {
        tempRoots.push(payload.path);
      }

      return { ack: true, outputZip: payload?.outputZip };
    });

    const result = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile: path.resolve("/tmp/demo.card"),
      output: {
        path: path.resolve("/tmp/export-html.zip"),
        packageMode: "zip",
      },
      options: {
        includeManifest: false,
      },
    });

    expect(result.packageMode).toBe("zip");
    expect(result.outputPath).toBe(path.resolve("/tmp/export-html.zip"));
    expect(result.entryFile).toBe("index.html");
    expect(result.manifestFile).toBeUndefined();
    expect(result.warnings).toContainEqual({
      code: "CONVERTER_HTML_MANIFEST_SKIPPED",
      message: "includeManifest=false omitted conversion-manifest.json from the output.",
    });

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("zip.compress", {
      inputDir: expect.stringContaining(`${path.sep}build`),
      outputZip: path.resolve("/tmp/export-html.zip"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.delete", {
      path: expect.stringContaining(".chips-card-to-html-"),
      options: { recursive: true },
    });
    expect(tempRoots.length).toBeGreaterThan(0);
  });

  it("keeps original file URLs when includeAssets is false", async () => {
    const renderedBody =
      "<iframe srcdoc=\"&lt;base href=&quot;file:///tmp/card-source/&quot; /&gt;&lt;img src=&quot;file:///tmp/card-source/content/pic.png&quot; /&gt;\"></iframe>";

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "No Assets",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session/index.html",
            sessionId: "render-session-4",
            semanticHash: "semantic-no-assets",
            target: "offscreen-render",
          },
        };
      }

      return { ack: true };
    });

    const result = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile: path.resolve("/tmp/demo.card"),
      output: {
        path: path.resolve("/tmp/export-html"),
        packageMode: "directory",
      },
      options: {
        includeAssets: false,
      },
    });

    expect(result.assetCount).toBe(0);
    expect(result.warnings).toContainEqual({
      code: "CONVERTER_HTML_ASSETS_SKIPPED",
      message: "includeAssets=false keeps original file URLs in the generated HTML.",
    });

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).not.toHaveBeenCalledWith("file.list", expect.anything());
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(path.resolve("/tmp/export-html"), "index.html"),
      content: expect.stringContaining('class="chips-export-stage"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(path.resolve("/tmp/export-html"), "index.html"),
      content: expect.stringContaining('src="./frame-1.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(path.resolve("/tmp/export-html"), "frame-1.html"),
      content: expect.stringContaining("file:///tmp/card-source/content/pic.png"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(path.resolve("/tmp/export-html"), "frame-1.html"),
      content: expect.stringContaining('<base href="file:///tmp/card-source/" />'),
    });
  });

  it("rejects zip exports when includeAssets is false", async () => {
    const ctx = createContext(async () => {
      throw new Error("should not be called");
    });

    await expect(
      moduleDefinition.providers[0]!.methods.convert(ctx, {
        cardFile: path.resolve("/tmp/demo.card"),
        output: {
          path: path.resolve("/tmp/export-html.zip"),
          packageMode: "zip",
        },
        options: {
          includeAssets: false,
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_INPUT_INVALID",
    });
  });

  it("cleans partial directory output and classifies write failures", async () => {
    let outputDirExists = false;
    const outputDir = path.resolve("/tmp/export-html");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (payload?.path === outputDir && outputDirExists) {
          return { meta: { isFile: false, isDirectory: true } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Write Failure",
            body: "<html><body>broken</body></html>",
            documentUrl: "file:///tmp/render-session/index.html",
            sessionId: "render-session-5",
            semanticHash: "semantic-write-failure",
            target: "offscreen-render",
          },
        };
      }

      if (action === "file.mkdir" && payload?.path === outputDir) {
        outputDirExists = true;
        return { ack: true };
      }

      if (action === "file.write" && payload?.path === path.join(outputDir, "index.html")) {
        throw new Error("disk full");
      }

      if (action === "file.delete" && payload?.path === outputDir) {
        outputDirExists = false;
        return { ack: true };
      }

      return { ack: true };
    });

    await expect(
      moduleDefinition.providers[0]!.methods.convert(ctx, {
        cardFile: path.resolve("/tmp/demo.card"),
        output: {
          path: outputDir,
          packageMode: "directory",
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_OUTPUT_WRITE_FAILED",
    });

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.delete", {
      path: outputDir,
      options: { recursive: true },
    });
  });

  it("externalizes managed render-session iframes and rewrites managed asset urls", async () => {
    const outputDir = path.resolve("/tmp/export-html-managed");
    const cardRoot = path.resolve("/tmp/card-source-managed");
    const nodeDocumentPath = path.join("/tmp/render-session-managed", "nodes", "basecard-001.html");
    const renderedBody = [
      "<!doctype html>",
      "<html lang=\"zh-CN\">",
      "<body>",
      '<iframe data-node-id="gallery" src="./nodes/basecard-001.html"></iframe>',
      "</body>",
      "</html>",
    ].join("");
    const nodeHtml = [
      "<!doctype html>",
      "<html>",
      '<head><base href="chips-render://card-root/token-1/" /></head>',
      '<body><img src="chips-render://card-root/token-1/content/managed%20image.png" /></body>',
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Managed Demo",
            body: renderedBody,
            documentUrl: "chips-render://session/render-session-managed/index.html",
            sessionId: "render-session-managed",
            semanticHash: "semantic-managed",
            target: "offscreen-render",
          },
        };
      }

      if (action === "card.resolveDocumentPath") {
        switch (payload?.documentUrl) {
          case "chips-render://session/render-session-managed/nodes/basecard-001.html":
            return { path: nodeDocumentPath };
          case "chips-render://card-root/token-1/":
            return { path: cardRoot };
          case "chips-render://card-root/token-1/content/managed%20image.png":
            return { path: path.join(cardRoot, "content", "managed image.png") };
          default:
            throw new Error(`Unexpected document url: ${String(payload?.documentUrl)}`);
        }
      }

      if (action === "file.read" && payload?.path === nodeDocumentPath) {
        return { content: nodeHtml };
      }

      if (action === "file.list") {
        expect(payload).toEqual({
          dir: cardRoot,
          options: { recursive: true },
        });
        return {
          entries: [
            { path: path.join(cardRoot, "content"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, "content", "managed image.png"), isFile: true, isDirectory: false },
          ],
        };
      }

      return { ack: true };
    });

    const result = await moduleDefinition.providers[0]!.methods.convert(ctx, {
      cardFile: path.resolve("/tmp/demo.card"),
      output: {
        path: outputDir,
        packageMode: "directory",
      },
    });

    expect(result).toEqual({
      packageMode: "directory",
      outputPath: outputDir,
      entryFile: "index.html",
      manifestFile: "conversion-manifest.json",
      semanticHash: "semantic-managed",
      assetCount: 1,
    });

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('src="./gallery.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('<base href="./assets/content/" />'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('<img src="./assets/content/content/managed%20image.png" />'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.copy", {
      sourcePath: path.join(cardRoot, "content", "managed image.png"),
      destPath: path.join(outputDir, "assets", "content", "content", "managed image.png"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("card.releaseRenderSession", {
      sessionId: "render-session-managed",
    });
  });
});
