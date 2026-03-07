import { describe, it, expect } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardEditorRoot", () => {
  it("emits changes when fields are updated and valid", () => {
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

    expect(lastConfig?.title).toBe("New Title");
  });
});
