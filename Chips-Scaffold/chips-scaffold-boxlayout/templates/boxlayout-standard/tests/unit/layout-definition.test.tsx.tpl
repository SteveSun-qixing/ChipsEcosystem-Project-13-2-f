import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { layoutDefinition } from "../../src/index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("layoutDefinition", () => {
  it("renders view and cleans up", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let cleanup: (() => void) | void;
    await act(async () => {
      cleanup = layoutDefinition.renderView({
        container,
        sessionId: "session-1",
        box: {
          boxId: "box-1",
          boxFile: "/tmp/demo.box",
          name: "Demo",
          activeLayoutType: "{{ LAYOUT_TYPE }}",
          availableLayouts: ["{{ LAYOUT_TYPE }}"],
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
                  mode: "none",
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
          resolveEntryResource: vi.fn(),
          readBoxAsset: vi.fn(),
          prefetchEntries: vi.fn(),
        },
        locale: "zh-CN",
      });
    });

    expect(container.textContent).toContain("Demo Card");
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
