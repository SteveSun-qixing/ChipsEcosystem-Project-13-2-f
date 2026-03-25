import { describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";
import { VIEW_STYLE_TEXT } from "../../src/render/view";

function createConfig(overrides: Partial<BasecardConfig> = {}): BasecardConfig {
  return {
    card_type: "RichTextCard",
    content_format: "markdown",
    content_source: "inline",
    content_text: "Hello world",
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

describe("mountBasecardView (richtext)", () => {
  it("renders markdown content through the readonly Milkdown runtime", async () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        content_text: `# 标题

这是 **安全** 内容。`,
      }),
    });

    await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

    const surface = container.querySelector(".chips-richtext-card__surface");
    expect(surface?.textContent).toContain("标题");
    expect(surface?.textContent).toContain("安全");

    dispose();
  });

  it("loads file-backed markdown through resolveResourceUrl + fetch", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => `## 文件正文

来自 Markdown 文件` }));
    vi.stubGlobal("fetch", fetchMock);

    const container = document.createElement("div");
    const dispose = mountBasecardView({
      container,
      config: createConfig({
        content_source: "file",
        content_file: "richtext-base-1.md",
        content_text: undefined,
      }),
      resolveResourceUrl: async (resourcePath) => `file://${resourcePath}`,
    });

    await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

    expect(fetchMock).toHaveBeenCalledWith("file://richtext-base-1.md");
    expect(container.textContent).toContain("文件正文");
    dispose();
    vi.unstubAllGlobals();
  });

  it("keeps the preview shell transparent without outline or rounded card chrome", () => {
    expect(VIEW_STYLE_TEXT).toContain("background: transparent;");
    expect(VIEW_STYLE_TEXT).not.toContain("border: 1px solid");
    expect(VIEW_STYLE_TEXT).not.toContain("box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);");
  });
});
