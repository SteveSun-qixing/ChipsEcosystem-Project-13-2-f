import { afterEach, describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardEditorRoot (text basic)", () => {
  const originalExecCommand = (
    document as Document & {
      execCommand?: (name: string, showUi?: boolean, value?: string) => boolean;
    }
  ).execCommand;

  afterEach(() => {
    vi.useRealTimers();

    if (originalExecCommand) {
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: originalExecCommand,
      });
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }
  });

  it("emits changes while the user is typing", () => {
    vi.useFakeTimers();

    const initialConfig: BasecardConfig = {
      id: "test",
      title: "",
      body: "<p></p>",
      locale: "zh-CN",
    };

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const bodyEditor = root.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;

    if (!bodyEditor) {
      throw new Error("找不到正文编辑器");
    }

    bodyEditor.innerHTML = "<p>实时内容</p>";
    bodyEditor.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(130);

    expect(lastConfig?.title).toBe("");
    expect(lastConfig?.body).toContain("实时内容");
  });

  it("keeps the toolbar outside of the scrollable editor region", () => {
    const initialConfig: BasecardConfig = {
      id: "test",
      title: "Toolbar",
      body: "<p>Body</p>",
      locale: "zh-CN",
    };

    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: () => undefined,
    });

    const toolbar = root.querySelector(
      ".chips-basecard-editor__toolbar"
    ) as HTMLDivElement | null;
    const bodyScroll = root.querySelector(
      ".chips-basecard-editor__body-scroll"
    ) as HTMLDivElement | null;

    expect(toolbar).not.toBeNull();
    expect(bodyScroll).not.toBeNull();
    expect(bodyScroll?.contains(toolbar as Node)).toBe(false);
  });

  it("flushes pending changes when fields lose focus", () => {
    const initialConfig: BasecardConfig = {
      id: "test",
      title: "Title",
      body: "Body",
      locale: "zh-CN",
    };

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const titleInput = root.querySelector(
      ".chips-basecard-editor__input"
    ) as HTMLInputElement | null;

    if (!titleInput) {
      throw new Error("找不到标题输入框");
    }

    titleInput.value = "New Title";
    titleInput.dispatchEvent(new Event("input"));
    titleInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(lastConfig?.title).toBe("New Title");
  });

  it("applies formatting commands through the fixed toolbar", () => {
    const execCommandMock = vi.fn((command: string) => {
      if (command !== "bold") {
        return true;
      }

      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || range.collapsed) {
        return true;
      }

      const strong = document.createElement("strong");
      try {
        range.surroundContents(strong);
      } catch {
        return false;
      }

      return true;
    });

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommandMock,
    });

    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        title: "Title",
        body: "<p>Alpha Beta</p>",
        locale: "zh-CN",
      },
      onChange: () => undefined,
    });

    const bodyEditor = root.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;
    const boldButton = Array.from(
      root.querySelectorAll(".chips-basecard-editor__toolbar-button")
    ).find((button) => button.getAttribute("aria-label") === "加粗");

    if (!bodyEditor || !boldButton) {
      throw new Error("找不到富文本编辑器工具栏");
    }

    const textNode = bodyEditor.querySelector("p")?.firstChild;
    if (!textNode) {
      throw new Error("找不到正文文本节点");
    }

    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    bodyEditor.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    boldButton.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    boldButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(execCommandMock).toHaveBeenCalledWith("bold", false, undefined);
  });

  it("sanitizes pasted rich text before emitting config changes", () => {
    vi.useFakeTimers();

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        title: "Title",
        body: "<p>Start</p>",
        locale: "zh-CN",
      },
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const bodyEditor = root.querySelector(
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
            return '<p>safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>';
          }
          if (type === "text/plain") {
            return "safe";
          }
          return "";
        },
      },
    });

    bodyEditor.dispatchEvent(pasteEvent);
    vi.advanceTimersByTime(130);

    expect(lastConfig?.body).toContain("safe");
    expect(lastConfig?.body).not.toContain("script");
    expect(lastConfig?.body).not.toContain("javascript:");
  });
});
