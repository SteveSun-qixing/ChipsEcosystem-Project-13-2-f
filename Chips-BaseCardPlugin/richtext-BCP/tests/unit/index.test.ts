import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";

describe("richtext basecard entry", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.richtext");
    expect(basecardDefinition.cardType).toBe("base.richtext");
    expect(basecardDefinition.aliases).toEqual(["RichTextCard"]);
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "RichTextCard",
    });
    expect(basecardDefinition.validateConfig({
      card_type: "RichTextCard",
      body: "<p>hello</p>",
      locale: "zh-CN",
      theme: "",
    }).valid).toBe(true);
  });
});
