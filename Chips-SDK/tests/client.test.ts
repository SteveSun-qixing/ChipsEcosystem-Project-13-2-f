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
