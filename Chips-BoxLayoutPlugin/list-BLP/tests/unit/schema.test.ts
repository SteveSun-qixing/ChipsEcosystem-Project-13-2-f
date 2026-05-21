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
          assetPath: " assets/layouts/list/background/hero.webp ",
        },
        topRegion: {
          mode: "html",
          html: "<div>Top Region</div>",
        },
      },
      assetRefs: ["assets/layouts/list/background/hero.webp", "", 1],
    });

    expect(config.props.sortMode).toBe("manual");
    expect(config.props.background).toEqual({
      mode: "image",
      assetPath: "assets/layouts/list/background/hero.webp",
    });
    expect(config.props.topRegion).toEqual({
      mode: "html",
      html: "<div>Top Region</div>",
    });
    expect(config.assetRefs).toEqual(["assets/layouts/list/background/hero.webp"]);
  });

  it("does not persist unsafe asset paths", () => {
    const config = normalizeLayoutConfig({
      props: {
        sortMode: "manual",
        background: {
          mode: "image",
          assetPath: "file:///tmp/background.webp",
        },
        topRegion: {
          mode: "image",
          assetPath: "assets/layouts/list/../secret.webp",
        },
      },
      assetRefs: [
        "file:///tmp/background.webp",
        "assets/layouts/list/../secret.webp",
      ],
    });

    expect(config.props.background).toEqual({
      mode: "image",
    });
    expect(config.props.topRegion).toEqual({
      mode: "image",
    });
    expect(config.assetRefs).toEqual([]);
  });

  it("validates config", () => {
    const result = validateLayoutConfig(createDefaultLayoutConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
