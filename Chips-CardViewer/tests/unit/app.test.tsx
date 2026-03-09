import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { App } from "../../src/App";

describe("App（卡片查看器根组件）", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });

  it("应当可以完成首屏渲染而不触发 React hooks 运行时错误", () => {
    expect(() => renderToString(<App />)).not.toThrow();
  });
});
