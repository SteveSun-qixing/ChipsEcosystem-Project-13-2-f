import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";

describe("image basecard entry", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.image");
    expect(basecardDefinition.cardType).toBe("base.image");
    expect(basecardDefinition.aliases).toEqual(["ImageCard"]);
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "ImageCard",
    });
    expect(basecardDefinition.collectResourcePaths?.({
      card_type: "ImageCard",
      theme: "",
      images: [
        {
          id: "img-1",
          source: "file",
          file_path: "cover.png",
        },
        {
          id: "img-2",
          source: "url",
          url: "https://example.com/demo.png",
        },
      ],
      layout_type: "grid",
      layout_options: {
        grid_mode: "3x3",
        single_width_percent: 100,
        single_alignment: "center",
        spacing_mode: "comfortable",
      },
    })).toEqual(["cover.png"]);
  });
});
