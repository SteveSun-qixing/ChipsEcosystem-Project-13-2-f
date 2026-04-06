import { describe, it, expect } from "vitest";
import { App } from "../../src/App";

describe("App (图片查看器项目基线)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });
});
