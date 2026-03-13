import { afterEach, describe, expect, it, vi } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardEditorRoot (text basic)", () => {
  afterEach(() => {
    vi.useRealTimers();
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
});
