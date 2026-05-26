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
    expect(config.props.rowDensity).toBe("comfortable");
    expect(config.props.coverSize).toBe("regular");
    expect(config.props.visibleFields).toEqual(["createdAt"]);
    expect(config.props.groupMode).toBe("none");
    expect(config.props.pageSize).toBe(120);
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
        rowDensity: "spacious",
        coverSize: "large",
        visibleFields: ["summary", "tags", "summary", "unknown"],
        groupMode: "tag",
        pageSize: 241,
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
    expect(config.props.rowDensity).toBe("spacious");
    expect(config.props.coverSize).toBe("large");
    expect(config.props.visibleFields).toEqual(["summary", "tags"]);
    expect(config.props.groupMode).toBe("tag");
    expect(config.props.pageSize).toBe(240);
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

  it("rejects unsafe box asset path syntax", () => {
    expect(isSafeBoxAssetPath("assets/layouts/list/background/hero.webp")).toBe(true);
    expect(isSafeBoxAssetPath(" assets/layouts/list/background/hero.webp ")).toBe(false);
    expect(isSafeBoxAssetPath("file:///tmp/background.webp")).toBe(false);
    expect(isSafeBoxAssetPath("/assets/layouts/list/background/hero.webp")).toBe(false);
    expect(isSafeBoxAssetPath("assets/layouts/list/background/hero.webp?token=1")).toBe(false);
    expect(isSafeBoxAssetPath("assets/layouts/list/background/hero.webp#preview")).toBe(false);
    expect(isSafeBoxAssetPath("assets/layouts/list/../secret.webp")).toBe(false);
  });

  it("validates raw input assetRefs before normalization drops unsafe values", () => {
    const result = validateLayoutConfigInput({
      schemaVersion: "1.0.0",
      props: {
        sortMode: "manual",
        rowDensity: "comfortable",
        coverSize: "regular",
        visibleFields: ["createdAt"],
        groupMode: "none",
        pageSize: 120,
        background: {
          mode: "image",
          assetPath: "file:///tmp/background.webp",
        },
        topRegion: {
          mode: "none",
        },
      },
      assetRefs: ["file:///tmp/background.webp"],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      "props.background.assetPath": "background assetPath is required when mode is image.",
      "assetRefs[0]": "assetRefs item must be a box assets/ relative path.",
    });
  });

  it("validates config", () => {
    const result = validateLayoutConfig(createDefaultLayoutConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
