import { describe, expect, it } from "vitest";
import {
  createDefaultLayoutConfig,
  isSafeBoxAssetPath,
  normalizeLayoutConfig,
  validateLayoutConfig,
  validateLayoutConfigInput,
} from "../../src/schema/layout-config";

describe("layout-config", () => {
  it("creates default config", () => {
    const config = createDefaultLayoutConfig();
    expect(config.props.sortMode).toBe("manual");
    expect(config.props.background).toEqual({
      mode: "none",
    });
    expect(config.props.topRegion).toEqual({
      mode: "none",
    });
    expect(config.assetRefs).toEqual([]);
  });

  it("normalizes invalid values into bounded config", () => {
    const config = normalizeLayoutConfig({
      props: {
        sortMode: "unexpected",
        background: {
          mode: "image",
          assetPath: " assets/layouts/grid/background/hero.webp ",
        },
        topRegion: {
          mode: "html",
          html: "<div>Top Region</div>",
        },
      },
      assetRefs: ["assets/layouts/grid/background/hero.webp", "", 1],
    });

    expect(config.props.sortMode).toBe("manual");
    expect(config.props.background).toEqual({
      mode: "image",
    });
    expect(config.props.topRegion).toEqual({
      mode: "html",
      html: "<div>Top Region</div>",
    });
    expect(config.assetRefs).toEqual([]);
  });

  it("validates config", () => {
    const result = validateLayoutConfig(createDefaultLayoutConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it("accepts only safe box asset paths", () => {
    expect(isSafeBoxAssetPath("assets/layouts/grid/background/hero.webp")).toBe(true);
    expect(isSafeBoxAssetPath(" assets/layouts/grid/background/hero.webp ")).toBe(false);
    expect(isSafeBoxAssetPath("file:///tmp/hero.webp")).toBe(false);
    expect(isSafeBoxAssetPath("assets/../hero.webp")).toBe(false);
    expect(isSafeBoxAssetPath("assets/layouts/grid/background/hero.webp?token=1")).toBe(false);
  });

  it("validates raw input assetRefs before normalization drops unsafe values", () => {
    const result = validateLayoutConfigInput({
      schemaVersion: "1.0.0",
      props: {
        sortMode: "manual",
        background: {
          mode: "image",
          assetPath: "file:///tmp/hero.webp",
        },
        topRegion: {
          mode: "none",
        },
      },
      assetRefs: ["file:///tmp/hero.webp"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      "props.background.assetPath": "background assetPath is required when mode is image.",
      "assetRefs[0]": "assetRefs item must be a box assets/ relative path.",
    });
  });
});
