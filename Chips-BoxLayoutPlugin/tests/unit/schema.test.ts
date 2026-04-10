import { describe, expect, it } from "vitest";
import {
  createDefaultLayoutConfig,
  normalizeLayoutConfig,
  validateLayoutConfig,
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
      assetPath: "assets/layouts/grid/background/hero.webp",
    });
    expect(config.props.topRegion).toEqual({
      mode: "html",
      html: "<div>Top Region</div>",
    });
    expect(config.assetRefs).toEqual(["assets/layouts/grid/background/hero.webp"]);
  });

  it("validates config", () => {
    const result = validateLayoutConfig(createDefaultLayoutConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
