import { describe, expect, it } from "vitest";
import {
  BACKGROUND_ASSET_PREFIX,
  createDefaultLayoutConfig,
  isSafeBackgroundAssetPath,
  isSafeBoxAssetPath,
  normalizeLayoutConfig,
  snapCoordinate,
  validateLayoutConfig,
  validateLayoutConfigInput,
} from "../../src/schema/layout-config";

describe("layout-config", () => {
  it("creates default infinite canvas config", () => {
    const config = createDefaultLayoutConfig();
    expect(config.props.defaultView).toEqual({ x: 0, y: 0, zoom: 1 });
    expect(config.props.displayMode).toBe("mixed");
    expect(config.props.gridVisible).toBe(true);
    expect(config.props.snapToGrid).toBe(true);
    expect(config.props.background).toEqual({ mode: "none", opacity: 1 });
    expect(config.props.items).toEqual({});
    expect(config.assetRefs).toEqual([]);
  });

  it("normalizes invalid values into bounded config", () => {
    const config = normalizeLayoutConfig({
      schemaVersion: "1.0.0",
      props: {
        defaultView: {
          x: Infinity,
          y: -200000,
          zoom: 99,
        },
        displayMode: "unknown",
        gridVisible: "yes",
        snapToGrid: false,
        background: {
          mode: "image",
          assetPath: `${BACKGROUND_ASSET_PREFIX}hero.png`,
          width: 0,
          height: 200000,
          opacity: 1.5,
        },
        items: {
          "entry-1": {
            x: 12.5,
            y: -20,
            width: 40,
            height: 900,
            mode: "cover",
            labelOverride: "  Custom Label  ",
          },
          "entry-2": {
            x: "bad",
            y: 0,
          },
        },
      },
      assetRefs: ["stale"],
    });

    expect(config.props.defaultView).toEqual({ x: 0, y: -100000, zoom: 4 });
    expect(config.props.displayMode).toBe("mixed");
    expect(config.props.gridVisible).toBe(true);
    expect(config.props.snapToGrid).toBe(false);
    expect(config.props.background).toEqual({
      mode: "image",
      assetPath: `${BACKGROUND_ASSET_PREFIX}hero.png`,
      width: 1,
      height: 100000,
      opacity: 1,
    });
    expect(config.props.items["entry-1"]).toEqual({
      x: 12.5,
      y: -20,
      width: 96,
      height: 420,
      mode: "cover",
      labelOverride: "Custom Label",
    });
    expect(config.props.items["entry-2"]).toBeUndefined();
    expect(config.assetRefs).toEqual([`${BACKGROUND_ASSET_PREFIX}hero.png`]);
  });

  it("keeps background asset refs synchronized", () => {
    const config = normalizeLayoutConfig({
      props: {
        background: {
          mode: "image",
          assetPath: `${BACKGROUND_ASSET_PREFIX}board.webp`,
        },
      },
      assetRefs: [`${BACKGROUND_ASSET_PREFIX}stale.webp`],
    });

    expect(config.assetRefs).toEqual([`${BACKGROUND_ASSET_PREFIX}board.webp`]);
  });

  it("rejects unsafe asset paths and wrong layout namespaces", () => {
    expect(isSafeBoxAssetPath("assets/layouts/infinitecanvas/background/hero.webp")).toBe(true);
    expect(isSafeBackgroundAssetPath("assets/layouts/infinitecanvas/background/hero.webp")).toBe(true);
    expect(isSafeBackgroundAssetPath("assets/layouts/grid/background/hero.webp")).toBe(false);
    expect(isSafeBackgroundAssetPath("file:///tmp/hero.webp")).toBe(false);
    expect(isSafeBackgroundAssetPath("assets/layouts/infinitecanvas/background/../hero.webp")).toBe(false);
    expect(isSafeBackgroundAssetPath("assets/layouts/infinitecanvas/background/hero.webp?token=1")).toBe(false);
  });

  it("validates config and raw input asset refs", () => {
    expect(validateLayoutConfig(createDefaultLayoutConfig())).toEqual({
      valid: true,
      errors: {},
    });

    const result = validateLayoutConfigInput({
      props: {
        background: {
          mode: "image",
          assetPath: "assets/layouts/grid/background/hero.webp",
        },
      },
      assetRefs: ["blob:hero"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors["props.background.assetPath"]).toBeTruthy();
    expect(result.errors["assetRefs[0]"]).toBeTruthy();
  });

  it("snaps coordinates to the official grid size", () => {
    expect(snapCoordinate(15)).toBe(0);
    expect(snapCoordinate(17)).toBe(32);
    expect(snapCoordinate(-17)).toBe(-32);
  });
});
