import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("music basecard schema", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.music");
    expect(basecardDefinition.cardType).toBe("base.music");
    expect(basecardDefinition.aliases).toContain("MusicCard");
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "MusicCard",
      audio_file: "",
    });
  });

  it("normalizes optional fields and collects internal resource paths", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "MusicCard",
      audio_file: "./tracks/demo.mp3",
      album_cover: "./covers/demo.jpg",
      lyrics_file: "lyrics/demo.lrc",
      production_team: [
        {
          id: "team-1",
          role: "歌手",
          people: ["Alice", " Bob "],
        },
      ],
    });

    expect(normalized).toMatchObject({
      card_type: "MusicCard",
      audio_file: "tracks/demo.mp3",
      album_cover: "covers/demo.jpg",
      lyrics_file: "lyrics/demo.lrc",
      production_team: [
        {
          id: "team-1",
          role: "歌手",
          people: ["Alice", "Bob"],
        },
      ],
      music_name: "",
      album_name: "",
      language: "",
      genre: "",
      release_date: "",
    });

    expect(basecardDefinition.collectResourcePaths(normalized)).toEqual([
      "tracks/demo.mp3",
      "covers/demo.jpg",
      "lyrics/demo.lrc",
    ]);
  });

  it("only requires an audio file and keeps other fields optional", () => {
    const result = validateBasecardConfig(
      normalizeBasecardConfig({
        card_type: "MusicCard",
        audio_file: "",
        production_team: [
          {
            id: "team-1",
            role: "",
            people: [],
          },
        ],
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.audio_file).toBeTruthy();
    expect(result.errors["production_team.0.role"]).toBeUndefined();
    expect(result.errors["production_team.0.people"]).toBeUndefined();
  });
});
