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
  it("uses a floating toolbar instead of the old top toolbar shell", async () => {
    const root = createBasecardEditorRoot({
      initialConfig: createConfig(),
      onChange: () => undefined,
    });

    await waitFor(() => Boolean(root.querySelector(".ProseMirror")));

    expect(root.querySelector(".chips-basecard-editor__floating-toolbar")).not.toBeNull();
    expect(root.querySelector(".chips-basecard-editor__toolbar-shell")).toBeNull();
    expect(root.querySelector(".chips-basecard-editor__toolbar-panel")).toBeNull();
    expect(root.querySelector(".chips-basecard-editor__surface")).not.toBeNull();
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
});
