import { describe, expect, it } from "vitest";
import { App } from "../../src/App";

describe("App (书籍阅读器根组件)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });
});
