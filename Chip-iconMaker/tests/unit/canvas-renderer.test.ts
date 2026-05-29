import { describe, expect, it } from "vitest";
import { renderIconToCanvas } from "../../src/icon-workbench/canvas-renderer";
import { MATERIAL_SYMBOLS_FONT_SOURCE } from "../../src/icon-workbench/default-fonts";
import { DEFAULT_ICON_SETTINGS, type RenderIconOptions } from "../../src/icon-workbench/types";

function createCanvasStub() {
  const calls = {
    fillRect: 0,
    fillText: 0,
  };

  const context = {
    clearRect: () => undefined,
    createLinearGradient: () => ({
      addColorStop: () => undefined,
    }),
    drawImage: () => undefined,
    fillRect: () => {
      calls.fillRect += 1;
    },
    fillText: () => {
      calls.fillText += 1;
    },
    fillStyle: "",
    font: "",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    textAlign: "start",
    textBaseline: "alphabetic",
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;

  return { calls, canvas };
}

function createRenderOptions(partial: Partial<RenderIconOptions>): RenderIconOptions {
  return {
    size: 32,
    settings: DEFAULT_ICON_SETTINGS,
    sourceMode: "image",
    imageSource: null,
    fontSource: MATERIAL_SYMBOLS_FONT_SOURCE,
    selectedGlyph: null,
    ...partial,
  };
}

describe("canvas renderer", () => {
  it("does not paint an extra background in image mode", async () => {
    const { calls, canvas } = createCanvasStub();

    await renderIconToCanvas(canvas, createRenderOptions({ sourceMode: "image" }));

    expect(calls.fillRect).toBe(0);
  });

  it("keeps background painting for font mode", async () => {
    const { calls, canvas } = createCanvasStub();

    await renderIconToCanvas(
      canvas,
      createRenderOptions({
        sourceMode: "font",
        selectedGlyph: MATERIAL_SYMBOLS_FONT_SOURCE.glyphs[0],
      }),
    );

    expect(calls.fillRect).toBe(1);
    expect(calls.fillText).toBe(1);
  });
});
