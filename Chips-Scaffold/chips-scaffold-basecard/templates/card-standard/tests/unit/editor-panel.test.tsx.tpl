import { describe, it, expect } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardEditorRoot", () => {
  it("emits changes when fields are updated and valid", () => {
    const initialConfig: BasecardConfig = {
      card_type: "{{ CARD_TYPE }}",
      title: "Title",
      body: "Body",
      locale: "zh-CN",
      theme: "",
      resource_path: "assets/cover.png",
    };

    let lastConfig: BasecardConfig | undefined;
    const root = createBasecardEditorRoot({
      initialConfig,
      onChange: (next) => {
        lastConfig = next;
      },
    });

    const titleInput = root.querySelector(
      '[data-scope="text-field"][data-part="control"]'
    ) as HTMLInputElement | null;

    if (!titleInput) {
      throw new Error("找不到标题输入框");
    }

    expect(root.querySelector('[data-scope="form"][data-part="root"]')).toBeTruthy();
    expect(root.querySelector('[data-scope="text-area"][data-part="control"]')).toBeTruthy();
    expect(root.innerHTML).not.toContain("chips-basecard-editor__input");
    expect(root.innerHTML).not.toContain("box-shadow");
    expect(root.innerHTML).not.toContain("radial-gradient");

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(titleInput, "New Title");
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(lastConfig?.title).toBe("New Title");
    expect(lastConfig?.card_type).toBe("{{ CARD_TYPE }}");
    expect(lastConfig?.resource_path).toBe("assets/cover.png");
  });
});
