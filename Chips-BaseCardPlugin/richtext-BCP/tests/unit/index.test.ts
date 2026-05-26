import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";

describe("richtext basecard entry", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("chips.basecard.richtext");
    expect(basecardDefinition.cardType).toBe("base.richtext");
    expect(basecardDefinition.aliases).toEqual(["RichTextCard"]);
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "base.richtext",
      content_format: "markdown",
      content_source: "inline",
      locale: "zh-CN",
      markdown_capabilities: {
        commonmark: true,
        gfm: true,
        math: true,
        highlight: true,
        underline: true,
        superscript: true,
        subscript: true,
      },
    });
    expect(
      basecardDefinition.validateConfig({
        card_type: "base.richtext",
        content_format: "markdown",
        content_source: "inline",
        content_text: "hello",
        locale: "zh-CN",
        theme: "",
        markdown_capabilities: {
          commonmark: true,
          gfm: true,
          math: true,
          highlight: true,
          underline: true,
          superscript: true,
          subscript: true,
        },
      }).valid,
    ).toBe(true);
    expect(
      basecardDefinition.collectResourcePaths?.({
        card_type: "base.richtext",
        content_format: "markdown",
        content_source: "file",
        content_file: "richtext-base-1.md",
        locale: "zh-CN",
      }),
    ).toEqual(["richtext-base-1.md"]);
  });

  it("normalizes the legacy RichTextCard alias to the formal base.richtext config", () => {
    expect(
      basecardDefinition.normalizeConfig({
        card_type: "RichTextCard",
        content_format: "markdown",
        content_source: "inline",
        content_text: "legacy input",
      }, "base-1"),
    ).toMatchObject({
      card_type: "base.richtext",
      content_text: "legacy input",
    });
  });
});
