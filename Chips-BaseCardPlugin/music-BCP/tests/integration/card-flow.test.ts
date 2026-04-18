import { describe, expect, it } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import { mountBasecardEditor } from "../../src/editor/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("music basecard integration flow", () => {
  it("updates the rendered title when the editor emits a valid config", async () => {
    const viewContainer = document.createElement("div");
    const editorContainer = document.createElement("div");

    const initialConfig: BasecardConfig = {
      card_type: "MusicCard",
      theme: "",
      audio_file: "tracks/demo.mp3",
      music_name: "Initial",
      album_cover: "",
      lyrics_file: "",
      production_team: [
        {
          id: "team-1",
          role: "歌手",
          people: ["Alice"],
        },
      ],
      release_date: "",
      album_name: "",
      language: "",
      genre: "",
    };

    let currentConfig: BasecardConfig = initialConfig;

    mountBasecardView({
      container: viewContainer,
      config: currentConfig,
      resolveResourceUrl: async (resourcePath) => `file:///tmp/${resourcePath}`,
    });

    mountBasecardEditor({
      container: editorContainer,
      initialConfig,
      onChange: (next) => {
        currentConfig = next;
        mountBasecardView({
          container: viewContainer,
          config: currentConfig,
          resolveResourceUrl: async (resourcePath) => `file:///tmp/${resourcePath}`,
        });
      },
    });

    const musicNameInput = editorContainer.querySelector('[data-role="music-name-input"]') as HTMLInputElement | null;
    if (!musicNameInput) {
      throw new Error("找不到歌曲名输入框");
    }

    musicNameInput.value = "Updated Echo";
    musicNameInput.dispatchEvent(new Event("input", { bubbles: true }));

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    expect(viewContainer.querySelector(".chips-music-card__title")?.textContent).toBe("Updated Echo");
  });
});
