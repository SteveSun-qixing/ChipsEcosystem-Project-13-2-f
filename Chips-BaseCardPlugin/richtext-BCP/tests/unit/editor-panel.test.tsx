import { describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

function createConfig(overrides: Partial<BasecardConfig> = {}): BasecardConfig {
  return {
    card_type: "RichTextCard",
    content_format: "markdown",
    content_source: "inline",
    content_text: "初始内容",
    locale: "zh-CN",
    theme: "",
    ...overrides,
  };
}

async function waitFor(condition: () => boolean, timeout = 3000): Promise<void> {
  const started = Date.now();
  while (!condition()) {
    if (Date.now() - started > timeout) {
      throw new Error("waitFor timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("createBasecardEditorRoot (Milkdown)", () => {
  it("renders a compact icon-only floating toolbar", async () => {
    const root = createBasecardEditorRoot({
      initialConfig: createConfig(),
      onChange: () => undefined,
    });

    await waitFor(() => Boolean(root.querySelector(".ProseMirror")));

    const toolbar = root.querySelector(".chips-basecard-editor__floating-toolbar");
    const toolbarButtons = Array.from(root.querySelectorAll(".chips-basecard-editor__toolbar-button"));

    expect(toolbar).not.toBeNull();
    expect(root.querySelector(".chips-basecard-editor__toolbar-shell")).toBeNull();
    expect(root.querySelector(".chips-basecard-editor__toolbar-panel")).toBeNull();
    expect(root.querySelector(".chips-basecard-editor__surface")).not.toBeNull();
    expect(toolbarButtons).toHaveLength(5);
    toolbarButtons.forEach((button) => {
      expect(button.querySelector(".chips-basecard-editor__toolbar-button-icon")).not.toBeNull();
      expect(button.childElementCount).toBe(1);
    });
    expect(root.querySelector(".chips-basecard-editor__editor-host .ProseMirror")?.textContent).toContain("初始内容");
  });

  it("loads file-backed markdown into the editor runtime", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => `# 长文

来自文件` }));
    vi.stubGlobal("fetch", fetchMock);

    const root = createBasecardEditorRoot({
      initialConfig: createConfig({
        content_source: "file",
        content_file: "richtext-base-2.md",
        content_text: undefined,
      }),
      onChange: () => undefined,
      resolveResourceUrl: async (resourcePath) => `file://${resourcePath}`,
    });

    await waitFor(() => Boolean(root.querySelector(".ProseMirror")));

    expect(fetchMock).toHaveBeenCalledWith("file://richtext-base-2.md");
    expect(root.textContent).toContain("长文");
    vi.unstubAllGlobals();
  });

  it("shows validation errors for empty inline markdown", async () => {
    const root = createBasecardEditorRoot({
      initialConfig: createConfig({
        content_text: "",
      }),
      onChange: () => undefined,
    });

    await waitFor(() => Boolean(root.querySelector(".ProseMirror")));
    await waitFor(() => Boolean(root.querySelector(".chips-basecard-editor__errors:not([hidden])")));

    expect(root.textContent).toContain("内容不能为空");
  });

  it("shows tooltip on toolbar hover and opens the editor context menu on right click", async () => {
    const root = createBasecardEditorRoot({
      initialConfig: createConfig(),
      onChange: () => undefined,
    });

    await waitFor(() => Boolean(root.querySelector(".ProseMirror")));

    const firstToolbarButton = root.querySelector(".chips-basecard-editor__toolbar-button") as HTMLButtonElement | null;
    const tooltipLayer = root.querySelector(".chips-basecard-editor__tooltip-layer") as HTMLDivElement | null;
    const tooltipContent = root.querySelector('[data-scope="tooltip"][data-part="content"]') as HTMLDivElement | null;
    const editorDom = root.querySelector(".ProseMirror") as HTMLDivElement | null;

    expect(firstToolbarButton).not.toBeNull();
    expect(tooltipLayer).not.toBeNull();
    expect(tooltipContent).not.toBeNull();
    expect(editorDom).not.toBeNull();

    firstToolbarButton?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(tooltipLayer?.hidden).toBe(false);
    expect(tooltipContent?.textContent).toBe("加粗");

    editorDom?.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      clientX: 80,
      clientY: 64,
    }));

    await waitFor(() => Boolean(root.querySelector(".chips-basecard-editor__context-menu:not([hidden])")));
    expect(root.querySelector('[data-scope="menu"][data-part="content"]')).not.toBeNull();
    expect(root.textContent).toContain("标题 1");
  });
});
