// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedDocumentWindow } from "../../src/components/HostedDocumentWindow";

const hostedDocumentMock = vi.hoisted(() => ({
  emitted: [] as Array<{ event: string; payload: Record<string, unknown> }>,
  bridge: {
    on: vi.fn(() => () => undefined),
    emit: vi.fn(async (event: string, payload: Record<string, unknown>) => {
      hostedDocumentMock.emitted.push({ event, payload });
    }),
  },
  client: {
    resource: {
      open: vi.fn(async () => undefined),
    },
    platform: {
      showMessage: vi.fn(async () => undefined),
    },
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../src/hooks/useChipsBridge", () => ({
  useChipsBridge: () => hostedDocumentMock.bridge,
}));

vi.mock("../../src/hooks/useChipsClient", () => ({
  useChipsClient: () => hostedDocumentMock.client,
}));

vi.mock("../../config/logging", () => ({
  createScopedLogger: () => hostedDocumentMock.logger,
}));

describe("HostedDocumentWindow（文档 Surface 高度协议）", () => {
  let container: HTMLDivElement;
  let root: Root;

  function latestResizePayload() {
    const entry = hostedDocumentMock.emitted.at(-1);
    expect(entry?.event).toBe("plugin.surface.resize");
    return entry?.payload ?? {};
  }

  function getHostedFrame() {
    const frame = container.querySelector("iframe");
    expect(frame).toBeInstanceOf(HTMLIFrameElement);
    return frame as HTMLIFrameElement;
  }

  function dispatchCompositeResize(frame: HTMLIFrameElement, height: number, reason = "node-height") {
    window.dispatchEvent(
      new MessageEvent("message", {
        source: frame.contentWindow,
        origin: "null",
        data: {
          type: "chips.composite:resize",
          payload: {
            height,
            reason,
          },
        },
      }),
    );
  }

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    hostedDocumentMock.emitted.length = 0;
    vi.clearAllMocks();
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((handle: number) => {
      window.clearTimeout(handle);
    }) as typeof window.cancelAnimationFrame;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("初始发布完整的文档 surface resize 载荷，并在稳定窗口后发布 stable=true", async () => {
    await act(async () => {
      root.render(
        <HostedDocumentWindow
          documentUrl="https://example.test/card.html"
          loadingLabel="加载中"
          containerErrorLabel="容器错误"
          resourceOpenErrorTitle="资源错误"
          resourceOpenErrorFallback="打开失败"
        />,
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(latestResizePayload()).toMatchObject({
      height: 1032,
      contentHeight: 960,
      safeBlockEnd: 72,
      reason: "initial",
      stable: false,
    });
    expect(typeof latestResizePayload().viewportHeight).toBe("number");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    expect(latestResizePayload()).toMatchObject({
      height: 1032,
      contentHeight: 960,
      safeBlockEnd: 72,
      reason: "initial",
      stable: true,
    });
  });

  it("会把复合卡片高度变化归一为 content-resize，并对收缩等待 stable 发布", async () => {
    await act(async () => {
      root.render(
        <HostedDocumentWindow
          documentUrl="https://example.test/card.html"
          loadingLabel="加载中"
          containerErrorLabel="容器错误"
          resourceOpenErrorTitle="资源错误"
          resourceOpenErrorFallback="打开失败"
        />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    const frame = getHostedFrame();
    await act(async () => {
      dispatchCompositeResize(frame, 1800);
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });

    expect(latestResizePayload()).toMatchObject({
      height: 1872,
      contentHeight: 1800,
      reason: "content-resize",
      stable: false,
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(frame.style.height).toBe("1800px");

    await act(async () => {
      dispatchCompositeResize(frame, 700);
      await vi.advanceTimersByTimeAsync(1);
      await Promise.resolve();
    });

    expect(frame.style.height).toBe("1800px");
    expect(latestResizePayload()).toMatchObject({
      height: 1872,
      contentHeight: 1800,
      stable: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    expect(frame.style.height).toBe("700px");
    expect(latestResizePayload()).toMatchObject({
      height: 772,
      contentHeight: 700,
      reason: "content-resize",
      stable: true,
    });
  });
});
