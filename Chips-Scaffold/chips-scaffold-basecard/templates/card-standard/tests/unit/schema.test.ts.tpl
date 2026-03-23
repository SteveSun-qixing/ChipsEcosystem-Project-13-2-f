import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("basecard schema", () => {
  it("exports the formal basecard definition contract", () => {
    expect(basecardDefinition.pluginId).toBe("{{ PLUGIN_ID }}");
    expect(basecardDefinition.cardType).toBe("{{ CARD_TYPE }}");
    expect(basecardDefinition.createInitialConfig("base-1")).toMatchObject({
      card_type: "{{ CARD_TYPE }}",
    });
  });

  it("fills default locale and theme during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "{{ CARD_TYPE }}",
      title: "Title",
      body: "Body",
    });

    expect(normalized).toMatchObject({
      card_type: "{{ CARD_TYPE }}",
      title: "Title",
      body: "Body",
      locale: "zh-CN",
      theme: "",
    });
  });

  it("rejects empty title and body", () => {
    const result = validateBasecardConfig(
      normalizeBasecardConfig({
        card_type: "{{ CARD_TYPE }}",
        title: "",
        body: "",
      }),
    );

    expect(result.valid).toBe(false);
    expect(result.errors.title).toBeTruthy();
    expect(result.errors.body).toBeTruthy();
  });
});
