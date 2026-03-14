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

    expect(lastConfig?.body).toContain("实时内容");
  });

  it("keeps the toolbar in a dedicated top region above the scrollable editor surface", () => {
    const initialConfig: BasecardConfig = {
      id: "test",
      body: "<p>Body</p>",
      locale: "zh-CN",
    };

    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: () => undefined,
    });

    const toolbarShell = root.querySelector(
      ".chips-basecard-editor__toolbar-shell"
    ) as HTMLDivElement | null;
    const toolbarPanel = root.querySelector(
      ".chips-basecard-editor__toolbar-panel"
    ) as HTMLDivElement | null;
    const surfaceFrame = root.querySelector(
      ".chips-basecard-editor__surface-frame"
    ) as HTMLDivElement | null;
    const scrollSurface = root.querySelector(
      ".chips-basecard-editor__surface"
    ) as HTMLDivElement | null;

    expect(toolbarShell).not.toBeNull();
    expect(toolbarPanel).not.toBeNull();
    expect(surfaceFrame).not.toBeNull();
    expect(scrollSurface).not.toBeNull();
    expect(surfaceFrame?.contains(toolbarShell as Node)).toBe(false);
    expect(scrollSurface?.contains(toolbarShell as Node)).toBe(false);
    expect(root.querySelector(".chips-basecard-editor__input")).toBeNull();
    expect(root.children.item(1)).toBe(toolbarShell);
    expect(root.children.item(2)).toBe(surfaceFrame);
  });

  it("supports collapsing the top toolbar into a compact strip", () => {
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        body: "<p>Body</p>",
        locale: "zh-CN",
      },
      onChange: () => undefined,
    });

    const toggleButton = root.querySelector(
      ".chips-basecard-editor__toolbar-toggle"
    ) as HTMLButtonElement | null;
    const toolbarContent = root.querySelector(
      ".chips-basecard-editor__toolbar-content"
    ) as HTMLDivElement | null;

    if (!toggleButton || !toolbarContent) {
      throw new Error("找不到工具栏折叠控件");
    }

    expect(root.getAttribute("data-toolbar-state")).toBe("expanded");
    expect(toolbarContent.hidden).toBe(false);
    expect(toggleButton.textContent).toBe("收起");

    toggleButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.getAttribute("data-toolbar-state")).toBe("collapsed");
    expect(toolbarContent.hidden).toBe(true);
    expect(toggleButton.textContent).toBe("展开");

    toggleButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(root.getAttribute("data-toolbar-state")).toBe("expanded");
    expect(toolbarContent.hidden).toBe(false);
  });

  it("uses a two-region layout without the old floating toolbar offset styles", () => {
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        body: "<p>Body</p>",
        locale: "zh-CN",
      },
      onChange: () => undefined,
    });

    const styleText = root.querySelector("style")?.textContent ?? "";

    expect(styleText).toContain("padding: 14px 16px 16px;");
    expect(styleText).toContain(".chips-basecard-editor__toolbar-shell");
    expect(styleText).toContain(".chips-basecard-editor__surface-frame");
    expect(styleText).toContain("padding: 20px 24px 56px;");
    expect(styleText).not.toContain("toolbar-offset");
    expect(styleText).not.toContain("floating-toolbar");
  });

  it("flushes pending changes when fields lose focus", () => {
    const initialConfig: BasecardConfig = {
      id: "test",
      body: "<p>Body</p>",
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

    bodyEditor.innerHTML = "<p>Updated Body</p>";
    bodyEditor.dispatchEvent(new Event("input", { bubbles: true }));
    bodyEditor.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(lastConfig?.body).toContain("Updated Body");
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

  it("shows the placeholder for an empty body model", () => {
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        body: "<p></p>",
        locale: "zh-CN",
      },
      onChange: () => undefined,
    });

    const bodyEditor = root.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;

    expect(bodyEditor?.getAttribute("data-placeholder")).toBe("开始输入内容");
    expect(bodyEditor?.getAttribute("data-empty")).toBe("true");
  });

  it("waits for composition to finish before emitting model updates", () => {
    vi.useFakeTimers();

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        body: "<p></p>",
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

    bodyEditor.dispatchEvent(new Event("compositionstart", { bubbles: true }));
    bodyEditor.innerHTML = "<p>输入法</p>";
    bodyEditor.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(130);

    expect(lastConfig).toBeUndefined();

    bodyEditor.dispatchEvent(new Event("compositionend", { bubbles: true }));
    vi.advanceTimersByTime(130);

    expect(lastConfig?.body).toContain("输入法");
  });

  it("keeps Enter on the current paragraph flow instead of jumping back to the start", () => {
    vi.useFakeTimers();

    const execCommandMock = vi.fn((command: string, _showUi?: boolean, value?: string) => {
      if (command === "defaultParagraphSeparator") {
        return value === "p";
      }

      if (command !== "insertParagraph") {
        return true;
      }

      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range) {
        return false;
      }

      const anchorNode =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentNode
          : range.startContainer;
      const paragraph = anchorNode instanceof HTMLElement
        ? anchorNode.closest("p")
        : null;

      if (!paragraph) {
        return false;
      }

      const nextParagraph = document.createElement("p");
      nextParagraph.innerHTML = "<br>";
      paragraph.insertAdjacentElement("afterend", nextParagraph);

      const nextRange = document.createRange();
      nextRange.selectNodeContents(nextParagraph);
      nextRange.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(nextRange);
      return true;
    });

    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommandMock,
    });

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig: {
        id: "test",
        body: "<p>第一段</p>",
        locale: "zh-CN",
      },
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const bodyEditor = root.querySelector(
      ".chips-basecard-editor__richtext"
    ) as HTMLDivElement | null;
    const textNode = bodyEditor?.querySelector("p")?.firstChild;

    if (!bodyEditor || !textNode) {
      throw new Error("找不到正文编辑器");
    }

    const range = document.createRange();
    range.setStart(textNode, textNode.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    bodyEditor.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }));
    vi.advanceTimersByTime(130);

    expect(execCommandMock).toHaveBeenCalledWith("defaultParagraphSeparator", false, "p");
    expect(execCommandMock).toHaveBeenCalledWith("insertParagraph", false, undefined);
    expect(lastConfig?.body).toContain("<p>第一段</p>");
    expect(lastConfig?.body).toContain("<p><br></p>");
  });
});
