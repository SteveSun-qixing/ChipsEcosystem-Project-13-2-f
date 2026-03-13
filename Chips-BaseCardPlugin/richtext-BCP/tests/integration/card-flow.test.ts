import { afterEach, describe, expect, it, vi } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("basecard integration flow (text basic)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates view when editor emits valid config", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      id: "test",
      title: "Initial",
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

    const titleInput = editorContainer.querySelector(
      ".chips-basecard-editor__input"
    ) as HTMLInputElement | null;

    if (!titleInput) {
      throw new Error("找不到标题输入框");
    }

    titleInput.value = "Updated";
    titleInput.dispatchEvent(new Event("input"));
    vi.advanceTimersByTime(130);

    const titleEl = container.querySelector(".chips-basecard__title");
    expect(titleEl?.textContent).toBe("Updated");
  });

  it("renders sanitized pasted content in the view", () => {
    vi.useFakeTimers();

    const container = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      id: "test",
      title: "Initial",
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
});
