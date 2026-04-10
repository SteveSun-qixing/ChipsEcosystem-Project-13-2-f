import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { App } from "../../src/App";
import { CardWindow } from "../../src/components/CardWindow";

describe("App（卡片查看器根组件）", () => {
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
