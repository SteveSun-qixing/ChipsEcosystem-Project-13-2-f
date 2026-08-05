// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ViewerCoverSurface } from "../../src/components/ViewerCoverSurface";

const coverSurfaceMock = vi.hoisted(() => ({
  client: {
    events: {
      emit: vi.fn(async () => undefined),
      on: vi.fn(() => () => undefined),
      once: vi.fn(() => () => undefined),
    },
  },
}));

describe("ViewerCoverSurface（封面 Surface 高度协议）", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.clearAllMocks();
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

  it("挂载后会向 Web 宿主发布封面 surface 高度并补发 stable=true", async () => {
    await act(async () => {
      root.render(
        <ViewerCoverSurface
          client={coverSurfaceMock.client}
          cover={{
            title: "卡片封面",
            coverUrl: "https://example.test/cover.html",
            ratio: "3:4",
          }}
          title="社区卡片"
          closeLabel="点击封面返回内容"
          unavailableLabel="当前文档没有可用封面。"
          onClose={() => undefined}
        />,
      );
      await Promise.resolve();
    });

    expect(coverSurfaceMock.client.events.emit).toHaveBeenCalledWith(
      "plugin.surface.resize",
      expect.objectContaining({
        height: expect.any(Number),
        contentHeight: expect.any(Number),
        reason: "content-resize",
        stable: false,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(180);
    });

    expect(coverSurfaceMock.client.events.emit).toHaveBeenCalledWith(
      "plugin.surface.resize",
      expect.objectContaining({
        height: expect.any(Number),
        contentHeight: expect.any(Number),
        reason: "content-resize",
        stable: true,
      }),
    );
  });
});
