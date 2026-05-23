import { afterEach, describe, it, expect } from "vitest";
import { createClient } from "../src/core/client";
import type { StandardError } from "../src/types/errors";
import type { CardEditorRenderOptions, CardEditorRenderResult } from "../src/api/card";
import type { SdkLogRecord } from "../src/types/client";

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
      context: {
        surfaceId: "surface-1",
        sceneId: "scene-image",
        kind: "route" as const,
        presentation: {
          title: "图片页",
          width: 1280,
          height: 800,
        },
      },
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

  it("unwraps wrapped utf-8 content returned by the official file.read route", async () => {
    const client = createClient({
      environment: "node",
      transport: async (action) => {
        if (action === "file.read") {
          return {
            content: "hello",
          };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.file.read("/test.txt", { encoding: "utf-8" })).resolves.toBe("hello");
  });

  it("normalizes latin1 byte-string payloads returned by file.read(binary)", async () => {
    const client = createClient({
      environment: "node",
      transport: async (action) => {
        if (action === "file.read") {
          return {
            content: String.fromCharCode(0x89, 0x50, 0x4e, 0x47),
          };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    const result = await client.file.read("/test.png", { encoding: "binary" });
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result as Uint8Array)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("passes recursive list and delete options into file routes", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "file.list") {
          return { entries: [] };
        }
        return undefined;
      },
    });

    await client.file.list("/workspace/card", { recursive: true });
    await client.file.delete("/workspace/card/tmp", { recursive: true });

    expect(calls).toEqual([
      {
        action: "file.list",
        payload: {
          dir: "/workspace/card",
          options: {
            recursive: true,
          },
        },
      },
      {
        action: "file.delete",
        payload: {
          path: "/workspace/card/tmp",
          options: {
            recursive: true,
          },
        },
      },
    ]);
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

  it("applies SDK invoke timeouts and logs request ids", async () => {
    const logs: SdkLogRecord[] = [];
    const client = createClient({
      environment: "node",
      timeoutMs: 5,
      logger: {
        debug(record) {
          logs.push(record);
        },
        info(record) {
          logs.push(record);
        },
        warn(record) {
          logs.push(record);
        },
        error(record) {
          logs.push(record);
        },
      },
      transport: async () => new Promise(() => undefined),
    });

    let captured: StandardError | undefined;
    try {
      await client.file.read("/test.txt");
    } catch (err) {
      captured = err as StandardError;
    }

    expect(captured).toMatchObject({
      code: "BRIDGE_TIMEOUT",
      messageKey: "chips.error.bridgeTimeout",
      retryable: true,
      details: {
        action: "file.read",
        timeoutMs: 5,
      },
    });
    expect(captured?.requestId).toEqual(expect.any(String));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: "error",
      action: "file.read",
      requestId: captured?.requestId,
      details: {
        code: "BRIDGE_TIMEOUT",
        attempt: 1,
        retryable: true,
      },
    });
  });

  it("retries retryable errors and keeps one request id across attempts", async () => {
    const logs: SdkLogRecord[] = [];
    let calls = 0;
    const client = createClient({
      environment: "node",
      retries: 1,
      logger: {
        debug(record) {
          logs.push(record);
        },
        info(record) {
          logs.push(record);
        },
        warn(record) {
          logs.push(record);
        },
        error(record) {
          logs.push(record);
        },
      },
      transport: async () => {
        calls += 1;
        if (calls === 1) {
          throw {
            code: "BRIDGE_CONNECTION_LOST",
            message: "Bridge connection lost.",
            retryable: true,
          };
        }
        return { content: "content" };
      },
    });

    await expect(client.file.read("/test.txt")).resolves.toBe("content");

    expect(calls).toBe(2);
    expect(logs.map((record) => record.level)).toEqual(["error", "debug"]);
    expect(logs[0]?.requestId).toEqual(logs[1]?.requestId);
    expect(logs[0]).toMatchObject({
      action: "file.read",
      details: {
        code: "BRIDGE_CONNECTION_LOST",
        attempt: 1,
        retryable: true,
      },
    });
    expect(logs[1]).toMatchObject({
      action: "file.read",
      details: {
        attempt: 2,
      },
    });
  });

  it("normalizes permission denied errors and never retries them", async () => {
    let calls = 0;
    const client = createClient({
      environment: "node",
      retries: 3,
      transport: async () => {
        calls += 1;
        throw {
          code: "PERMISSION_DENIED",
          message: "Caller lacks permission: file.read",
          details: {
            action: "file.read",
            resource: "/secret.txt",
            required: ["file.read"],
            granted: ["theme.read"],
            callerId: "plugin.demo",
            callerType: "plugin",
          },
          retryable: true,
        };
      },
    });

    let captured: StandardError | undefined;
    try {
      await client.file.read("/secret.txt");
    } catch (err) {
      captured = err as StandardError;
    }

    expect(calls).toBe(1);
    expect(captured).toMatchObject({
      code: "PERMISSION_DENIED",
      permission: {
        action: "file.read",
        resource: "/secret.txt",
        required: ["file.read"],
        granted: ["theme.read"],
        messageKey: "chips.error.permissionDenied",
        callerId: "plugin.demo",
        callerType: "plugin",
      },
    });
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

  it("wraps command registry actions and changed subscriptions", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const command = {
      commandId: "chips.demo.open-settings",
      titleKey: "app.commands.openSettings.title",
      descriptionKey: "app.commands.openSettings.description",
      ariaLabelKey: "app.commands.openSettings.ariaLabel",
      icon: {
        name: "settings",
        style: "rounded" as const,
      },
      shortcut: {
        accelerator: "CommandOrControl+,",
      },
      scope: {
        kind: "app" as const,
        appId: "chips.demo",
      },
      enabledWhen: {
        key: "environment",
        equals: "ready",
      },
      visibleWhen: true,
      permission: ["config.read"],
      handlerId: "open-settings",
      menuPlacement: [
        {
          menuId: "app",
          groupId: "settings",
          order: 20,
        },
      ],
      toolbarPlacement: [
        {
          toolbarId: "main",
          groupId: "primary",
          order: 10,
        },
      ],
      paletteKeywords: ["settings", "preferences"],
      state: {
        enabled: true,
        visible: true,
      },
      ownerPluginId: "chips.demo",
    };

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        switch (action) {
          case "command.register":
          case "command.get":
          case "command.setState":
            return { command };
          case "command.list":
            return { commands: [command] };
          case "command.invoke":
            return {
              commandId: command.commandId,
              invocationId: "invocation-1",
              dispatched: true,
            };
          case "command.unregister":
            return { ack: true };
          default:
            throw { code: "SERVICE_NOT_FOUND", message: action };
        }
      },
    });

    await expect(client.command.register(command)).resolves.toEqual(command);
    await client.command.unregister(command.commandId);
    await expect(
      client.command.get(command.commandId, {
        scope: {
          kind: "app",
          appId: "chips.demo",
        },
        source: "menu",
        includeDisabled: true,
      }),
    ).resolves.toEqual(command);
    await expect(
      client.command.list({
        source: "palette",
        includeHidden: true,
      }),
    ).resolves.toEqual([command]);
    await expect(
      client.command.invoke(
        command.commandId,
        {
          target: "settings",
        },
        {
          source: "toolbar",
          context: {
            sceneId: "scene-1",
            surfaceId: "surface-1",
          },
        },
      ),
    ).resolves.toEqual({
      commandId: command.commandId,
      invocationId: "invocation-1",
      dispatched: true,
    });
    await expect(
      client.command.setState(command.commandId, {
        enabled: false,
        disabledReasonKey: "app.commands.openSettings.disabled",
      }),
    ).resolves.toEqual(command);

    const changedEvents: unknown[] = [];
    const off = client.command.onChanged((event) => {
      changedEvents.push(event);
    });
    await client.events.emit("command.changed", {
      commandId: command.commandId,
      state: {
        enabled: false,
      },
      change: "state",
    });
    off();
    await client.events.emit("command.changed", {
      commandId: command.commandId,
      change: "updated",
    });

    expect(changedEvents).toEqual([
      {
        commandId: command.commandId,
        state: {
          enabled: false,
        },
        change: "state",
      },
    ]);
    expect(calls).toEqual([
      {
        action: "command.register",
        payload: {
          commandId: "chips.demo.open-settings",
          titleKey: "app.commands.openSettings.title",
          descriptionKey: "app.commands.openSettings.description",
          ariaLabelKey: "app.commands.openSettings.ariaLabel",
          icon: {
            name: "settings",
            style: "rounded",
          },
          shortcut: {
            accelerator: "CommandOrControl+,",
          },
          scope: {
            kind: "app",
            appId: "chips.demo",
          },
          enabledWhen: {
            key: "environment",
            equals: "ready",
          },
          visibleWhen: true,
          permission: ["config.read"],
          handlerId: "open-settings",
          menuPlacement: [
            {
              menuId: "app",
              groupId: "settings",
              order: 20,
            },
          ],
          toolbarPlacement: [
            {
              toolbarId: "main",
              groupId: "primary",
              order: 10,
            },
          ],
          paletteKeywords: ["settings", "preferences"],
          state: {
            enabled: true,
            visible: true,
          },
        },
      },
      {
        action: "command.unregister",
        payload: {
          commandId: "chips.demo.open-settings",
        },
      },
      {
        action: "command.get",
        payload: {
          commandId: "chips.demo.open-settings",
          scope: {
            kind: "app",
            appId: "chips.demo",
          },
          source: "menu",
          includeDisabled: true,
        },
      },
      {
        action: "command.list",
        payload: {
          source: "palette",
          includeHidden: true,
        },
      },
      {
        action: "command.invoke",
        payload: {
          commandId: "chips.demo.open-settings",
          payload: {
            target: "settings",
          },
          source: "toolbar",
          context: {
            sceneId: "scene-1",
            surfaceId: "surface-1",
          },
        },
      },
      {
        action: "command.setState",
        payload: {
          commandId: "chips.demo.open-settings",
          state: {
            enabled: false,
            disabledReasonKey: "app.commands.openSettings.disabled",
          },
        },
      },
    ]);
  });

  it("rejects command definitions with raw text fields", async () => {
    const client = createClient({
      environment: "node",
      transport: async () => {
        throw new Error("transport should not be called");
      },
    });

    await expect(
      client.command.register({
        commandId: "chips.demo.open-settings",
        titleKey: "app.commands.openSettings.title",
        title: "Open Settings",
        handlerId: "open-settings",
      } as any),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
      message: "command.register: title must be expressed as an i18n key field.",
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

  it("forwards theme diagnostics schema and changed events", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const listeners = new Map<string, (payload: unknown) => void>();
    const summary = {
      total: 1,
      blocking: 1,
      bySeverity: { info: 0, warning: 0, error: 1 },
      byCode: { THEME_REQUIRED_TOKEN_MISSING: 1 },
      status: "blocked" as const,
      coverage: {
        componentCount: 1,
        coveredComponentCount: 0,
        requiredTokenCount: 2,
        coveredRequiredTokenCount: 1,
        missingRequiredTokenCount: 1,
        optionalTokenCount: 0,
        coveredOptionalTokenCount: 0,
        missingOptionalTokenCount: 0,
        requiredCoverage: 0.5,
        optionalCoverage: 1,
      },
    };
    const diagnostic = {
      severity: "error" as const,
      code: "THEME_REQUIRED_TOKEN_MISSING",
      messageKey: "theme.diagnostics.requiredTokenMissing",
      themeId: "chips.test.theme",
      sourceThemeId: "chips.test.theme",
      component: "button",
      part: "label",
      state: "idle",
      tokenKey: "chips.comp.button.label.color.idle",
      layer: "comp" as const,
      scope: "component",
      suggestionKey: "theme.suggestions.addRequiredToken",
      details: { tokenKey: "chips.comp.button.label.color.idle" },
      blocking: true,
    };
    const contractView = {
      schemaVersion: "1.0.0",
      themeId: "chips.test.theme",
      themeVersion: "1.0.0",
      contractVersion: "1.0.0",
      components: [
        {
          component: "button",
          scope: "button",
          parts: ["root", "label"],
          states: ["idle"],
          requiredTokens: ["chips.comp.button.root.surface.idle", "chips.comp.button.label.color.idle"],
          optionalTokens: [],
          a11yConstraints: [],
          motionConstraints: [],
          coverage: {
            requiredTokenCount: 2,
            coveredRequiredTokenCount: 1,
            missingRequiredTokenCount: 1,
            optionalTokenCount: 0,
            coveredOptionalTokenCount: 0,
            missingOptionalTokenCount: 0,
            requiredCoverage: 0.5,
            optionalCoverage: 1,
            status: "blocked" as const,
          },
          diagnostics: [diagnostic],
        },
      ],
      summary,
    };

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "theme.resolve") {
          return {
            resolved: [{ id: "chips.test.theme", displayName: "Test", version: "1.0.0", order: 0 }],
            tokens: { "chips.comp.button.root.surface.idle": "#fff" },
            diagnostics: [diagnostic],
            summary,
          };
        }
        if (action === "theme.contract.get") {
          return contractView;
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });
    const clientEvents = client.events as typeof client.events & {
      on<T>(eventName: string, handler: (payload: T) => void): () => void;
    };
    clientEvents.on = (eventName, handler) => {
      listeners.set(eventName, handler as (payload: unknown) => void);
      return () => listeners.delete(eventName);
    };

    await expect(client.theme.resolve(["chips.test.theme"])).resolves.toEqual({
      resolved: [{ id: "chips.test.theme", displayName: "Test", version: "1.0.0", order: 0 }],
      tokens: { "chips.comp.button.root.surface.idle": "#fff" },
      diagnostics: [diagnostic],
      summary,
    });
    await expect(client.theme.contract.get("button")).resolves.toEqual(contractView);

    const changedEvents: unknown[] = [];
    const off = client.theme.onChanged((payload) => changedEvents.push(payload));
    listeners.get("theme.changed")?.({
      previousThemeId: "chips.old",
      themeId: "chips.test.theme",
      themeVersion: "1.0.0",
      timestamp: 1,
      diagnosticsSummary: summary,
    });
    off();
    listeners.get("theme.changed")?.({
      previousThemeId: "chips.old",
      themeId: "chips.test.theme",
      themeVersion: "1.0.0",
      timestamp: 2,
      diagnosticsSummary: summary,
    });

    expect(changedEvents).toEqual([
      {
        previousThemeId: "chips.old",
        themeId: "chips.test.theme",
        themeVersion: "1.0.0",
        timestamp: 1,
        diagnosticsSummary: summary,
      },
    ]);
    expect(calls).toEqual([
      { action: "theme.resolve", payload: { chain: ["chips.test.theme"] } },
      { action: "theme.contract.get", payload: { component: "button" } },
    ]);
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
        coverRatio: "3:4",
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
        coverRatio: "3:4",
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
        if (action === "box.renderCover") {
          return {
            view: {
              title: "旅行箱",
              coverUrl: "file:///tmp/box-cover.html",
              mimeType: "text/html",
              ratio: "3:4",
            },
          };
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
              mode: "document-window",
              documentType: "card",
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
    await expect(client.box.renderCover("/tmp/demo.box")).resolves.toEqual({
      title: "旅行箱",
      coverUrl: "file:///tmp/box-cover.html",
      mimeType: "text/html",
      ratio: "3:4",
    });
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
      mode: "document-window",
      documentType: "card",
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
        once: () => () => undefined,
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
            diagnostics: [
              {
                nodeId: "root",
                path: "root",
                stage: "contract-validate",
                severity: "P1",
                code: "RENDER_CONTRACT_A11Y_NAME_REQUIRED",
                message: "Command node requires an accessible name",
                suggestion: "Provide an accessible name.",
                qualityGateBlocking: true,
              },
            ],
            qualityGate: {
              passed: false,
              blockingCount: 1,
              highestSeverity: "P1",
              blockingDiagnostics: [
                {
                  nodeId: "root",
                  path: "root",
                  stage: "contract-validate",
                  severity: "P1",
                  code: "RENDER_CONTRACT_A11Y_NAME_REQUIRED",
                  message: "Command node requires an accessible name",
                  suggestion: "Provide an accessible name.",
                  qualityGateBlocking: true,
                },
              ],
            },
          },
        };
      },
    });

    const result = await client.card.render("/tmp/demo.card", {
      target: "offscreen-render",
      themeId: "chips-official.default-dark-theme",
      locale: "en-US",
    });
    expect(result.view.qualityGate?.passed).toBe(false);
    expect(result.view.diagnostics?.[0]).toMatchObject({
      path: "root",
      severity: "P1",
      suggestion: expect.any(String),
      qualityGateBlocking: true,
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

  it("invokes zip routes through the formal sdk wrapper", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "zip.compress") {
          return { outputZip: "/tmp/demo.zip" };
        }
        if (action === "zip.extract") {
          return { outputDir: "/tmp/unpacked" };
        }
        if (action === "zip.list") {
          return {
            entries: [
              {
                path: "index.html",
                size: 128,
                compressedSize: 64,
              crc32: 1234,
              offset: 0,
              isDirectory: false,
              compressionMethod: 0,
              modifiedTime: 1767225600000,
            },
            ],
          };
        }
        throw { code: "SERVICE_NOT_FOUND", message: action };
      },
    });

    await expect(client.zip.compress("/tmp/site", "/tmp/demo.zip")).resolves.toBe("/tmp/demo.zip");
    await expect(client.zip.extract("/tmp/demo.zip", "/tmp/unpacked")).resolves.toBe("/tmp/unpacked");
    await expect(client.zip.list("/tmp/demo.zip")).resolves.toEqual([
      {
        path: "index.html",
        size: 128,
        compressedSize: 64,
        crc32: 1234,
        offset: 0,
        isDirectory: false,
        compressionMethod: 0,
        modifiedTime: 1767225600000,
      },
    ]);

    expect(calls).toEqual([
      {
        action: "zip.compress",
        payload: {
          inputDir: "/tmp/site",
          outputZip: "/tmp/demo.zip",
        },
      },
      {
        action: "zip.extract",
        payload: {
          zipPath: "/tmp/demo.zip",
          outputDir: "/tmp/unpacked",
        },
      },
      {
        action: "zip.list",
        payload: {
          zipPath: "/tmp/demo.zip",
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
    expect(captured?.messageKey).toBe("chips.error.bridgeUnavailable");
    expect(captured?.requestId).toEqual(expect.any(String));
    expect(captured?.details).toMatchObject({
      action: "file.read",
      environment: "node",
      hasWindow: false,
      hasChips: false,
    });
  });

  it("supports cancellable once subscriptions for custom transports", async () => {
    const client = createClient({
      environment: "node",
      transport: async () => undefined,
    });
    const events: unknown[] = [];

    const cancelFirst = client.events.once("theme.changed", (payload) => {
      events.push(payload);
    });
    cancelFirst();
    await client.events.emit("theme.changed", { id: "theme-1" });

    client.events.once("theme.changed", (payload) => {
      events.push(payload);
    });
    await client.events.emit("theme.changed", { id: "theme-2" });
    await client.events.emit("theme.changed", { id: "theme-3" });

    expect(events).toEqual([{ id: "theme-2" }]);
  });

  it("unwraps Host IPC encoded standard errors from the plugin bridge", async () => {
    const previousWindow = globalThis.window;
    const windowStub = {
      chips: {
        invoke: async () => {
          throw new Error(
            '__chips_ipc_error__:{"code":"ROUTE_TIMEOUT","message":"Route timeout: platform.dialogOpenFile","messageKey":"chips.error.routeTimeout","details":{"timeoutMs":2000},"retryable":true,"requestId":"host-request-1","traceId":"trace-1"}',
          );
        },
        on: () => () => undefined,
        once: () => () => undefined,
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
      expect(captured?.messageKey).toBe("chips.error.routeTimeout");
      expect(captured?.retryable).toBe(true);
      expect(captured?.requestId).toBe("host-request-1");
      expect(captured?.traceId).toBe("trace-1");
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
        once: () => () => undefined,
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

  it("reads launch context from the preload bridge and normalizes invalid payloads", () => {
    const previousWindow = globalThis.window;
    const windowStub = {
      chips: {
        invoke: async () => undefined,
        on: () => () => undefined,
        once: () => () => undefined,
        emit: async () => undefined,
        platform: {
          getLaunchContext: () => ({
            pluginId: "chips.app.demo",
            sessionId: "session-demo",
            sceneId: "scene-demo",
            surfaceId: "surface-demo",
            kind: "window",
            presentation: {
              title: "Demo",
              width: 1200,
              height: 800,
            },
            surfaceContext: {
              surfaceId: "surface-demo",
              sceneId: "scene-demo",
              pluginId: "chips.app.demo",
              sessionId: "session-demo",
              kind: "window",
              presentation: {
                title: "Demo",
                width: 1200,
                height: 800,
              },
              launchParams: {
                targetPath: "/tmp/demo.card",
              },
            },
            launchParams: {
              targetPath: "/tmp/demo.card",
              source: "chipsdev.run",
            },
          }),
        },
      },
    } as unknown as Window & {
      chips: {
        platform: {
          getLaunchContext: () => unknown;
        };
      };
    };

    globalThis.window = windowStub;

    try {
      const client = createClient({ environment: "plugin" });
      expect(client.platform.getLaunchContext()).toEqual({
        pluginId: "chips.app.demo",
        sessionId: "session-demo",
        sceneId: "scene-demo",
        surfaceId: "surface-demo",
        kind: "window",
        presentation: {
          title: "Demo",
          width: 1200,
          height: 800,
        },
        surfaceContext: {
          surfaceId: "surface-demo",
          sceneId: "scene-demo",
          pluginId: "chips.app.demo",
          sessionId: "session-demo",
          kind: "window",
          presentation: {
            title: "Demo",
            width: 1200,
            height: 800,
          },
          launchParams: {
            targetPath: "/tmp/demo.card",
          },
        },
        launchParams: {
          targetPath: "/tmp/demo.card",
          source: "chipsdev.run",
        },
      });

      windowStub.chips.platform.getLaunchContext = () => ({
        pluginId: 123,
        sessionId: null,
        sceneId: 456,
        surfaceContext: {
          sceneId: "scene-invalid",
          kind: "invalid",
          presentation: {},
        },
        launchParams: ["invalid"],
      });

      expect(client.platform.getLaunchContext()).toEqual({
        pluginId: undefined,
        sessionId: undefined,
        sceneId: undefined,
        surfaceId: undefined,
        kind: undefined,
        presentation: undefined,
        surfaceContext: undefined,
        launchParams: {},
      });
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
