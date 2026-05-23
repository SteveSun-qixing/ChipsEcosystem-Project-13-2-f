import { afterEach, describe, expect, it } from "vitest";
import { createError, type StandardError } from "../src/types/errors";
import {
  createMockChipsClient,
  createMockChipsHost,
  createMockLaunchContext,
  createMockPermissionDeniedError,
  createMockSurfaceContext,
} from "../src/testing";
import type { CommandDefinitionInput } from "../src/api/command";

afterEach(() => {
  delete (globalThis as { window?: Window }).window;
});

describe("SDK testing helpers", () => {
  it("creates a real SDK client backed by the mock Host Bridge", async () => {
    const client = createMockChipsClient({
      translations: {
        "demo.ready": "系统已就绪",
      },
    });
    const events: string[] = [];

    client.theme.onChanged((payload) => {
      events.push(`theme:${payload.themeId}`);
    });
    client.i18n.onChanged((payload) => {
      events.push(`locale:${payload.locale}`);
    });

    await expect(client.theme.getCurrent()).resolves.toMatchObject({
      themeId: "chips-official.default-theme",
    });
    await expect(client.i18n.translate("demo.ready")).resolves.toBe("系统已就绪");

    await client.theme.apply("chips-official.default-dark-theme");
    await client.i18n.setCurrent("en-US");

    expect(events).toEqual([
      "theme:chips-official.default-dark-theme",
      "locale:en-US",
    ]);
    expect(client.calls.map((call) => call.action)).toEqual([
      "theme.getCurrent",
      "i18n.translate",
      "theme.apply",
      "i18n.setCurrent",
    ]);
    expect(client.state.theme.themeId).toBe("chips-official.default-dark-theme");

    client.restoreBridge();
  });

  it("installs window.chips so platform launch context uses the preload-like path", () => {
    const surfaceContext = createMockSurfaceContext({
      sceneId: "scene-reader",
      surfaceId: "surface-reader",
      pluginId: "chips.app.reader",
      launchParams: {
        documentId: "doc-1",
      },
    });
    const launchContext = createMockLaunchContext({
      surfaceContext,
      launchParams: {
        source: "unit-test",
      },
    });
    const client = createMockChipsClient({ launchContext });

    expect(client.platform.getLaunchContext()).toEqual({
      pluginId: "chips.app.reader",
      sessionId: "test-session",
      sceneId: "scene-reader",
      surfaceId: "surface-reader",
      kind: "window",
      presentation: {
        title: "Test Surface",
        width: 960,
        height: 640,
      },
      surfaceContext,
      launchParams: {
        source: "unit-test",
      },
    });

    client.restoreBridge();
  });

  it("simulates surface and command workflows through SDK domain APIs", async () => {
    const client = createMockChipsClient();
    const command: CommandDefinitionInput = {
      commandId: "chips.app.demo.showWelcome",
      titleKey: "demo.commands.showWelcome.title",
      handlerId: "showWelcome",
      scope: {
        kind: "app",
        appId: "chips.app.demo",
      },
    };
    const invoked: string[] = [];
    client.command.onInvoked((event) => {
      invoked.push(event.commandId);
    });

    const surface = await client.surface.open({
      kind: "route",
      target: {
        type: "plugin",
        pluginId: "chips.app.demo",
      },
      presentation: {
        title: "Demo",
        width: 1200,
        height: 800,
      },
    });
    const registered = await client.command.register(command);
    const listed = await client.command.list({ includeHidden: true, includeDisabled: true });
    const result = await client.command.invoke(command.commandId, { source: "test" }, { source: "toolbar" });

    expect(surface).toMatchObject({
      kind: "route",
      pluginId: "chips.app.demo",
      title: "Demo",
    });
    await expect(client.surface.getState(surface.id)).resolves.toMatchObject({
      id: surface.id,
      width: 1200,
    });
    expect(registered.commandId).toBe(command.commandId);
    expect(listed.map((item) => item.commandId)).toEqual([command.commandId]);
    expect(result).toMatchObject({
      commandId: command.commandId,
      dispatched: true,
      command: {
        handlerId: "showWelcome",
      },
    });
    expect(invoked).toEqual([command.commandId]);

    client.restoreBridge();
  });

  it("creates permission denied faults with SDK-normalized diagnostics", async () => {
    const client = createMockChipsClient({
      installBridge: false,
      permissions: ["theme.read"],
    });

    client.mockHost.setPermissionDenied("theme.apply", "theme.write", ["theme.read"], {
      pluginId: "chips.app.demo",
    });

    let captured: StandardError | undefined;
    try {
      await client.theme.apply("chips-official.default-dark-theme");
    } catch (error) {
      captured = error as StandardError;
    }

    expect(captured).toMatchObject({
      code: "PERMISSION_DENIED",
      messageKey: "chips.error.permissionDenied",
      permission: {
        action: "theme.apply",
        required: ["theme.write"],
        granted: ["theme.read"],
        pluginId: "chips.app.demo",
      },
    });
    expect(createMockPermissionDeniedError("file.read", ["file.read"]).permission?.required).toEqual(["file.read"]);

    client.restoreBridge();
  });

  it("exercises SDK timeout and retry paths with mock Host delays and faults", async () => {
    const timeoutClient = createMockChipsClient({
      installBridge: false,
      delays: {
        "theme.getCurrent": 30,
      },
      clientConfig: {
        timeoutMs: 5,
      },
    });

    await expect(timeoutClient.theme.getCurrent()).rejects.toMatchObject({
      code: "BRIDGE_TIMEOUT",
      retryable: true,
      details: {
        action: "theme.getCurrent",
        timeoutMs: 5,
      },
    });

    let attempts = 0;
    const retryHost = createMockChipsHost({
      actions: {
        "i18n.getCurrent": () => {
          attempts += 1;
          if (attempts === 1) {
            throw createError("BRIDGE_CONNECTION_LOST", "Bridge connection lost.", undefined, true);
          }
          return { locale: "zh-CN" };
        },
      },
    });
    const retryClient = retryHost.createClient({
      retries: 1,
    });

    await expect(retryClient.i18n.getCurrent()).resolves.toBe("zh-CN");
    expect(attempts).toBe(2);
    expect(retryClient.calls.filter((call) => call.action === "i18n.getCurrent")).toHaveLength(2);

    timeoutClient.restoreBridge();
    retryClient.restoreBridge();
  });
});
