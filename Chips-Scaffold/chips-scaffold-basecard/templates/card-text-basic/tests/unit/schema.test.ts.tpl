import { describe, expect, it } from "vitest";
import {
  normalizeBasecardConfig,
  validateBasecardConfig,
} from "../../src/schema/card-config";

describe("basecard schema", () => {
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
