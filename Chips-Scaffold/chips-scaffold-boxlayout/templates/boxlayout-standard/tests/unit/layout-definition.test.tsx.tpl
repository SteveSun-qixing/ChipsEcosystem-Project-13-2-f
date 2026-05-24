import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { layoutDefinition } from "../../src/index";
import type { BoxEntryPage, BoxEntrySnapshot, BoxLayoutRuntime } from "../../src/shared/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function createEntry(entryId: string, title: string, contentType = "chips/card"): BoxEntrySnapshot {
  return {
    entryId,
    url: `file:///tmp/${entryId}.card`,
    enabled: true,
    snapshot: {
      documentId: `document-${entryId}`,
      title,
      summary: "Summary",
      cover: {
        mode: "runtime",
      },
      contentType,
    },
  };
}

function createRuntime(overrides: Partial<BoxLayoutRuntime> = {}): BoxLayoutRuntime {
  return {
    listEntries: vi.fn().mockResolvedValue({
      items: [],
      total: 0,
    }),
    readEntryDetail: vi.fn(),
    renderEntryCover: vi.fn((entryId: string) => Promise.resolve({
      title: `Cover ${entryId}`,
      coverUrl: `chips-render://cover/${entryId}`,
      mimeType: "text/html",
      ratio: "3:4",
    })),
    resolveEntryResource: vi.fn(),
    readBoxAsset: vi.fn().mockResolvedValue({
      resourceUrl: "chips-render://asset/background",
      mimeType: "image/png",
    }),
    prefetchEntries: vi.fn().mockResolvedValue(undefined),
    openEntry: vi.fn().mockResolvedValue({
      mode: "document-window",
      documentType: "card",
      windowId: "window-1",
    }),
    ...overrides,
  };
}

async function renderView({
  container,
  initialView,
  runtime,
  config = layoutDefinition.createDefaultConfig(),
}: {
  container: HTMLElement;
  initialView: BoxEntryPage;
  runtime: BoxLayoutRuntime;
  config?: Record<string, unknown>;
}) {
  let cleanup: (() => void) | undefined;
  await act(async () => {
    const maybeCleanup = layoutDefinition.renderView({
      container,
      sessionId: "session-1",
      box: {
        boxId: "box-1",
        boxFile: "/tmp/demo.box",
        name: "Demo",
        activeLayoutType: "{{ LAYOUT_TYPE }}",
        availableLayouts: ["{{ LAYOUT_TYPE }}"],
      },
      initialView,
      config,
      runtime,
      locale: "zh-CN",
    });
    cleanup = typeof maybeCleanup === "function" ? maybeCleanup : undefined;
    await Promise.resolve();
  });
  return cleanup ?? (() => undefined);
}

describe("layoutDefinition", () => {
  it("renders initial view, loads covers, prefetches and opens entries through runtime", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const runtime = createRuntime();
    const cleanup = await renderView({
      container,
      runtime,
      initialView: {
        items: [createEntry("entry-1", "Demo Card")],
        total: 1,
      },
    });

    expect(container.textContent).toContain("Demo Card");
    expect(container.querySelector('[data-scope="chips-box-grid-layout"]')).toBeTruthy();
    expect(container.querySelector('[data-scope="embedded-document-frame"]')).toBeTruthy();
    expect(container.querySelector('[data-scope="card-cover-frame"]')).toBeNull();
    expect(container.textContent).not.toContain("Summary");
    expect(runtime.listEntries).not.toHaveBeenCalled();
    expect(runtime.renderEntryCover).toHaveBeenCalledWith("entry-1");
    expect(runtime.prefetchEntries).toHaveBeenCalledWith({
      entryIds: ["entry-1"],
      targets: ["cover"],
    });

    container
      .querySelector('[data-grid-entry-title]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(runtime.openEntry).toHaveBeenCalledWith("entry-1");

    await act(async () => {
      cleanup?.();
    });
    expect(container.textContent ?? "").toBe("");
  });

  it("loads additional pages and keeps existing entries when pagination fails", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const listEntries = vi.fn()
      .mockResolvedValueOnce({
        items: [createEntry("entry-2", "Beta")],
        total: 2,
        nextCursor: "cursor-2",
      })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        items: [],
        total: 2,
      });
    const runtime = createRuntime({ listEntries });

    await renderView({
      container,
      runtime,
      initialView: {
        items: [createEntry("entry-1", "Alpha")],
        total: 2,
        nextCursor: "cursor-1",
      },
    });

    const loadMore = container.querySelector('[data-layout-load-more]');
    expect(loadMore).toBeTruthy();
    await act(async () => {
      loadMore?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(listEntries).toHaveBeenCalledWith({
      cursor: "cursor-1",
      limit: 48,
    });
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("Beta");

    await act(async () => {
      container
        .querySelector('[data-layout-load-more]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("Beta");
    expect(container.textContent).toContain("后续条目加载失败");

    await act(async () => {
      container
        .querySelector('[data-layout-retry]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    expect(listEntries).toHaveBeenCalledTimes(3);
  });

  it("renders cover failures and box entries without card-specific wrappers", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const runtime = createRuntime({
      renderEntryCover: vi.fn().mockRejectedValue(new Error("cover failed")),
    });

    await renderView({
      container,
      runtime,
      initialView: {
        items: [createEntry("entry-box", "Nested Box", "chips/box")],
        total: 1,
      },
    });

    expect(container.textContent).toContain("封面加载失败");
    expect(container.textContent).toContain("箱子");
    expect(container.querySelector('[data-scope="card-cover-frame"]')).toBeNull();
  });

  it("reads box assets for configured frame regions", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const runtime = createRuntime();
    const config = layoutDefinition.normalizeConfig({
      schemaVersion: "1.0.0",
      props: {
        sortMode: "manual",
        background: {
          mode: "image",
          assetPath: "assets/layouts/grid/background.png",
        },
        topRegion: {
          mode: "html",
          html: "<section>Top</section>",
        },
      },
    });

    await renderView({
      container,
      runtime,
      config,
      initialView: {
        items: [],
        total: 0,
      },
    });

    expect(runtime.readBoxAsset).toHaveBeenCalledWith("assets/layouts/grid/background.png");
    expect(container.querySelector('[data-layout-background] img')).toBeTruthy();
    expect(container.querySelector('[data-layout-top-region] [data-scope="embedded-document-frame"]')).toBeTruthy();
  });

  it("does not update the DOM after cleanup while runtime promises are pending", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let resolveCover: ((value: {
      title: string;
      coverUrl: string;
      mimeType: string;
    }) => void) | undefined;
    const renderEntryCover = vi.fn(() => new Promise<{
      title: string;
      coverUrl: string;
      mimeType: string;
    }>((resolve) => {
      resolveCover = resolve;
    }));
    const runtime = createRuntime({ renderEntryCover });

    const cleanup = await renderView({
      container,
      runtime,
      initialView: {
        items: [createEntry("entry-1", "Demo Card")],
        total: 1,
      },
    });

    await act(async () => {
      cleanup?.();
    });
    await act(async () => {
      resolveCover?.({
        title: "Late Cover",
        coverUrl: "chips-render://late",
        mimeType: "text/html",
      });
      await Promise.resolve();
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

    const select = container.querySelector("select");
    expect(select).toBeTruthy();
    expect(container.querySelector('input[type="number"]')).toBeNull();
    await act(async () => {
      cleanup?.();
    });
  });
});
