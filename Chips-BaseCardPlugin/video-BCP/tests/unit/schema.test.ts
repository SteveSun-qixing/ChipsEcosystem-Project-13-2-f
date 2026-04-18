import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("basecard schema", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.video");
    expect(basecardDefinition.cardType).toBe("base.video");
    expect(basecardDefinition.aliases).toEqual(["VideoCard"]);
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "VideoCard",
    });
    expect(basecardDefinition.collectResourcePaths?.({
      card_type: "VideoCard",
      theme: "",
      video_file: "videos/demo.mp4",
      cover_image: "videos/demo-cover.jpg",
      video_title: "",
      publish_time: "",
      creator: "",
    })).toEqual([
      "videos/demo.mp4",
      "videos/demo-cover.jpg",
    ]);
  });

  it("fills default optional fields during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "VideoCard",
      video_file: "demo.mp4",
    });

    expect(normalized).toMatchObject({
      card_type: "VideoCard",
      theme: "",
      video_file: "demo.mp4",
      cover_image: "",
      video_title: "",
      publish_time: "",
      creator: "",
    });
  });

  it("rejects empty video resource", () => {
    const result = validateBasecardConfig(
      normalizeBasecardConfig({
        card_type: "VideoCard",
        video_file: "",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.video_file).toBeTruthy();
  });
});
