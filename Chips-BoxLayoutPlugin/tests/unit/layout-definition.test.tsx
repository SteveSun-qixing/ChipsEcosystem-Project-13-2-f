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
      mode: "document-window",
      documentType: "card",
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
                contentType: "chips/card",
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
          prefetchEntries: vi.fn().mockResolvedValue(undefined),
          openEntry,
        },
        locale: "zh-CN",
      });
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Demo Card");
    const tile = container.querySelector('[data-entry-id="entry-1"]');
    expect(tile).toBeTruthy();
    expect(tile?.querySelector('[data-grid-entry-title]')?.textContent).toBe("Demo Card");
    expect(tile?.querySelector('[data-grid-entry-kind]')).toBeNull();
    expect(tile?.querySelector('[data-grid-entry-summary]')).toBeNull();
    expect(container.querySelector('[data-scope="embedded-document-frame"]')).toBeTruthy();
    expect(renderEntryCover).toHaveBeenCalledWith("entry-1");
    tile?.querySelector('[data-grid-entry-title]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(openEntry).toHaveBeenCalledWith("entry-1");
    await act(async () => {
      cleanup?.();
    });
    expect(container.textContent ?? "").toBe("");
  });

  it("sorts entries by title when ascending mode is enabled", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const config = layoutDefinition.normalizeConfig({
      schemaVersion: "1.0.0",
      props: {
        sortMode: "name-asc",
        background: {
          mode: "none",
        },
        topRegion: {
          mode: "none",
        },
      },
    });

    await act(async () => {
      layoutDefinition.renderView({
        container,
        sessionId: "session-sort",
        box: {
          boxId: "box-sort",
          boxFile: "/tmp/sort.box",
          name: "Sort Box",
          activeLayoutType: "chips.layout.grid",
          availableLayouts: ["chips.layout.grid"],
        },
        initialView: {
          items: [
            {
              entryId: "entry-b",
              url: "file:///tmp/b.card",
              enabled: true,
              snapshot: {
                title: "Beta",
                cover: {
                  mode: "none",
                },
                contentType: "chips/card",
              },
            },
            {
              entryId: "entry-a",
              url: "file:///tmp/a.card",
              enabled: true,
              snapshot: {
                title: "Alpha",
                cover: {
                  mode: "none",
                },
                contentType: "chips/card",
              },
            },
          ],
          total: 2,
        },
        config,
        runtime: {
          listEntries: vi.fn(),
          readEntryDetail: vi.fn(),
          renderEntryCover: vi.fn(),
          resolveEntryResource: vi.fn(),
          readBoxAsset: vi.fn(),
          prefetchEntries: vi.fn().mockResolvedValue(undefined),
          openEntry: vi.fn(),
        },
        locale: "zh-CN",
      });
      await Promise.resolve();
    });

    const titles = Array.from(container.querySelectorAll('[data-grid-entry-title]')).map((node) => node.textContent);
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  it("renders editor without exposing numeric column controls", async () => {
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

    expect(container.querySelector('select')).toBeTruthy();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    expect(container.textContent).toContain("移动端固定为两列");

    await act(async () => {
      cleanup?.();
    });
  });

  it("keeps the layout shell visible when the box has no entries", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      layoutDefinition.renderView({
        container,
        sessionId: "session-empty",
        box: {
          boxId: "box-empty",
          boxFile: "/tmp/empty.box",
          name: "Empty Box",
          activeLayoutType: "chips.layout.grid",
          availableLayouts: ["chips.layout.grid"],
        },
        initialView: {
          items: [],
          total: 0,
        },
        config: layoutDefinition.createDefaultConfig(),
        runtime: {
          listEntries: vi.fn(),
          readEntryDetail: vi.fn(),
          renderEntryCover: vi.fn(),
          resolveEntryResource: vi.fn(),
          readBoxAsset: vi.fn(),
          prefetchEntries: vi.fn().mockResolvedValue(undefined),
          openEntry: vi.fn(),
        },
        locale: "zh-CN",
      });
      await Promise.resolve();
    });

    expect(container.querySelector('[data-scope="chips-box-grid-layout"]')).toBeTruthy();
    expect(container.querySelector('[data-layout-grid]')).toBeTruthy();
    expect(container.textContent).toContain("暂无条目");
  });
});
