import { describe, it, expect } from "vitest";
import { createBasecardEditorRoot } from "../../src/editor/panel";
describe("createBasecardEditorRoot (text basic)", () => {
    it("emits changes when fields are updated and valid", () => {
        const initialConfig = {
            id: "test",
            title: "Title",
            body: "Body",
            locale: "zh-CN",
        };
        let lastConfig;
        const root = createBasecardEditorRoot({
            initialConfig,
            onChange: (next) => {
                lastConfig = next;
            },
        });
        const titleInput = root.querySelector(".chips-basecard-editor__input");
        if (!titleInput) {
            throw new Error("找不到标题输入框");
        }
        titleInput.value = "New Title";
        titleInput.dispatchEvent(new Event("input"));
        expect(lastConfig?.title).toBe("New Title");
    });
});
