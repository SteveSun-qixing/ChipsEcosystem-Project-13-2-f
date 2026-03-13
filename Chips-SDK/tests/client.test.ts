import { describe, it, expect } from "vitest";
import { createClient } from "../src/core/client";
import type { StandardError } from "../src/types/errors";
import type { CardEditorRenderOptions, CardEditorRenderResult } from "../src/api/card";

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
});
