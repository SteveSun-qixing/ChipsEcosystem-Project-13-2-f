import { afterEach, describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("basecard integration flow (text basic)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates view when editor emits valid body content without a title field", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      id: "test",
      body: "Body",
      locale: "zh-CN",
    };

    let currentConfig: BasecardConfig = initialConfig;

    mountBasecardView({
      container,
      config: currentConfig,
    });

    mountBasecardEditor({
      container: editorContainer,
      initialConfig,
      onChange: (next) => {
        currentConfig = next;
        mountBasecardView({
          container,
          config: currentConfig,
        });
      },
    });

    expect(
      editorContainer.querySelector(".chips-basecard-editor__input")
    ).toBeNull();
    expect(
      editorContainer.querySelector(".chips-basecard-editor__toolbar-shell")
    ).not.toBeNull();
    expect(
      editorContainer.querySelector(".chips-basecard-editor__floating-toolbar")
    ).toBeNull();

    const bodyEditor = editorContainer.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;

    if (!bodyEditor) {
      throw new Error("找不到正文编辑器");
    }

    bodyEditor.innerHTML = "<p>Updated Body</p>";
    bodyEditor.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(130);

    const bodyEl = container.querySelector(".chips-basecard__body");
    expect(bodyEl?.textContent).toContain("Updated Body");
  });

  it("renders sanitized pasted content in the view", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      id: "test",
      body: "<p>Body</p>",
      locale: "zh-CN",
    };

    let currentConfig: BasecardConfig = initialConfig;

    mountBasecardView({
      container,
      config: currentConfig,
    });

    mountBasecardEditor({
      container: editorContainer,
      initialConfig,
      onChange: (next) => {
        currentConfig = next;
        mountBasecardView({
          container,
          config: currentConfig,
        });
      },
    });

    const bodyEditor = editorContainer.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;

    if (!bodyEditor) {
      throw new Error("找不到正文编辑器");
    }

    const range = document.createRange();
    range.selectNodeContents(bodyEditor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const pasteEvent = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as ClipboardEvent;

    Object.defineProperty(pasteEvent, "clipboardData", {
      configurable: true,
      value: {
        getData(type: string) {
          if (type === "text/html") {
            return '<p>safe</p><script>alert(1)</script>';
          }
          return "";
        },
      },
    });

    bodyEditor.dispatchEvent(pasteEvent);
    vi.advanceTimersByTime(130);

    const bodyEl = container.querySelector(".chips-basecard__body");
    expect(bodyEl?.textContent).toContain("safe");
    expect(bodyEl?.innerHTML).not.toContain("script");
  });

  it("locks the editor document height chain to the local scroll container", () => {
    const container = document.createElement("div");
    const editorContainer = document.createElement("div");
    container.appendChild(editorContainer);

    const dispose = mountBasecardEditor({
      container: editorContainer,
      initialConfig: {
        id: "test",
        body: "<p>Body</p>",
        locale: "zh-CN",
      },
      onChange: () => undefined,
    });

    expect(document.documentElement.style.height).toBe("100%");
    expect(document.body.style.height).toBe("100%");
    expect(document.body.style.overflow).toBe("hidden");
    expect(editorContainer.style.height).toBe("100%");
    expect(editorContainer.style.overflow).toBe("hidden");

    dispose();
  });
});
