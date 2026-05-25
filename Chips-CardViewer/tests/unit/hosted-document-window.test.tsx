// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostedDocumentWindow } from "../../src/components/HostedDocumentWindow";

const hostedDocumentMock = vi.hoisted(() => ({
  emitted: [] as Array<{ event: string; payload: Record<string, unknown> }>,
  client: {
    events: {
      emit: vi.fn(async (event: string, payload: Record<string, unknown>) => {
        hostedDocumentMock.emitted.push({ event, payload });
      }),
    },
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

  function renderHostedDocument(documentUrl = "https://example.test/card.html") {
    root.render(
      <HostedDocumentWindow
        client={hostedDocumentMock.client as any}
        documentUrl={documentUrl}
        iframeTitle="托管卡片文档"
        loadingLabel="加载中"
        containerErrorLabel="容器错误"
        resourceOpenErrorTitle="资源错误"
        resourceOpenErrorFallback="打开失败"
      />,
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
      renderHostedDocument();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(latestResizePayload()).toMatchObject({
      height: 1128,
      contentHeight: 1128,
      safeBlockStart: 96,
      safeBlockEnd: 72,
      reason: "initial",
      stable: false,
    });
    expect(typeof latestResizePayload().viewportHeight).toBe("number");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    expect(latestResizePayload()).toMatchObject({
      height: 1128,
      contentHeight: 1128,
      safeBlockStart: 96,
      safeBlockEnd: 72,
      reason: "initial",
      stable: true,
    });
  });

  it("会把复合卡片高度变化归一为 content-resize，并对收缩等待 stable 发布", async () => {
    await act(async () => {
      renderHostedDocument();
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
      height: 1968,
      contentHeight: 1968,
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
      height: 1968,
      contentHeight: 1968,
      stable: false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    expect(frame.style.height).toBe("700px");
    expect(latestResizePayload()).toMatchObject({
      height: 868,
      contentHeight: 868,
      reason: "content-resize",
      stable: true,
    });
  });

  it("使用正式 sandbox 和 i18n iframe 标题，并记录允许的文档 origin", async () => {
    await act(async () => {
      renderHostedDocument("chips-render://session/card/index.html");
    });

    const frame = getHostedFrame();

    expect(frame.getAttribute("sandbox")).toBe("allow-scripts allow-forms");
    expect(frame.getAttribute("title")).toBe("托管卡片文档");
    expect(frame.dataset.chipsOrigin).toBe("null");
  });

  it("忽略来源不匹配的消息，但接受 sandbox opaque origin 消息", async () => {
    await act(async () => {
      renderHostedDocument();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(160);
    });

    const frame = getHostedFrame();
    hostedDocumentMock.emitted.length = 0;

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "https://evil.test",
          data: {
            type: "chips.composite:resize",
            payload: { height: 1400, reason: "node-height" },
          },
        }),
      );
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(hostedDocumentMock.emitted).toHaveLength(0);
    expect(hostedDocumentMock.logger.warn).toHaveBeenCalledWith(
      "已忽略来源不匹配的托管文档消息",
      expect.objectContaining({
        origin: "https://evil.test",
        expectedOrigin: "https://example.test",
      }),
    );

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "null",
          data: {
            type: "chips.composite:resize",
            payload: { height: 1400, reason: "node-height" },
          },
        }),
      );
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(latestResizePayload()).toMatchObject({
      contentHeight: 1400,
      stable: false,
    });
  });

  it("资源打开事件缺少 resourceId 时不调用 resource.open，并显示可诊断错误", async () => {
    await act(async () => {
      renderHostedDocument();
    });

    const frame = getHostedFrame();

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent("message", {
          source: frame.contentWindow,
          origin: "null",
          data: {
            type: "chips.composite:resource-open",
            payload: {
              intent: "view",
            },
          },
        }),
      );
      await Promise.resolve();
    });

    expect(hostedDocumentMock.client.resource.open).not.toHaveBeenCalled();
    expect(hostedDocumentMock.client.platform.showMessage).toHaveBeenCalledWith({
      title: "资源错误",
      message: "打开失败",
    });
  });
});
