import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { layoutDefinition } from "../../src/index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("layoutDefinition", () => {
  it("renders view, loads cover and cleans up", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const renderEntryCover = vi.fn().mockResolvedValue({
      title: "Demo Card",
      coverUrl: "file:///tmp/demo-cover.png",
      mimeType: "image/png",
    });
    const openEntry = vi.fn().mockResolvedValue({
      mode: "card-window",
      windowId: "window-1",
    });

    let cleanup: (() => void) | void;
    await act(async () => {
      cleanup = layoutDefinition.renderView({
        container,
        sessionId: "session-1",
        box: {
          boxId: "box-1",
          boxFile: "/tmp/demo.box",
          name: "Demo",
          activeLayoutType: "chips.layout.grid",
          availableLayouts: ["chips.layout.grid"],
        },
        initialView: {
          items: [
            {
              entryId: "entry-1",
              url: "file:///tmp/demo.card",
              enabled: true,
              snapshot: {
                title: "Demo Card",
                summary: "Summary",
                cover: {
                  mode: "runtime",
                },
              },
            },
          ],
          total: 1,
        },
        config: layoutDefinition.createDefaultConfig(),
        runtime: {
          listEntries: vi.fn(),
          readEntryDetail: vi.fn(),
          renderEntryCover,
          resolveEntryResource: vi.fn(),
          readBoxAsset: vi.fn(),
          prefetchEntries: vi.fn(),
          openEntry,
        },
        locale: "zh-CN",
      });
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Demo Card");
    const tile = container.querySelector('[data-entry-id="entry-1"]');
    expect(tile).toBeTruthy();
    expect(container.querySelector('[data-scope="card-cover-frame"]')).toBeTruthy();
    expect(container.textContent).not.toContain("Summary");
    expect(renderEntryCover).toHaveBeenCalledWith("entry-1");
    tile?.querySelector('[data-grid-entry-title]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(openEntry).toHaveBeenCalledWith("entry-1");
    await act(async () => {
      cleanup?.();
    });
    expect(container.textContent ?? "").toBe("");
  });

  it("renders editor and emits config changes", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onChange = vi.fn();

    let cleanup: (() => void) | void;
    await act(async () => {
      cleanup = layoutDefinition.renderEditor?.({
        container,
        entries: [],
        initialConfig: layoutDefinition.createDefaultConfig(),
        onChange,
        locale: "zh-CN",
      });
    });

    const input = container.querySelector('input[type="number"]');
    expect(input).toBeTruthy();
    await act(async () => {
      cleanup?.();
    });
  });
});
