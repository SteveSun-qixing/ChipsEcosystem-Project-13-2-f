import { describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

function createConfig(overrides: Partial<BasecardConfig> = {}): BasecardConfig {
  return {
    card_type: "RichTextCard",
    content_format: "markdown",
    content_source: "inline",
    content_text: "Body",
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

describe("basecard integration flow (markdown richtext)", () => {
  it("mounts both readonly view and Milkdown editor on the same config model", async () => {
    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig = createConfig({
      content_text: `# 标题

集成测试正文`,
    });

    const disposeView = mountBasecardView({
      container,
      config: initialConfig,
    });

    const disposeEditor = mountBasecardEditor({
      container: editorContainer,
      initialConfig,
      onChange: vi.fn(),
    });

    await waitFor(() => Boolean(container.querySelector(".ProseMirror")));
    await waitFor(() => Boolean(editorContainer.querySelector(".ProseMirror")));

    expect(container.textContent).toContain("标题");
    expect(editorContainer.textContent).toContain("集成测试正文");
    expect(editorContainer.querySelector(".chips-basecard-editor__floating-toolbar")).not.toBeNull();

    disposeEditor();
    disposeView();
  });

  it("passes resolveResourceUrl through the editor runtime wrapper for file-backed markdown", async () => {
    const editorContainer = document.createElement("div");
    const resolveResourceUrl = vi.fn(async (resourcePath: string) => {
      expect(resourcePath).toBe("docs/runtime-wrapper.md");
      return "file:///workspace/docs/runtime-wrapper.md";
    });
    const previousChips = (window as typeof window & {
      chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
    }).chips;
    (window as typeof window & {
      chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
    }).chips = {
      invoke: vi.fn(async () => ({ content: "# Runtime Wrapper\n\n来自统一资源 URL" })),
    };

    try {
      const disposeEditor = mountBasecardEditor({
        container: editorContainer,
        initialConfig: createConfig({
          content_source: "file",
          content_file: "docs/runtime-wrapper.md",
          content_text: undefined,
        }),
        onChange: vi.fn(),
        resolveResourceUrl,
      });

      await waitFor(() => Boolean(editorContainer.querySelector(".ProseMirror")));

      expect(resolveResourceUrl).toHaveBeenCalledWith("docs/runtime-wrapper.md");
      expect(editorContainer.textContent).toContain("Runtime Wrapper");

      disposeEditor();
    } finally {
      (window as typeof window & {
        chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
      }).chips = previousChips;
    }
  });
});
