import { beforeEach, describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { App } from "../../src/App";
import { CardWindow } from "../../src/components/CardWindow";
import { chipsClient } from "../../src/runtime/chips-client";

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
      coverUrl: "https://example.test/cover.html",
      coverFragmentUrl: "https://example.test/cover-fragment.html",
      coverRenderMode: "fragment-shadow",
      coverRatio: "3:4",
    })).toMatchObject({
      kind: "community-card",
      cardId: "card-1",
      title: "社区卡片",
      documentUrl: "https://example.test/card.html",
      coverUrl: "https://example.test/cover.html",
      coverFragmentUrl: "https://example.test/cover-fragment.html",
      coverRenderMode: "fragment-shadow",
      coverRatio: "3:4",
    });
  });

  it("封面查看层应当使用受控文档 iframe 并提供点击返回命中层", () => {
    const html = renderToString(
      <ViewerCoverSurface
        cover={{
          title: "卡片封面",
          coverUrl: "https://example.test/cover.html",
          coverFragmentUrl: "https://example.test/cover-fragment.html",
          coverRenderMode: "fragment-shadow",
          ratio: "3:4",
        }}
        title="社区卡片"
        closeLabel="点击封面返回内容"
        unavailableLabel="当前文档没有可用封面。"
        onClose={() => undefined}
      />,
    );

    expect(html).toContain('data-chips-app="card-viewer.cover"');
    expect(html).toContain('data-scope="viewer-cover-frame"');
    expect(html).toContain('data-ratio="3:4"');
    expect(html).toContain("viewer-cover-surface__hit-target");
    expect(html).toContain('aria-label="点击封面返回内容"');
    expect(html).toContain("viewer-cover-surface__title");
    expect(html).toContain("社区卡片");
  });

  it("封面查看层应当把任意合法比例转换为视口自适应尺寸变量", () => {
    const html = renderToString(
      <ViewerCoverSurface
        cover={{
          title: "超宽封面",
          coverUrl: "https://example.test/wide-cover.html",
          ratio: "2:1",
        }}
        title="横版卡片"
        closeLabel="点击封面返回内容"
        unavailableLabel="当前文档没有可用封面。"
        onClose={() => undefined}
      />,
    );

    expect(html).toContain("--viewer-cover-ratio-width:2");
    expect(html).toContain("--viewer-cover-ratio-height:1");
    expect(html).toContain("--viewer-cover-ratio-scale:1.4142");
    expect(html).toContain("--viewer-cover-aspect-ratio:2 / 1");
    expect(html).toContain("横版卡片");
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
