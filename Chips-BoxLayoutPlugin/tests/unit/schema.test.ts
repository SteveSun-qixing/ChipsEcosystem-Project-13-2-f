import { describe, expect, it } from "vitest";
import {
  createDefaultLayoutConfig,
  normalizeLayoutConfig,
  validateLayoutConfig,
} from "../../src/schema/layout-config";

describe("layout-config", () => {
  it("creates default config", () => {
    const config = createDefaultLayoutConfig();
    expect(config.props.columnCount).toBe(4);
    expect(config.props.gap).toBe(16);
    expect(config.assetRefs).toEqual([]);
  });

  it("normalizes invalid values into bounded config", () => {
    const config = normalizeLayoutConfig({
      props: {
        columnCount: 99,
        gap: -5,
        coverRatio: 9,
        informationDensity: "invalid",
      },
      assetRefs: ["assets/layouts/grid/background.webp", "", 1],
    });
    expect(config.props.columnCount).toBe(12);
    expect(config.props.gap).toBe(0);
    expect(config.props.coverRatio).toBe(3);
    expect(config.props.informationDensity).toBe("comfortable");
    expect(config.assetRefs).toEqual(["assets/layouts/grid/background.webp"]);
  });

  it("validates config", () => {
    const result = validateLayoutConfig(createDefaultLayoutConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
