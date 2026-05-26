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
      subtitles: [
        {
          id: "zh",
          label: "简体中文",
          language: "zh-CN",
          kind: "subtitles",
          file_path: "videos/demo.zh.vtt",
          default: true,
        },
      ],
      playback: {
        autoplay: false,
        loop: true,
        muted: false,
        playback_rate: 1.25,
        start_time: 12,
      },
      video_title: "",
      publish_time: "",
      creator: "",
    })).toEqual([
      "videos/demo.mp4",
      "videos/demo-cover.jpg",
      "videos/demo.zh.vtt",
    ]);
  });

  it("fills default optional fields during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "VideoCard",
      video_file: "demo.mp4",
      subtitles: [
        {
          id: "zh",
          label: "简体中文",
          language: "zh-CN",
          kind: "captions",
          file_path: "./subtitles/demo.zh.vtt",
          default: true,
        },
      ],
      playback: {
        autoplay: true,
        loop: true,
        muted: true,
        playback_rate: 8,
        start_time: -10,
      },
    });

    expect(normalized).toMatchObject({
      card_type: "VideoCard",
      theme: "",
      video_file: "demo.mp4",
      cover_image: "",
      subtitles: [
        {
          id: "zh",
          label: "简体中文",
          language: "zh-CN",
          kind: "captions",
          file_path: "subtitles/demo.zh.vtt",
          default: true,
        },
      ],
      playback: {
        autoplay: true,
        loop: true,
        muted: true,
        playback_rate: 4,
        start_time: 0,
      },
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
    expect(result.errors.video_file).toBe("video.validation.video_file_required");
  });

  it("drops unsafe absolute and runtime resource paths during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "VideoCard",
      video_file: "/Users/demo/movie.mp4",
      cover_image: "blob:cover",
      subtitles: [
        {
          id: "unsafe",
          label: "Unsafe",
          language: "en-US",
          kind: "subtitles",
          file_path: "../subtitle.vtt",
          default: true,
        },
      ],
    });

    expect(normalized.video_file).toBe("");
    expect(normalized.cover_image).toBe("");
    expect(normalized.subtitles).toEqual([]);
  });
});
