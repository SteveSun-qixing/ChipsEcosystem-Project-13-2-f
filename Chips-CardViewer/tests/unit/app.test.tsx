import { describe, it, expect } from "vitest";
import { App } from "../../src/App";

describe("App（卡片查看器根组件）", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
  });
});

