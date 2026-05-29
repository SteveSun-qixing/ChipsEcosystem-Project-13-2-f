// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createChipsI18nText } from "@chips/component-library";
import { App } from "../../src/App";
import { CardWindow } from "../../src/components/CardWindow";
import { localeBundles, supportedLocales, translateLocalKey } from "../../src/i18n/messages";
import { chipsClient } from "../../src/runtime/chips-client";
import { parseCardViewerSource } from "../../src/types/viewer-source";
import { CARD_VIEWER_COMMAND_IDS } from "../../src/commands/card-viewer-commands";
import {
  allRealDocumentPaths,
  expectAllRealDocumentsAvailable,
  expectRealDocumentFixturesAvailable,
  formatRealDocumentPath,
  realDocumentFixtures,
} from "../fixtures/real-documents";

type Listener<T> = (payload: T) => void;

const appRuntimeMock = vi.hoisted(() => {
  let launchContext = {
    pluginId: "com.chips.card-viewer",
    sceneId: "scene-card-viewer",
    surfaceId: "surface-card-viewer",
    kind: "window",
    launchParams: {},
    surfaceContext: {
      sceneId: "scene-card-viewer",
      surfaceId: "surface-card-viewer",
      pluginId: "com.chips.card-viewer",
      sessionId: "session-card-viewer",
      kind: "window",
      presentation: {
        title: "卡片查看器",
        width: 1024,
        height: 720,
        resizable: true,
      },
      launchParams: {},
    },
  };
  let locale = "zh-CN";
  const i18nListeners: Array<Listener<{ locale: string }>> = [];
  const themeListeners: Array<Listener<{
    previousThemeId?: string;
    themeId: string;
    themeVersion: string;
    timestamp: string;
  }>> = [];
  const eventListeners = new Map<string, Array<Listener<unknown>>>();
  const commandInvokedListeners: Array<Listener<{
    invocationId: string;
    commandId: string;
    handlerId: string;
    source: "api" | "menu" | "toolbar" | "shortcut" | "palette";
    ownerPluginId?: string;
  }>> = [];
  const documentRender = vi.fn(async ({ filePath }: { filePath: string }) => ({
    frame: document.createElement("iframe"),
    origin: "chips-render://",
    dispose: vi.fn(async () => undefined),
    documentType: filePath.endsWith(".box") ? "box" as const : "card" as const,
  }));
  const registeredCommands: string[] = [];

  const client = {
    card: {
      readInfo: vi.fn(async (cardFile: string) => ({
        cardFile,
        info: {
          metadata: {
            raw: {
              name: "测试卡片",
            },
            name: "测试卡片",
            createdAt: "2026-05-01T00:00:00.000Z",
          },
          cover: {
            title: "测试卡片封面",
            resourceUrl: "chips-render://cover/card.html",
            mimeType: "text/html" as const,
            ratio: "3:4",
          },
        },
      })),
    },
    box: {
      readMetadata: vi.fn(async () => ({
        chipStandardsVersion: "1.0.0",
        boxId: "box-1",
        name: "测试箱子",
        activeLayoutType: "chips.layout.grid",
        availableLayouts: ["chips.layout.grid"],
        createdAt: "2026-05-02T00:00:00.000Z",
      })),
      renderCover: vi.fn(async () => ({
        title: "测试箱子封面",
        coverUrl: "chips-render://cover/box.html",
        mimeType: "text/html" as const,
        ratio: "4:3",
      })),
    },
    document: {
      detectType: vi.fn((filePath: string) => filePath.endsWith(".box") ? "box" : filePath.endsWith(".card") ? "card" : null),
      window: {
        render: documentRender,
        onReady: vi.fn(() => () => undefined),
        onError: vi.fn(() => () => undefined),
        onNodeError: vi.fn(() => () => undefined),
        onResourceOpen: vi.fn(() => () => undefined),
      },
    },
    platform: {
      getLaunchContext: vi.fn(() => launchContext),
      openFile: vi.fn(async () => [] as string[]),
      showMessage: vi.fn(async () => undefined),
    },
    resource: {
      open: vi.fn(async () => undefined),
    },
    events: {
      on: vi.fn((event: string, handler: Listener<unknown>) => {
        const listeners = eventListeners.get(event) ?? [];
        listeners.push(handler);
        eventListeners.set(event, listeners);
        return () => {
          const nextListeners = eventListeners.get(event) ?? [];
          const index = nextListeners.indexOf(handler);
          if (index >= 0) {
            nextListeners.splice(index, 1);
          }
          eventListeners.set(event, nextListeners);
        };
      }),
      off: vi.fn((event: string, handler: Listener<unknown>) => {
        const listeners = eventListeners.get(event) ?? [];
        const index = listeners.indexOf(handler);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
        eventListeners.set(event, listeners);
      }),
      emit: vi.fn(async (event: string, payload: unknown) => {
        (eventListeners.get(event) ?? []).forEach((handler) => handler(payload));
        if (event === "theme.changed") {
          themeListeners.forEach((handler) => handler(payload as {
            previousThemeId?: string;
            themeId: string;
            themeVersion: string;
            timestamp: string;
          }));
        }
      }),
    },
    theme: {
      getCurrent: vi.fn(async () => ({
        themeId: "chips.default",
        displayName: "Default",
        version: "1.0.0",
        tokens: {},
      })),
      apply: vi.fn(async () => undefined),
      onChanged: vi.fn((handler: typeof themeListeners[number]) => {
        themeListeners.push(handler);
        return () => {
          const index = themeListeners.indexOf(handler);
          if (index >= 0) {
            themeListeners.splice(index, 1);
          }
        };
      }),
    },
    i18n: {
      getCurrent: vi.fn(async () => locale),
      setCurrent: vi.fn(async (nextLocale: string) => {
        locale = nextLocale;
        i18nListeners.forEach((handler) => handler({ locale }));
      }),
      onChanged: vi.fn((handler: typeof i18nListeners[number]) => {
        i18nListeners.push(handler);
        return () => {
          const index = i18nListeners.indexOf(handler);
          if (index >= 0) {
            i18nListeners.splice(index, 1);
          }
        };
      }),
    },
    command: {
      register: vi.fn(async (definition: { commandId: string }) => {
        registeredCommands.push(definition.commandId);
      }),
      unregister: vi.fn(async (commandId: string) => {
        const index = registeredCommands.indexOf(commandId);
        if (index >= 0) {
          registeredCommands.splice(index, 1);
        }
      }),
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      invoke: vi.fn(async (commandId: string, _payload?: unknown, options?: { source?: string }) => {
        commandInvokedListeners.forEach((handler) => handler({
          invocationId: `invoke-${commandId}`,
          commandId,
          handlerId: "open-file",
          ownerPluginId: "com.chips.card-viewer",
          source: options?.source === "toolbar" ? "toolbar" : "api",
        }));
        return { accepted: true };
      }),
      setState: vi.fn(async () => undefined),
      onRegistered: vi.fn(() => () => undefined),
      onUnregistered: vi.fn(() => () => undefined),
      onChanged: vi.fn(() => () => undefined),
      onInvoked: vi.fn((handler: typeof commandInvokedListeners[number]) => {
        commandInvokedListeners.push(handler);
        return () => {
          const index = commandInvokedListeners.indexOf(handler);
          if (index >= 0) {
            commandInvokedListeners.splice(index, 1);
          }
        };
      }),
    },
  };

  return {
    client,
    documentRender,
    reset() {
      launchContext = {
        ...launchContext,
        launchParams: {},
        surfaceContext: {
          ...launchContext.surfaceContext,
          launchParams: {},
        },
      };
      locale = "zh-CN";
      i18nListeners.length = 0;
      themeListeners.length = 0;
      commandInvokedListeners.length = 0;
      eventListeners.clear();
      registeredCommands.length = 0;
      vi.clearAllMocks();
    },
    setLaunchParams(launchParams: Record<string, unknown>) {
      launchContext = {
        ...launchContext,
        launchParams,
        surfaceContext: {
          ...launchContext.surfaceContext,
          launchParams,
        },
      };
    },
    emitLanguageChanged(nextLocale: string) {
      locale = nextLocale;
      i18nListeners.forEach((handler) => handler({ locale }));
    },
    emitThemeChanged(themeId: string, version = "2.0.0") {
      themeListeners.forEach((handler) => handler({
        previousThemeId: "chips.default",
        themeId,
        themeVersion: version,
        timestamp: "2026-05-25T00:00:00.000Z",
      }));
    },
  };
});

vi.mock("../../src/runtime/chips-client", () => ({
  CARD_VIEWER_RUNTIME_TRACE_ID: "card-viewer-runtime",
  getCardViewerClient: () => appRuntimeMock.client,
  chipsClient: appRuntimeMock.client,
}));

describe("App（卡片查看器根组件）", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    appRuntimeMock.reset();
    appRuntimeMock.client.platform.openFile.mockResolvedValue([realDocumentFixtures.compositeCard]);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    document.documentElement.removeAttribute("lang");
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("data-chips-locale");
  });

  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });

  it("应当可以完成首屏渲染而不触发 React hooks 运行时错误", () => {
    expect(() => renderToString(<App />)).not.toThrow();
  });

  it("首屏应当展示居中的导入提示与选择导入按钮", () => {
    const html = renderToString(<App />);

    expect(html).toContain("拖入卡片或箱子文件");
    expect(html).toContain("打开文件");
    expect(html).not.toContain("卡片查看器");
  });

  it("空启动后通过命令注册表调用打开文件，并把真实素材交给统一文档窗口", async () => {
    expectRealDocumentFixturesAvailable(["compositeCard"]);

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const button = Array.from(container.querySelectorAll("button"))
      .find((element) => element.textContent?.includes("打开文件"));
    expect(button).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(appRuntimeMock.client.command.invoke).toHaveBeenCalledWith(
      CARD_VIEWER_COMMAND_IDS.openFile,
      {},
      expect.objectContaining({ source: "api" }),
    );
    expect(appRuntimeMock.client.platform.openFile).toHaveBeenCalledWith({
      title: "打开卡片或箱子文件",
      mode: "file",
      allowMultiple: false,
      mustExist: true,
    });
    expect(appRuntimeMock.client.document.window.render).toHaveBeenCalledWith({
      filePath: realDocumentFixtures.compositeCard,
      locale: "zh-CN",
      mode: "view",
    });
  });

  it("从 targetPath 启动上下文恢复真实箱子素材，并拒绝不支持文件", async () => {
    expectRealDocumentFixturesAvailable(["foodGridBox"]);
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      targetPath: realDocumentFixtures.foodGridBox,
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(appRuntimeMock.client.document.window.render).toHaveBeenCalledWith({
      filePath: realDocumentFixtures.foodGridBox,
      locale: "zh-CN",
      mode: "view",
    });

    await act(async () => {
      root.unmount();
    });
    appRuntimeMock.reset();
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      targetPath: "/tmp/notes.txt",
    });
    container.innerHTML = "";
    root = createRoot(container);

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("当前只支持打开 .card 或 .box 文件。");
    expect(appRuntimeMock.client.document.window.render).not.toHaveBeenCalled();
  });

  it("优先从结构化 cardSource 启动上下文恢复本地文档", async () => {
    expectRealDocumentFixturesAvailable(["foodGridBox"]);
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      targetPath: "/tmp/legacy-target.card",
      cardSource: {
        kind: "local-file",
        documentKind: "box",
        filePath: realDocumentFixtures.foodGridBox,
      },
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(appRuntimeMock.client.document.window.render).toHaveBeenCalledWith({
      filePath: realDocumentFixtures.foodGridBox,
      locale: "zh-CN",
      mode: "view",
    });
    expect(appRuntimeMock.client.document.window.render).not.toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: "/tmp/legacy-target.card",
      }),
    );
  });

  it("可以从社区 cardSource 启动上下文恢复托管文档", async () => {
    appRuntimeMock.setLaunchParams({
      trigger: "community-open-view",
      cardSource: {
        kind: "community-card",
        cardId: "card-1",
        title: "社区卡片",
        documentUrl: "https://community.example/cards/card-1/view",
        coverUrl: "https://community.example/cards/card-1/cover",
        coverRatio: "3:4",
      },
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const frame = container.querySelector("iframe");
    expect(frame).toBeInstanceOf(HTMLIFrameElement);
    expect(frame?.getAttribute("src")).toBe("https://community.example/cards/card-1/view");
    expect(appRuntimeMock.client.document.window.render).not.toHaveBeenCalled();
  });

  it("本地卡片读取封面后可以切换封面与内容", async () => {
    expectRealDocumentFixturesAvailable(["compositeCard"]);
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      cardSource: {
        kind: "local-file",
        documentKind: "card",
        filePath: realDocumentFixtures.compositeCard,
      },
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(appRuntimeMock.client.card.readInfo).toHaveBeenCalledWith(realDocumentFixtures.compositeCard, ["metadata", "cover"]);
    const coverButton = Array.from(container.querySelectorAll("button"))
      .find((element) => element.getAttribute("aria-label") === "查看封面");
    expect(coverButton).toBeInstanceOf(HTMLButtonElement);

    await act(async () => {
      coverButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const coverFrame = container.querySelector('[data-chips-app="card-viewer.cover"] iframe');
    expect(coverFrame).toBeInstanceOf(HTMLIFrameElement);
    expect(coverFrame?.getAttribute("src")).toBe("chips-render://cover/card.html");
    expect(container.textContent).toContain("测试卡片");

    const contentButton = Array.from(container.querySelectorAll("button"))
      .find((element) => element.getAttribute("aria-label") === "查看内容");
    expect(contentButton).toBeInstanceOf(HTMLButtonElement);
    await act(async () => {
      contentButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.querySelector('[data-chips-app="card-viewer.cover"]')).toBeNull();
  });

  it("拒绝当前尚未支持的远程 cardSource", async () => {
    appRuntimeMock.setLaunchParams({
      trigger: "community-open-view",
      cardSource: {
        kind: "remote-card-file",
        url: "https://community.example/source/demo.card",
      },
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("当前查看来源暂不支持");
    expect(appRuntimeMock.client.document.window.render).not.toHaveBeenCalled();
  });

  it("进入卡片或箱子查看态后不渲染顶部菜单栏和工具栏", async () => {
    expectRealDocumentFixturesAvailable(["foodGridBox"]);
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      targetPath: realDocumentFixtures.foodGridBox,
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-chips-app="card-viewer.command-row"]')).toBeNull();
    expect(container.querySelector('[data-scope="menu-bar"]')).toBeNull();
    expect(container.querySelector('[data-scope="toolbar"]')).toBeNull();
  });

  it("逐个消费任务056清单中的真实卡片与箱子素材，并统一交给 Host 文档窗口", async () => {
    expectAllRealDocumentsAvailable();

    for (const filePath of allRealDocumentPaths) {
      await act(async () => {
        root.unmount();
      });
      appRuntimeMock.reset();
      appRuntimeMock.setLaunchParams({
        trigger: "file-association",
        targetPath: filePath,
      });
      container.innerHTML = "";
      root = createRoot(container);

      await act(async () => {
        root.render(<App />);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(
        appRuntimeMock.client.document.window.render,
        formatRealDocumentPath(filePath),
      ).toHaveBeenLastCalledWith({
        filePath,
        locale: "zh-CN",
        mode: "view",
      });
    }
  });

  it("从 webDocumentUrl 启动上下文恢复托管文档，并保持语言与主题事件同步到壳层和内容 iframe", async () => {
    appRuntimeMock.setLaunchParams({
      trigger: "resource.open",
      webDocumentUrl: "chips-render://session/card/index.html",
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const frame = container.querySelector("iframe");
    expect(frame).toBeInstanceOf(HTMLIFrameElement);
    expect(frame?.getAttribute("src")).toBe("chips-render://session/card/index.html");
    expect(frame?.getAttribute("title")).toBe("托管卡片文档");
    expect(document.documentElement.getAttribute("lang")).toBe("zh-CN");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.documentElement.getAttribute("data-chips-locale")).toBe("zh-CN");

    await act(async () => {
      appRuntimeMock.emitLanguageChanged("en-US");
      appRuntimeMock.emitThemeChanged("chips.default.dark", "2.0.0");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.documentElement.getAttribute("lang")).toBe("en-US");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.documentElement.getAttribute("data-chips-locale")).toBe("en-US");
    expect(frame?.getAttribute("title")).toBe("Hosted card document");
  });

  it("主题变化后会用同一文件和语言重新创建内容 iframe 渲染会话", async () => {
    expectRealDocumentFixturesAvailable(["compositeCard"]);
    appRuntimeMock.setLaunchParams({
      trigger: "file-association",
      targetPath: realDocumentFixtures.compositeCard,
    });

    await act(async () => {
      root.render(<App />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const renderCountBeforeThemeChange = appRuntimeMock.client.document.window.render.mock.calls.length;
    expect(renderCountBeforeThemeChange).toBeGreaterThan(0);

    await act(async () => {
      await appRuntimeMock.client.events.emit("theme.changed", {
        previousThemeId: "chips.default",
        themeId: "chips.default.dark",
        version: "2.0.0",
        themeVersion: "2.0.0",
        timestamp: "2026-05-25T00:00:00.000Z",
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(appRuntimeMock.client.document.window.render).toHaveBeenLastCalledWith({
      filePath: realDocumentFixtures.compositeCard,
      locale: "zh-CN",
      mode: "view",
    });
    expect(appRuntimeMock.client.document.window.render).toHaveBeenCalledTimes(renderCountBeforeThemeChange + 1);
  });

  it("应当通过组件库同步 i18n adapter 解析本地语言包", () => {
    const zhText = createChipsI18nText({
      bundles: localeBundles,
      locale: "zh-CN",
      fallbackLocale: "en-US",
      defaultLocale: "zh-CN",
    });
    const missingLocaleText = createChipsI18nText({
      bundles: localeBundles,
      locale: "fr-FR",
      fallbackLocale: "en-US",
      defaultLocale: "zh-CN",
    });

    expect(supportedLocales).toEqual(["zh-CN", "en-US"]);
    expect(zhText("card-viewer.commands.openFile.title")).toBe("打开文件");
    expect(missingLocaleText("card-viewer.viewer.documentLoading")).toBe("Loading document…");
    expect(translateLocalKey("card-viewer.missing.key", "zh-CN")).toBe("card-viewer.missing.key");
  });

  it("应当按结构化来源模型解析 cardSource 并过滤非法封面比例", () => {
    expect(parseCardViewerSource({
      kind: "local-file",
      filePath: " /tmp/demo.card ",
    })).toEqual({
      kind: "local-file",
      documentKind: "card",
      filePath: "/tmp/demo.card",
    });
    expect(parseCardViewerSource({
      kind: "community-card",
      cardId: "card-1",
      title: "Demo",
      documentUrl: "https://community.example/cards/card-1/view",
      coverUrl: "https://community.example/cards/card-1/cover",
      coverRatio: "calc(100vw)",
    })).toEqual({
      kind: "community-card",
      cardId: "card-1",
      title: "Demo",
      documentUrl: "https://community.example/cards/card-1/view",
      coverUrl: "https://community.example/cards/card-1/cover",
    });
    expect(parseCardViewerSource({
      kind: "local-file",
      filePath: "/tmp/demo.txt",
    })).toBeNull();
  });

  it("卡片窗口组件应当提供独立的居中视口容器来承载复合卡片", () => {
    const html = renderToString(
      <CardWindow
        client={chipsClient}
        filePath="/tmp/demo.box"
        traceId="test-trace"
        locale="zh-CN"
        loadingLabel="正在加载文档…"
        containerErrorLabel="容器不可用"
        fatalErrorFallback="严重错误"
        renderErrorFallback="渲染失败"
        resourceOpenErrorTitle="无法打开资源"
        resourceOpenErrorFallback="资源打开失败"
      />,
    );

    expect(html).toContain('data-chips-app="card-viewer.window"');
    expect(html).toContain('data-chips-app="card-viewer.viewport"');
    expect(html).toContain("card-viewer-window__viewport");
    expect(html).not.toContain("border-radius:8px");
  });
});
