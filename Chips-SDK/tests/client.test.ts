import { afterEach, describe, it, expect } from "vitest";
import { createClient } from "../src/core/client";
import type { StandardError } from "../src/types/errors";
import type { CardEditorRenderOptions, CardEditorRenderResult } from "../src/api/card";

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("createClient", () => {
  it("uses custom transport when provided", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "file.read") {
          return "content";
        }
        throw { code: "SERVICE_NOT_FOUND", message: "not found" };
      },
    });

    const result = await client.file.read("/test.txt");
    expect(result).toBe("content");
    expect(calls[0]?.action).toBe("file.read");
    expect(calls[0]?.payload).toEqual({
      path: "/test.txt",
      options: undefined,
    });
  });

  it("unwraps platform/surface responses and sends updated window payloads", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const windowState = {
      id: "window-1",
      kind: "window" as const,
      title: "图片查看器",
      width: 1280,
      height: 800,
      focused: true,
      state: "normal" as const,
      pluginId: "com.chips.photo-viewer",
    };
    const surfaceState = {
      id: "surface-1",
      kind: "route" as const,
      title: "图片页",
      width: 1280,
      height: 800,
      focused: false,
      state: "normal" as const,
      url: "/image-viewer",
    };
    const capabilitySnapshot = {
      hostKind: "desktop" as const,
      platform: "darwin" as const,
      facets: {
        surface: {
          supported: true,
          interactive: true,
          supportedKinds: ["window", "route"],
        },
        storage: {
          localWorkspace: true,
          sandboxFilePicker: false,
          remoteBacked: false,
        },
        selection: {
          openFile: true,
          saveFile: true,
          directory: true,
          multiple: true,
        },
        transfer: {
          upload: false,
          download: true,
          share: true,
          externalOpen: true,
          revealInShell: true,
        },
        association: {
          fileAssociation: true,
          urlScheme: false,
          shareTarget: false,
        },
        device: {
          screen: true,
          power: true,
          network: false,
        },
        systemUi: {
          clipboard: true,
          tray: true,
          globalShortcut: true,
          notification: true,
        },
        background: {
          keepAlive: true,
          wakeEvents: true,
        },
        ipc: {
          namedPipe: true,
          unixSocket: true,
          sharedMemory: true,
        },
        offscreenRender: {
          htmlToPdf: true,
          htmlToImage: true,
        },
      },
    };

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        switch (action) {
          case "window.open":
            return { window: windowState };
          case "window.getState":
            return { state: windowState };
          case "window.focus":
          case "window.resize":
          case "window.setState":
          case "window.close":
          case "surface.focus":
          case "surface.resize":
          case "surface.setState":
          case "surface.close":
          case "transfer.openPath":
          case "transfer.openExternal":
          case "transfer.revealInShell":
            return { ack: true };
          case "platform.getInfo":
            return {
              info: {
                hostKind: "desktop",
                platform: "darwin",
                arch: "arm64",
                release: "24.0.0",
              },
            };
          case "platform.getCapabilities":
            return { capabilities: capabilitySnapshot };
          case "platform.getScreenInfo":
            return {
              screen: {
                id: "screen-1",
                width: 3024,
                height: 1964,
                scaleFactor: 2,
                x: 0,
                y: 0,
                primary: true,
              },
            };
          case "platform.listScreens":
            return {
              screens: [
                {
                  id: "screen-1",
                  width: 3024,
                  height: 1964,
                  scaleFactor: 2,
                  x: 0,
                  y: 0,
                  primary: true,
                },
              ],
            };
          case "platform.powerGetState":
            return {
              state: {
                idleSeconds: 0,
                preventSleep: false,
              },
            };
          case "platform.powerSetPreventSleep":
            return { preventSleep: true };
          case "surface.open":
            return { surface: surfaceState };
          case "surface.getState":
            return { state: surfaceState };
          case "surface.list":
            return { surfaces: [surfaceState] };
          case "transfer.share":
            return { shared: true };
          case "association.getCapabilities":
            return {
              capabilities: {
                fileAssociation: true,
                urlScheme: false,
                shareTarget: false,
              },
            };
          case "association.openPath":
            return {
              result: {
                targetPath: "/tmp/example.card",
                extension: ".card",
                mode: "card",
                windowId: "window-1",
              },
            };
          case "association.openUrl":
            return {
              result: {
                url: "https://chips.example/image-viewer",
                mode: "external",
              },
            };
          default:
            throw { code: "SERVICE_NOT_FOUND", message: action };
        }
      },
    });

    await expect(
      client.window.open({
        title: "图片查看器",
        width: 1280,
        height: 800,
        pluginId: "com.chips.photo-viewer",
      })
    ).resolves.toEqual(windowState);
    await client.window.focus("window-1");
    await client.window.resize("window-1", { width: 1400, height: 900 });
    await client.window.setState("window-1", "fullscreen");
    await expect(client.window.getState("window-1")).resolves.toEqual(windowState);
    await client.window.close("window-1");

    await expect(client.platform.getInfo()).resolves.toEqual({
      hostKind: "desktop",
      platform: "darwin",
      arch: "arm64",
      release: "24.0.0",
    });
    await expect(client.platform.getCapabilities()).resolves.toEqual(capabilitySnapshot);
    await expect(client.platform.getScreenInfo()).resolves.toEqual({
      id: "screen-1",
      width: 3024,
      height: 1964,
      scaleFactor: 2,
      x: 0,
      y: 0,
      primary: true,
    });
    await expect(client.platform.listScreens()).resolves.toHaveLength(1);
    await expect(client.platform.powerGetState()).resolves.toEqual({
      idleSeconds: 0,
      preventSleep: false,
    });
    await expect(client.platform.powerSetPreventSleep(true)).resolves.toBe(true);

    await expect(
      client.surface.open({
        kind: "route",
        target: {
          type: "url",
          url: "/image-viewer",
        },
      })
    ).resolves.toEqual(surfaceState);
    await client.surface.focus("surface-1");
    await client.surface.resize("surface-1", { width: 1024, height: 768 });
    await client.surface.setState("surface-1", "fullscreen");
    await expect(client.surface.getState("surface-1")).resolves.toEqual(surfaceState);
    await expect(client.surface.list()).resolves.toEqual([surfaceState]);
    await client.surface.close("surface-1");

    await expect(client.transfer.share({ title: "share" })).resolves.toBe(true);
    await client.transfer.openPath("/tmp/example.card");
    await client.transfer.openExternal("https://chips.example");
    await client.transfer.revealInShell("/tmp/example.card");

    await expect(client.association.getCapabilities()).resolves.toEqual({
      fileAssociation: true,
      urlScheme: false,
      shareTarget: false,
    });
    await expect(client.association.openPath("/tmp/example.card")).resolves.toEqual({
      targetPath: "/tmp/example.card",
      extension: ".card",
      mode: "card",
      windowId: "window-1",
    });
    await expect(client.association.openUrl("https://chips.example/image-viewer")).resolves.toEqual({
      url: "https://chips.example/image-viewer",
      mode: "external",
    });

    expect(calls.find((entry) => entry.action === "window.focus")?.payload).toEqual({
      windowId: "window-1",
    });
    expect(calls.find((entry) => entry.action === "window.resize")?.payload).toEqual({
      windowId: "window-1",
      width: 1400,
      height: 900,
    });
    expect(calls.find((entry) => entry.action === "window.setState")?.payload).toEqual({
      windowId: "window-1",
      state: "fullscreen",
    });
    expect(calls.find((entry) => entry.action === "surface.open")?.payload).toEqual({
      request: {
        kind: "route",
        target: {
          type: "url",
          url: "/image-viewer",
        },
      },
    });
  });

  it("sends nested read options for file.read", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        return "content";
      },
    });

    await client.file.read("/test.txt", { encoding: "utf-8" });

    expect(calls[0]?.action).toBe("file.read");
    expect(calls[0]?.payload).toEqual({
      path: "/test.txt",
      options: {
        encoding: "utf-8",
      },
    });
  });

  it("wraps non-standard errors as StandardError", async () => {
    const client = createClient({
      environment: "node",
      transport: async () => {
        throw new Error("boom");
      },
    });

    let captured: StandardError | undefined;
    try {
      await client.file.read("/test.txt");
    } catch (err) {
      captured = err as StandardError;
    }

    expect(captured).toBeDefined();
    expect(captured?.code).toBe("INTERNAL_ERROR");
    expect(captured?.message).toContain("boom");
  });

  it("unwraps i18n responses and preserves theme snapshots", async () => {
    const client = createClient({
      environment: "node",
      transport: async (action) => {
        if (action === "i18n.getCurrent") {
          return { locale: "zh-CN" };
        }
        if (action === "i18n.translate") {
          return { text: "系统已就绪" };
        }
        if (action === "i18n.listLocales") {
          return { locales: ["zh-CN", "en-US"] };
        }
        if (action === "theme.getAllCss") {
          return { css: ":root{--chips-sys-color-surface:#fff;}", themeId: "chips-official.default-theme" };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.i18n.getCurrent()).resolves.toBe("zh-CN");
    await expect(client.i18n.translate("system.ready")).resolves.toBe("系统已就绪");
    await expect(client.i18n.listLocales()).resolves.toEqual(["zh-CN", "en-US"]);
    await expect(client.theme.getAllCss()).resolves.toEqual({
      css: ":root{--chips-sys-color-surface:#fff;}",
      themeId: "chips-official.default-theme",
    });
  });

  it("unwraps plugin metadata responses", async () => {
    const plugin = {
      id: "theme.theme.chips-official-default-theme",
      manifestPath: "/tmp/theme/manifest.yaml",
      installPath: "/tmp/theme",
      enabled: true,
      version: "1.0.0",
      type: "theme",
      name: "薯片官方 · 默认主题",
      description: "default theme",
      capabilities: [],
      theme: {
        themeId: "chips-official.default-theme",
        displayName: "薯片官方 · 默认主题",
        isDefault: true,
      },
    };
    const client = createClient({
      environment: "node",
      transport: async (action) => {
        if (action === "plugin.list") {
          return { plugins: [plugin] };
        }
        if (action === "plugin.get") {
          return { plugin };
        }
        if (action === "plugin.getCardPlugin") {
          return { plugin: undefined };
        }
        if (action === "plugin.getLayoutPlugin") {
          return { plugin: undefined };
        }
        if (action === "plugin.getSelf") {
          return { plugin };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.plugin.list({ type: "theme" })).resolves.toEqual([plugin]);
    await expect(client.plugin.get(plugin.id)).resolves.toEqual(plugin);
    await expect(client.plugin.getSelf()).resolves.toEqual(plugin);
    await expect(client.plugin.getCardPlugin("RichTextCard")).resolves.toBeUndefined();
    await expect(client.plugin.getLayoutPlugin("grid-layout")).resolves.toBeUndefined();
  });

  it("unwraps box runtime responses and validates required arguments", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const inspection = {
      metadata: {
        chipStandardsVersion: "1.0.0",
        boxId: "b1C2d3E4f5",
        name: "旅行箱",
        createdAt: "2026-03-23T09:30:00.000Z",
        modifiedAt: "2026-03-23T11:20:00.000Z",
        activeLayoutType: "chips.layout.grid",
      },
      content: {
        activeLayoutType: "chips.layout.grid",
        layoutConfigs: {
          "chips.layout.grid": {
            schemaVersion: "1.0.0",
            props: {
              columnCount: 4,
            },
          },
        },
      },
      entries: [],
      assets: ["assets/layouts/grid/background.webp"],
    };
    const openViewResult = {
      sessionId: "session-1",
      box: {
        boxId: "b1C2d3E4f5",
        boxFile: "/tmp/demo.box",
        name: "旅行箱",
        activeLayoutType: "chips.layout.grid",
        availableLayouts: ["chips.layout.grid"],
        capabilities: {
          listEntries: true,
          readEntryDetail: true,
          renderEntryCover: true,
          resolveEntryResource: true,
          readBoxAsset: true,
          prefetchEntries: true,
          openEntry: true,
        },
      },
      initialView: {
        items: [],
        total: 0,
      },
    };
    const runtimeResource = {
      resourceUrl: "file:///tmp/assets/background.webp",
      mimeType: "image/webp",
      cacheKey: "box-asset:assets/layouts/grid/background.webp",
    };
    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "box.pack") {
          return { boxFile: "/tmp/demo.box" };
        }
        if (action === "box.unpack") {
          return { outputDir: "/tmp/unpacked-box" };
        }
        if (action === "box.inspect") {
          return { inspection };
        }
        if (action === "box.validate") {
          return { validationResult: { valid: true, errors: [] } };
        }
        if (action === "box.readMetadata") {
          return { metadata: inspection.metadata };
        }
        if (action === "box.openView") {
          return openViewResult;
        }
        if (action === "box.listEntries") {
          return { page: openViewResult.initialView };
        }
        if (action === "box.readEntryDetail") {
          return {
            items: [
              {
                entryId: "e9K2m1P4q7",
                detail: {
                  status: {
                    state: "ready",
                  },
                },
              },
            ],
          };
        }
        if (action === "box.renderEntryCover") {
          return {
            view: {
              title: "封面标题",
              coverUrl: "file:///tmp/cover.html",
              mimeType: "text/html",
              ratio: "3:4",
            },
          };
        }
        if (action === "box.openEntry") {
          return {
            result: {
              mode: "card-window",
              windowId: "window-1",
            },
          };
        }
        if (action === "box.resolveEntryResource" || action === "box.readBoxAsset") {
          return { resource: runtimeResource };
        }
        if (action === "box.prefetchEntries" || action === "box.closeView") {
          return { ack: true };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.box.pack("/tmp/box-dir", { outputPath: "/tmp/demo.box" })).resolves.toBe("/tmp/demo.box");
    await expect(client.box.unpack("/tmp/demo.box", "/tmp/unpacked-box")).resolves.toBe("/tmp/unpacked-box");
    await expect(client.box.inspect("/tmp/demo.box")).resolves.toEqual(inspection);
    await expect(client.box.validate("/tmp/demo.box")).resolves.toEqual({ valid: true, errors: [] });
    await expect(client.box.readMetadata("/tmp/demo.box")).resolves.toEqual(inspection.metadata);
    await expect(
      client.box.openView("/tmp/demo.box", {
        layoutType: "chips.layout.grid",
        initialQuery: {
          limit: 24,
        },
      }),
    ).resolves.toEqual(openViewResult);
    await expect(client.box.listEntries("session-1", { limit: 24 })).resolves.toEqual(openViewResult.initialView);
    await expect(
      client.box.readEntryDetail("session-1", ["e9K2m1P4q7"], ["status"]),
    ).resolves.toEqual([
      {
        entryId: "e9K2m1P4q7",
        detail: {
          status: {
            state: "ready",
          },
        },
      },
    ]);
    await expect(client.box.openEntry("session-1", "e9K2m1P4q7")).resolves.toEqual({
      mode: "card-window",
      windowId: "window-1",
    });
    await expect(client.box.renderEntryCover("session-1", "e9K2m1P4q7")).resolves.toEqual({
      title: "封面标题",
      coverUrl: "file:///tmp/cover.html",
      mimeType: "text/html",
      ratio: "3:4",
    });
    await expect(
      client.box.resolveEntryResource("session-1", "e9K2m1P4q7", { kind: "cover" }),
    ).resolves.toEqual(runtimeResource);
    await expect(client.box.readBoxAsset("session-1", "assets/layouts/grid/background.webp")).resolves.toEqual(runtimeResource);
    await expect(
      client.box.prefetchEntries("session-1", ["e9K2m1P4q7"], ["cover"]),
    ).resolves.toBeUndefined();
    await expect(client.box.closeView("session-1")).resolves.toBeUndefined();

    expect(calls[0]?.payload).toEqual({
      boxDir: "/tmp/box-dir",
      outputPath: "/tmp/demo.box",
    });
    await expect(client.box.openView("", {})).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
    await expect(client.box.readEntryDetail("session-1", [], ["status"])).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });

  it("unwraps module capability responses", async () => {
    const provider = {
      pluginId: "chips.module.markdown-renderer",
      capability: "text.markdown.render",
      version: "1.0.0",
      runtime: "worker",
      activation: "onDemand",
      permissions: [],
      status: "enabled",
      methods: [
        {
          name: "render",
          mode: "sync",
          inputSchema: "contracts/render.input.schema.json",
          outputSchema: "contracts/render.output.schema.json",
        },
        {
          name: "renderAsync",
          mode: "job",
          inputSchema: "contracts/renderAsync.input.schema.json",
          outputSchema: "contracts/renderAsync.output.schema.json",
        },
      ],
    };

    const syncResult = {
      mode: "sync" as const,
      output: {
        html: "<article># Title</article>",
      },
    };

    const jobResult = {
      mode: "job" as const,
      jobId: "job-1",
    };

    const jobSnapshot = {
      jobId: "job-1",
      pluginId: provider.pluginId,
      capability: provider.capability,
      method: "renderAsync",
      status: "running",
      createdAt: 1_710_000_000_000,
      updatedAt: 1_710_000_000_100,
      progress: {
        percent: 25,
      },
    };

    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "module.listProviders") {
          return { providers: [provider] };
        }
        if (action === "module.resolve") {
          return { provider };
        }
        if (action === "module.invoke" && (payload as { method?: string }).method === "render") {
          return syncResult;
        }
        if (action === "module.invoke" && (payload as { method?: string }).method === "renderAsync") {
          return jobResult;
        }
        if (action === "module.job.get") {
          return { job: jobSnapshot };
        }
        if (action === "module.job.cancel") {
          return { ack: true };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.module.listProviders({ capability: provider.capability })).resolves.toEqual([provider]);
    await expect(client.module.resolve(provider.capability, { versionRange: "^1.0.0" })).resolves.toEqual(provider);
    await expect(
      client.module.invoke({
        capability: provider.capability,
        method: "render",
        input: {
          markdown: "# Title",
        },
      }),
    ).resolves.toEqual(syncResult);
    await expect(
      client.module.invoke({
        capability: provider.capability,
        method: "renderAsync",
        input: {
          markdown: "# Async Title",
        },
      }),
    ).resolves.toEqual(jobResult);
    await expect(client.module.job.get("job-1")).resolves.toEqual(jobSnapshot);
    await expect(client.module.job.cancel("job-1")).resolves.toBeUndefined();
    expect(calls[0]?.payload).toEqual({
      capability: "text.markdown.render",
    });
  });

  it("rejects module.invoke inputs that are not plain objects", async () => {
    const client = createClient({
      environment: "node",
      transport: async () => {
        throw new Error("transport should not be called");
      },
    });

    await expect(
      client.module.invoke({
        capability: "text.markdown.render",
        method: "render",
        input: null as unknown as Record<string, unknown>,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      message: "module.invoke: input must be an object.",
    });
  });

  it("uses scoped Bridge transport when bridgeScope is provided", async () => {
    const calls: Array<{ action: string; payload: unknown; token?: string }> = [];
    (globalThis as { window?: unknown }).window = {
      chips: {
        invoke: async (action: string, payload?: unknown) => {
          calls.push({ action, payload, token: "unscoped" });
          return payload;
        },
        invokeScoped: async (action: string, payload: unknown, scope: { token: string }) => {
          calls.push({ action, payload, token: scope.token });
          return { locale: "en-US" };
        },
        on: () => () => undefined,
        once: () => undefined,
        emit: async () => undefined,
        emitScoped: async () => undefined,
      },
    };

    const client = createClient({
      bridgeScope: {
        token: "module-scope-token",
      },
    });

    await expect(client.i18n.getCurrent()).resolves.toBe("en-US");
    expect(calls).toEqual([
      {
        action: "i18n.getCurrent",
        payload: {},
        token: "module-scope-token",
      },
    ]);
  });

  it("renders card editor panels through the formal Host route", async () => {
    const client = createClient({
      environment: "node",
      transport: async (action) => {
        if (action === "card.renderEditor") {
          return {
            view: {
              title: "RichTextCard Editor",
              body: "<html><body><div id='root'></div></body></html>",
              cardType: "RichTextCard",
              pluginId: "chips.basecard.richtext",
              baseCardId: "base-1",
            },
          };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    const result = await client.invoke<CardEditorRenderOptions, CardEditorRenderResult>(
      "card.renderEditor",
      {
        cardType: "RichTextCard",
        initialConfig: { title: "Hello", body: "<p>World</p>" },
        baseCardId: "base-1",
      },
    );

    expect(result.view.pluginId).toBe("chips.basecard.richtext");
    expect(result.view.cardType).toBe("RichTextCard");
    expect(result.view.baseCardId).toBe("base-1");
  });

  it("forwards card.render themeId and locale overrides", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Card",
            body: "<html lang='en-US'></html>",
            contentFiles: [],
            target: "offscreen-render",
            semanticHash: "hash-1",
          },
        };
      },
    });

    await client.card.render("/tmp/demo.card", {
      target: "offscreen-render",
      themeId: "chips-official.default-dark-theme",
      locale: "en-US",
    });

    expect(calls).toEqual([
      {
        action: "card.render",
        payload: {
          cardFile: "/tmp/demo.card",
          options: {
            target: "offscreen-render",
            themeId: "chips-official.default-dark-theme",
            locale: "en-US",
          },
        },
      },
    ]);
  });

  it("invokes formal platform html export routes", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "platform.renderHtmlToPdf") {
          return { outputFile: "/tmp/demo.pdf", pageCount: 2 };
        }
        if (action === "platform.renderHtmlToImage") {
          return { outputFile: "/tmp/demo.png", width: 800, height: 600, format: "png" };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(
      client.platform.renderHtmlToPdf({
        htmlDir: "/tmp/html",
        outputFile: "/tmp/demo.pdf",
      }),
    ).resolves.toEqual({ outputFile: "/tmp/demo.pdf", pageCount: 2 });

    await expect(
      client.platform.renderHtmlToImage({
        htmlDir: "/tmp/html",
        outputFile: "/tmp/demo.png",
        options: {
          format: "png",
        },
      }),
    ).resolves.toEqual({ outputFile: "/tmp/demo.png", width: 800, height: 600, format: "png" });

    expect(calls).toEqual([
      {
        action: "platform.renderHtmlToPdf",
        payload: {
          htmlDir: "/tmp/html",
          outputFile: "/tmp/demo.pdf",
        },
      },
      {
        action: "platform.renderHtmlToImage",
        payload: {
          htmlDir: "/tmp/html",
          outputFile: "/tmp/demo.png",
          options: {
            format: "png",
          },
        },
      },
    ]);
  });

  it("throws BRIDGE_UNAVAILABLE when no transport and no window.chips", async () => {
    const client = createClient({
      environment: "node",
    });

    let captured: StandardError | undefined;
    try {
      await client.file.read("/test.txt");
    } catch (err) {
      captured = err as StandardError;
    }

    expect(captured).toBeDefined();
    expect(captured?.code).toBe("BRIDGE_UNAVAILABLE");
  });

  it("unwraps Host IPC encoded standard errors from the plugin bridge", async () => {
    const previousWindow = globalThis.window;
    const windowStub = {
      chips: {
        invoke: async () => {
          throw new Error(
            '__chips_ipc_error__:{"code":"ROUTE_TIMEOUT","message":"Route timeout: platform.dialogOpenFile","details":{"timeoutMs":2000},"retryable":true}',
          );
        },
        on: () => () => undefined,
        once: () => undefined,
        emit: async () => undefined,
      },
    } as unknown as Window;

    globalThis.window = windowStub;

    try {
      const client = createClient({ environment: "plugin" });
      let captured: StandardError | undefined;

      try {
        await client.file.read("/test.txt");
      } catch (err) {
        captured = err as StandardError;
      }

      expect(captured).toBeDefined();
      expect(captured?.code).toBe("ROUTE_TIMEOUT");
      expect(captured?.message).toBe("Route timeout: platform.dialogOpenFile");
      expect(captured?.retryable).toBe(true);
    } finally {
      if (previousWindow) {
        globalThis.window = previousWindow;
      } else {
        delete (globalThis as { window?: Window }).window;
      }
    }
  });

  it("reads drag-and-drop file paths from the preload bridge", () => {
    const previousWindow = globalThis.window;
    const windowStub = {
      chips: {
        invoke: async () => undefined,
        on: () => () => undefined,
        once: () => undefined,
        emit: async () => undefined,
        platform: {
          getPathForFile(file: unknown) {
            return file === "theme.cpk" ? "/tmp/theme.cpk" : "";
          },
        },
      },
    } as unknown as Window;

    globalThis.window = windowStub;

    try {
      const client = createClient({ environment: "plugin" });
      expect(client.platform.getPathForFile("theme.cpk")).toBe("/tmp/theme.cpk");
      expect(client.platform.getPathForFile("missing")).toBe("");
    } finally {
      if (previousWindow) {
        globalThis.window = previousWindow;
      } else {
        delete (globalThis as { window?: Window }).window;
      }
    }
  });

  it("unwraps platform dialog responses", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "platform.dialogOpenFile") {
          return { filePaths: ["/tmp/demo.card"] };
        }
        if (action === "platform.dialogSaveFile") {
          return { filePath: "/tmp/export.card" };
        }
        if (action === "platform.dialogShowMessage") {
          return { response: 0 };
        }
        if (action === "platform.dialogShowConfirm") {
          return { confirmed: true };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.platform.openFile({ title: "Open" })).resolves.toEqual(["/tmp/demo.card"]);
    await expect(client.platform.saveFile({ title: "Save" })).resolves.toBe("/tmp/export.card");
    await expect(client.platform.showMessage({ message: "Hello" })).resolves.toBe(0);
    await expect(client.platform.showConfirm({ message: "Continue?" })).resolves.toBe(true);

    expect(calls).toEqual([
      {
        action: "platform.dialogOpenFile",
        payload: {
          options: {
            title: "Open",
          },
        },
      },
      {
        action: "platform.dialogSaveFile",
        payload: {
          options: {
            title: "Save",
          },
        },
      },
      {
        action: "platform.dialogShowMessage",
        payload: {
          options: {
            message: "Hello",
          },
        },
      },
      {
        action: "platform.dialogShowConfirm",
        payload: {
          options: {
            message: "Continue?",
          },
        },
      },
    ]);
  });
});
