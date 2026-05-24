import { describe, expect, it } from "vitest";
import { basecardDefinition } from "../../src/index";
import {
  collectBasecardResourcePaths,
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
    expect(basecardDefinition.displayName).toBe("{{ DISPLAY_NAME }}");
    expect(basecardDefinition.description).toBe("{{ DISPLAY_NAME }}");
    expect(basecardDefinition.icon).toMatchObject({
      name: "style",
      decorative: true,
    });
    expect(basecardDefinition.previewPointerEvents).toBe("native");
    expect(basecardDefinition.collectResourcePaths({
      resource_path: "assets/demo.png",
    })).toEqual(["assets/demo.png"]);
  });

  it("fills default locale and theme during normalization", () => {
    const normalized = normalizeBasecardConfig({
      card_type: "{{ CARD_TYPE }}",
      title: "Title",
      body: "Body",
      resource_path: "assets\\cover.png",
    });

    expect(normalized).toMatchObject({
      card_type: "{{ CARD_TYPE }}",
      title: "Title",
      body: "Body",
      locale: "zh-CN",
      theme: "",
      resource_path: "assets/cover.png",
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

  it("rejects non card-root resource paths", () => {
    const invalidPaths = [
      "/abs.png",
      "./local.png",
      "../escape.png",
      "assets/../escape.png",
      "blob:https://example.test/image",
      "data:image/png;base64,AAAA",
      "file:///tmp/image.png",
      "C:/Users/demo/image.png",
      "assets/image.png?cache=1",
    ];

    for (const resourcePath of invalidPaths) {
      const result = validateBasecardConfig(
        normalizeBasecardConfig({
          card_type: "{{ CARD_TYPE }}",
          title: "Title",
          body: "Body",
          resource_path: resourcePath,
        }),
      );

      expect(result.valid).toBe(false);
      expect(result.errors.resource_path).toBeTruthy();
      expect(collectBasecardResourcePaths({ resource_path: resourcePath })).toEqual([]);
    }
  });

  it("collects deduplicated card-root resource paths", () => {
    expect(collectBasecardResourcePaths({
      resource_path: "assets\\demo.png",
    })).toEqual(["assets/demo.png"]);
  });
});
