import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { CardToHtmlContext } from "../../src/types";

const createContext = (
  invokeImpl: (action: string, payload?: Record<string, unknown>) => Promise<unknown>,
): CardToHtmlContext => {
  const hostInvoke = vi.fn(async (action: string, payload?: Record<string, unknown>) => {
    return invokeImpl(action, payload);
  }) as unknown as CardToHtmlContext["host"]["invoke"];

  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    host: {
      invoke: hostInvoke,
    },
    job: {
      id: "job-1",
      signal: new AbortController().signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn().mockReturnValue(false),
    },
  };
};

const escapeRegExpForTest = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  it("keeps exported base-card resource bases relative for Host runtime URL normalization", async () => {
    const outputDir = path.resolve("/tmp/export-html-relative-resource-base");
    const cardRoot = path.resolve("/tmp/card-source-relative-resource-base");
    const renderedBody = [
      "<!doctype html>",
      "<html lang=\"zh-CN\">",
      "<body>",
      "<iframe data-node-id=\"gallery\" srcdoc=\"&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;base href=&quot;file:///tmp/card-source-relative-resource-base/&quot; /&gt;&lt;/head&gt;&lt;body&gt;&lt;script&gt;const resourceBaseUrl = &quot;file:///tmp/card-source-relative-resource-base/&quot;; const resolveResourceUrl = async (resourcePath) =&gt; new URL(resourcePath, resourceBaseUrl).toString();&lt;/script&gt;&lt;img src=&quot;file:///tmp/card-source-relative-resource-base/assets/hero.png&quot; /&gt;&lt;/body&gt;&lt;/html&gt;\"></iframe>",
      "</body>",
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (payload?.path === cardRoot) {
          return { meta: { isFile: false, isDirectory: true } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Relative Resource Base Demo",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session-relative-resource-base/index.html",
            sessionId: "render-session-relative-resource-base",
            semanticHash: "semantic-relative-resource-base",
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
            { path: path.join(cardRoot, "assets"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, "assets", "hero.png"), isFile: true, isDirectory: false },
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
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('<base href="./assets/content/" />'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('const resourceBaseUrl = "./assets/content/";'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('new URL(resourcePath, resourceBaseUrl).toString()'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "gallery.html"),
      content: expect.stringContaining('<img src="./assets/content/assets/hero.png" />'),
    });
  });

  it("copies and rewrites Host theme font file URLs injected into exported HTML", async () => {
    const outputDir = path.resolve("/tmp/export-html-theme-font");
    const cardRoot = path.resolve("/tmp/card-source-theme-font");
    const themeFontPath = path.resolve(
      "/tmp/.chips-server-host-worker/plugins/theme.theme.chips-official-default-theme/dist/icons/variablefont/MaterialSymbolsOutlined[FILL,GRAD,opsz,wght].woff2",
    );
    const themeFontUrl = `file://${themeFontPath.replace(/\[/g, "%5B").replace(/\]/g, "%5D")}`;
    const renderedBody = [
      "<!doctype html>",
      '<html lang="zh-CN">',
      "<head>",
      `<style>@font-face { font-family: "Material Symbols Outlined"; src: url("${themeFontUrl}") format("woff2"); }</style>`,
      "</head>",
      "<body>",
      `<iframe srcdoc="&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;base href=&quot;file:///tmp/card-source-theme-font/&quot; /&gt;&lt;style&gt;@font-face { font-family: &quot;Material Symbols Outlined&quot;; src: url(&quot;${themeFontUrl}&quot;) format(&quot;woff2&quot;); }&lt;/style&gt;&lt;/head&gt;&lt;body&gt;&lt;img src=&quot;file:///tmp/card-source-theme-font/content/pic.png&quot; /&gt;&lt;/body&gt;&lt;/html&gt;"></iframe>`,
      "</body>",
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        const target = payload?.path;
        if (target === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (target === themeFontPath) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (target === cardRoot) {
          return { meta: { isFile: false, isDirectory: true } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Theme Font Demo",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session-theme-font/index.html",
            sessionId: "render-session-theme-font",
            semanticHash: "semantic-theme-font",
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
            { path: path.join(cardRoot, "content"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, "content", "pic.png"), isFile: true, isDirectory: false },
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

    expect(result.assetCount).toBe(2);

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("file.copy", {
      sourcePath: themeFontPath,
      destPath: expect.stringMatching(new RegExp(`${escapeRegExpForTest(path.join(outputDir, "assets", "theme"))}.+MaterialSymbolsOutlined`)),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.not.stringContaining("file://"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining("./assets/theme/"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.not.stringContaining("file://"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining("./assets/theme/"),
    });
  });

  it("rewrites Host theme font file URLs inside escaped JavaScript theme CSS strings", async () => {
    const outputDir = path.resolve("/tmp/export-html-theme-font-script");
    const cardRoot = path.resolve("/tmp/card-source-theme-font-script");
    const themeFontPath = path.resolve(
      "/tmp/.chips-server-host-worker/plugins/theme.theme.chips-official-default-theme/dist/icons/variablefont/MaterialSymbolsRounded[FILL,GRAD,opsz,wght].woff2",
    );
    const themeFontUrl = `file://${themeFontPath.replace(/\[/g, "%5B").replace(/\]/g, "%5D")}`;
    const frameHtml = [
      "<!doctype html>",
      "<html>",
      `<head><base href="file:///tmp/card-source-theme-font-script/" /></head>`,
      "<body>",
      `<script>const themeCssText = "@font-face {\\n  src: url(\\\"${themeFontUrl}\\\") format(\\\"woff2\\\");\\n}"; const resourceBaseUrl = "file:///tmp/card-source-theme-font-script/";</script>`,
      "</body>",
      "</html>",
    ].join("");
    const renderedBody = [
      "<!doctype html>",
      '<html lang="zh-CN">',
      "<body>",
      `<iframe srcdoc="${frameHtml
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}"></iframe>`,
      "</body>",
      "</html>",
    ].join("");

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        const target = payload?.path;
        if (target === path.resolve("/tmp/demo.card")) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (target === themeFontPath) {
          return { meta: { isFile: true, isDirectory: false } };
        }
        if (target === cardRoot) {
          return { meta: { isFile: false, isDirectory: true } };
        }
        throw Object.assign(new Error("not found"), { code: "FILE_NOT_FOUND" });
      }

      if (action === "card.render") {
        return {
          view: {
            title: "Theme Font Script Demo",
            body: renderedBody,
            documentUrl: "file:///tmp/render-session-theme-font-script/index.html",
            sessionId: "render-session-theme-font-script",
            semanticHash: "semantic-theme-font-script",
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
    expect(hostInvoke).toHaveBeenCalledWith("file.copy", {
      sourcePath: themeFontPath,
      destPath: expect.stringMatching(new RegExp(`${escapeRegExpForTest(path.join(outputDir, "assets", "theme"))}.+MaterialSymbolsRounded`)),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.not.stringContaining("file://"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining('url(\\"./assets/theme/'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "frame-1.html"),
      content: expect.stringContaining('const resourceBaseUrl = "./assets/content/";'),
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

  it("allocates stable sibling html names without collisions across iframe sources", async () => {
    const outputDir = path.resolve("/tmp/export-html-mixed");
    const cardRoot = path.resolve("/tmp/card-source-mixed");
    const firstDocumentPath = path.join("/tmp/render-session-mixed", "nodes", "first.html");
    const renderedBody = [
      "<!doctype html>",
      "<html lang=\"zh-CN\">",
      "<body>",
      '<iframe data-node-id="duplicate" src="./nodes/first.html"></iframe>',
      '<iframe data-node-id="duplicate" srcdoc="&lt;!doctype html&gt;&lt;html&gt;&lt;head&gt;&lt;base href=&quot;file:///tmp/card-source-mixed/&quot; /&gt;&lt;/head&gt;&lt;body&gt;second&lt;/body&gt;&lt;/html&gt;"></iframe>',
      "</body>",
      "</html>",
    ].join("");
    const firstNodeHtml = [
      "<!doctype html>",
      "<html>",
      '<head><base href="file:///tmp/card-source-mixed/" /></head>',
      "<body>first</body>",
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
            title: "Mixed Duplicate Demo",
            body: renderedBody,
            documentUrl: "chips-render://session/render-session-mixed/index.html",
            sessionId: "render-session-mixed",
            semanticHash: "semantic-mixed-duplicate",
            target: "offscreen-render",
          },
        };
      }

      if (action === "card.resolveDocumentPath") {
        switch (payload?.documentUrl) {
          case "chips-render://session/render-session-mixed/nodes/first.html":
            return { path: firstDocumentPath };
          case "file:///tmp/card-source-mixed/":
            return { path: cardRoot };
          default:
            throw new Error(`Unexpected document url: ${String(payload?.documentUrl)}`);
        }
      }

      if (action === "file.read" && payload?.path === firstDocumentPath) {
        return { content: firstNodeHtml };
      }

      if (action === "file.list") {
        return {
          entries: [
            { path: path.join(cardRoot, ".card"), isFile: false, isDirectory: true },
            { path: path.join(cardRoot, ".card", "metadata.yaml"), isFile: true, isDirectory: false },
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

    expect(result.assetCount).toBe(1);

    const hostInvoke = ctx.host.invoke as ReturnType<typeof vi.fn>;
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('src="./duplicate.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "index.html"),
      content: expect.stringContaining('src="./duplicate-2.html"'),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "duplicate.html"),
      content: expect.stringContaining("first"),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "duplicate-2.html"),
      content: expect.stringContaining("second"),
    });
  });

  it("records Host render diagnostics in the conversion manifest", async () => {
    const outputDir = path.resolve("/tmp/export-html-diagnostics");
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
            title: "Diagnostics Demo",
            body: "<html><body>diagnostics</body></html>",
            documentUrl: "chips-render://session/render-session-diagnostics/index.html",
            sessionId: "render-session-diagnostics",
            semanticHash: "semantic-diagnostics",
            target: "offscreen-render",
            contentFiles: ["index.html", "nodes/basecard.html"],
            diagnostics: [
              {
                nodeId: "basecard",
                severity: "info",
                code: "RENDER_PIPELINE_OK",
                message: "Rendered",
              },
            ],
            consistency: {
              passed: true,
            },
          },
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
      path: path.join(outputDir, "conversion-manifest.json"),
      content: expect.stringContaining("\"renderDiagnostics\""),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "conversion-manifest.json"),
      content: expect.stringContaining("\"RENDER_PIPELINE_OK\""),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "conversion-manifest.json"),
      content: expect.stringContaining("\"renderConsistency\""),
    });
    expect(hostInvoke).toHaveBeenCalledWith("file.write", {
      path: path.join(outputDir, "conversion-manifest.json"),
      content: expect.stringContaining("\"nodes/basecard.html\""),
    });
  });

  it("cleans partial output when cancellation is observed after output preparation", async () => {
    const outputDir = path.resolve("/tmp/export-html-cancelled");
    const abortController = new AbortController();
    let outputDirExists = false;
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

      if (action === "file.mkdir" && payload?.path === outputDir) {
        outputDirExists = true;
        abortController.abort();
        return { ack: true };
      }

      return { ack: true };
    });
    ctx.job = {
      id: "job-cancelled",
      signal: abortController.signal,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      isCancelled: vi.fn(() => abortController.signal.aborted),
    };

    await expect(
      moduleDefinition.providers[0]!.methods.convert(ctx, {
        cardFile: path.resolve("/tmp/demo.card"),
        output: {
          path: outputDir,
          packageMode: "directory",
        },
      }),
    ).rejects.toMatchObject({
      code: "CONVERTER_JOB_CANCELLED",
    });

    expect(ctx.host.invoke).toHaveBeenCalledWith("file.delete", {
      path: outputDir,
      options: { recursive: true },
    });
  });
});
