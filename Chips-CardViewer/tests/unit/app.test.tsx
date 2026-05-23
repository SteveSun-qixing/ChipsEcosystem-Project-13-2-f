import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { App } from "../../src/App";
import { CardWindow } from "../../src/components/CardWindow";
import { parseCardViewerSource } from "../../src/types/viewer-source";

const appMock = vi.hoisted(() => ({
  launchParams: {} as Record<string, unknown>,
  emitted: [] as Array<{ event: string; payload: Record<string, unknown> }>,
  client: {
    platform: {
      getLaunchContext: () => ({
        launchParams: appMock.launchParams,
      }),
      openFile: vi.fn(),
      showMessage: vi.fn(),
    },
    theme: {
      getCurrent: vi.fn(async () => ({ themeId: "chips-official.default-theme", version: "1.0.0" })),
    },
    i18n: {
      getCurrent: vi.fn(async () => "zh-CN"),
    },
    document: {
      detectType: vi.fn((filePath: string) => filePath.endsWith(".box") ? "box" : filePath.endsWith(".card") ? "card" : null),
      window: {
        render: vi.fn(),
        onResize: vi.fn(() => () => undefined),
      },
    },
    card: {
      readInfo: vi.fn(),
    },
    box: {
      readMetadata: vi.fn(),
    },
    resource: {
      open: vi.fn(),
    },
  },
  bridge: {
    on: vi.fn(() => () => undefined),
    emit: vi.fn(async (event: string, payload: Record<string, unknown>) => {
      appMock.emitted.push({ event, payload });
    }),
  },
}));

vi.mock("../../src/hooks/useChipsClient", () => ({
  useChipsClient: () => appMock.client,
}));

vi.mock("../../src/hooks/useChipsBridge", () => ({
  useChipsBridge: () => appMock.bridge,
}));

describe("App（卡片查看器根组件）", () => {
  beforeEach(() => {
    appMock.launchParams = {};
    appMock.emitted.length = 0;
    vi.clearAllMocks();
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

  it("应当解析正式 cardSource 启动来源", () => {
    expect(parseCardViewerSource({
      kind: "local-file",
      documentKind: "box",
      filePath: "/tmp/demo.box",
    })).toEqual({
      kind: "local-file",
      documentKind: "box",
      filePath: "/tmp/demo.box",
    });

    expect(parseCardViewerSource({
      kind: "community-card",
      cardId: "card-1",
      title: "社区卡片",
      documentUrl: "https://example.test/card.html",
    })).toMatchObject({
      kind: "community-card",
      cardId: "card-1",
      title: "社区卡片",
      documentUrl: "https://example.test/card.html",
    });
  });

  it("卡片窗口组件应当提供独立的居中视口容器来承载复合卡片", () => {
    const html = renderToString(
      <CardWindow
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
