import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";

describe("richtext basecard entry", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.richtext");
    expect(basecardDefinition.cardType).toBe("base.richtext");
    expect(basecardDefinition.aliases).toEqual(["RichTextCard"]);
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "RichTextCard",
      content_format: "markdown",
      content_source: "inline",
      content_text: "123456789",
      locale: "zh-CN",
    });
    expect(
      basecardDefinition.validateConfig({
        card_type: "RichTextCard",
        content_format: "markdown",
        content_source: "inline",
        content_text: "hello",
        locale: "zh-CN",
        theme: "",
      }).valid,
    ).toBe(true);
    expect(
      basecardDefinition.collectResourcePaths?.({
        card_type: "RichTextCard",
        content_format: "markdown",
        content_source: "file",
        content_file: "richtext-base-1.md",
        locale: "zh-CN",
      }),
    ).toEqual(["richtext-base-1.md"]);
  });
});
