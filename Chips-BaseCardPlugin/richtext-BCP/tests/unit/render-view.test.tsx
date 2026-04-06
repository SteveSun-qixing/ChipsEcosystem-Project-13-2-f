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

  it("loads file-backed markdown through fetch when runtime URL is network-like", async () => {
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
      resolveResourceUrl: async (resourcePath) => `https://runtime.example/${resourcePath}`,
    });

    await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

    expect(fetchMock).toHaveBeenCalledWith("https://runtime.example/richtext-base-1.md");
    expect(container.textContent).toContain("文件正文");
    dispose();
    vi.unstubAllGlobals();
  });

  it("reads file-backed markdown through bridge file.read when runtime URL is file://", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const previousChips = (window as typeof window & {
      chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
    }).chips;
    try {
      (window as typeof window & {
        chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
      }).chips = {
        invoke: vi.fn(async (route: string, input?: Record<string, unknown>) => {
          expect(route).toBe("file.read");
          expect(input?.path).toBe("/card-root/richtext-base-4.md");
          return { content: "## Bridge 文件正文\n\n来自正式文件服务" };
        }),
      };

      const container = document.createElement("div");
      const dispose = mountBasecardView({
        container,
        config: createConfig({
          content_source: "file",
          content_file: "richtext-base-4.md",
          content_text: undefined,
        }),
        resolveResourceUrl: async () => "file:///card-root/richtext-base-4.md",
      });

      await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

      expect(fetchMock).not.toHaveBeenCalled();
      expect(container.textContent).toContain("Bridge 文件正文");
      dispose();
    } finally {
      (window as typeof window & {
        chips?: { invoke?: (route: string, input?: Record<string, unknown>) => Promise<unknown> };
      }).chips = previousChips;
      vi.unstubAllGlobals();
    }
  });

  it("reads preview markdown from the resolved runtime resource url", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("blob:file:///pending-richtext-base-6");
      return {
        ok: true,
        text: async () => "## 只读待落盘正文\n\n来自运行时资源 URL",
      } as Response;
    });
    const resolveResourceUrl = vi.fn(async () => "blob:file:///pending-richtext-base-6");
    vi.stubGlobal("fetch", fetchMock);

    try {
      const container = document.createElement("div");
      const dispose = mountBasecardView({
        container,
        config: createConfig({
          content_source: "file",
          content_file: "richtext-base-6.md",
          content_text: undefined,
        }),
        resolveResourceUrl,
      });

      await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

      expect(resolveResourceUrl).toHaveBeenCalledWith("richtext-base-6.md");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(container.textContent).toContain("只读待落盘正文");
      dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders extended markdown syntax blocks and marks", async () => {
    const container = document.createElement("div");

    const dispose = mountBasecardView({
      container,
      config: createConfig({
        content_text: `~~删除线~~

==高亮==

++下划线++

2^10^

H~2~O

| 列 1 | 列 2 |
| --- | --- |
| A | B |

\`\`\`ts
const answer = 42;
\`\`\`

$$
\\frac{a}{b}
$$`,
      }),
    });

    await waitFor(() => Boolean(container.querySelector(".ProseMirror")));

    await waitFor(() => Boolean(container.querySelector(".ProseMirror del")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror mark")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror u, .ProseMirror ins")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror sup")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror sub")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror table")));
    await waitFor(() => Boolean(container.querySelector(".ProseMirror pre")));
    await waitFor(() => Boolean(container.querySelector('.ProseMirror [data-chips-richtext-math="block"]')));

    expect(container.querySelector(".ProseMirror del")?.textContent).toContain("删除线");
    expect(container.querySelector(".ProseMirror mark")?.textContent).toContain("高亮");
    expect(container.querySelector(".ProseMirror u, .ProseMirror ins")?.textContent).toContain("下划线");
    expect(container.querySelector(".ProseMirror sup")?.textContent).toContain("10");
    expect(container.querySelector(".ProseMirror sub")?.textContent).toContain("2");
    expect(container.querySelector(".ProseMirror table")?.textContent).toContain("列 1");
    expect(container.querySelector(".ProseMirror pre code")?.textContent).toContain("const answer = 42;");

    dispose();
  });

  it("keeps the preview shell transparent without outline or rounded card chrome", () => {
    expect(VIEW_STYLE_TEXT).toContain("background: transparent;");
    expect(VIEW_STYLE_TEXT).not.toContain(".chips-richtext-card {\n  border:");
    expect(VIEW_STYLE_TEXT).not.toContain(".chips-richtext-card__surface {\n  border:");
    expect(VIEW_STYLE_TEXT).not.toContain("box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);");
  });
});
