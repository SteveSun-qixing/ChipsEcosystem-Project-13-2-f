import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";

describe("webpage basecard entry", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.webpage");
    expect(basecardDefinition.cardType).toBe("base.webpage");
    expect(basecardDefinition.aliases).toEqual(["WebPageCard"]);
    expect(basecardDefinition.previewPointerEvents).toBe("shielded");
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "WebPageCard",
      source_type: "url",
    });
    expect(basecardDefinition.collectResourcePaths?.({
      card_type: "WebPageCard",
      source_type: "bundle",
      bundle_root: "site",
      entry_file: "index.html",
      resource_paths: [
        "site/index.html",
        "./site/assets/app.js",
        "site/index.html",
      ],
      display_mode: "fixed",
      fixed_ratio: "7:16",
      max_height_ratio: 20,
    })).toEqual([
      "site/index.html",
      "site/assets/app.js",
    ]);
  });
});
