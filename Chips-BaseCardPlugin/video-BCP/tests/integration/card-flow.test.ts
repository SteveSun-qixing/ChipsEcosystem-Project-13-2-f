import { describe, it, expect } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("basecard integration flow", () => {
  it("updates view when the metadata form loses focus", async () => {
    const container = document.createElement("div");
    const editorContainer = document.createElement("div");
    document.body.appendChild(editorContainer);

    const initialConfig: BasecardConfig = {
      card_type: "VideoCard",
      theme: "",
      video_file: "demo.mp4",
      cover_image: "",
      video_title: "Initial",
      publish_time: "",
      creator: "",
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
      '[data-role="video-title-input"]'
    ) as HTMLInputElement | null;

    if (!titleInput) {
      throw new Error("找不到标题输入框");
    }

    titleInput.value = "Updated";
    titleInput.dispatchEvent(new Event("input", { bubbles: true }));
    titleInput.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await Promise.resolve();

    const titleEl = container.querySelector(".chips-video-card__title");
    expect(titleEl?.textContent).toBe("Updated");

    editorContainer.remove();
  });
});
