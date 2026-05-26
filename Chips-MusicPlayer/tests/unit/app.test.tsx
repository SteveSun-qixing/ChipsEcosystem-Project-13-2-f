import { describe, expect, it } from "vitest";
import { App } from "../../src/App";
import { AppRoot } from "../../src/app/AppRoot";
import { AppProviders } from "../../src/app/AppProviders";
import { AppRuntimeProvider, useMusicPlayerRuntime } from "../../src/app/AppRuntimeProvider";

describe("App (音乐播放器根组件)", () => {
  it("应当导出一个可用的 React 组件", () => {
    expect(App).toBeTypeOf("function");
    expect(App).toBe(AppRoot);
    expect(AppProviders).toBeTypeOf("function");
    expect(AppRuntimeProvider).toBeTypeOf("function");
    expect(useMusicPlayerRuntime).toBeTypeOf("function");
  });
});
