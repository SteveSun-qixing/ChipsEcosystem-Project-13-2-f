import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  formatZoomPercent,
  getCenteredContentOffset,
  getFitScale,
  getNextZoomScale,
  getPointerDistance,
  getPointerMidpoint,
  projectPanOffsetForScale,
  getScaleFromWheelDelta,
  isSupportedImagePath,
  projectScrollOffsetForScale,
  resolveFileName,
  shouldHandleWheelZoom,
} from "../../src/utils/image-viewer";

describe("image viewer utilities", () => {
  it("detects supported image paths across case variants", () => {
    expect(isSupportedImagePath("/tmp/demo.PNG")).toBe(true);
    expect(isSupportedImagePath("C:\\Users\\chips\\photo.JpEg")).toBe(true);
    expect(isSupportedImagePath("/tmp/demo.txt")).toBe(false);
  });

  it("calculates fit scale from viewport and image size", () => {
    expect(getFitScale({ width: 2400, height: 1600 }, { width: 1200, height: 800 })).toBe(0.5);
    expect(getFitScale({ width: 900, height: 1600 }, { width: 1200, height: 1000 })).toBe(0.625);
    expect(getFitScale({ width: 400, height: 300 }, { width: 1600, height: 1200 })).toBe(4);
  });

  it("moves zoom scale forward and backward with clamping", () => {
    expect(getNextZoomScale(1, "in")).toBe(1.25);
    expect(getNextZoomScale(0.1, "out")).toBe(0.1);
    expect(getNextZoomScale(8, "in")).toBe(8);
  });

  it("detects wheel and pinch zoom intents across devices", () => {
    expect(shouldHandleWheelZoom({ deltaX: 0, deltaY: 120, deltaMode: 1, ctrlKey: false, metaKey: false })).toBe(true);
    expect(shouldHandleWheelZoom({ deltaX: 0, deltaY: 8, deltaMode: 0, ctrlKey: true, metaKey: false })).toBe(true);
    expect(shouldHandleWheelZoom({ deltaX: 0.5, deltaY: 6, deltaMode: 0, ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldHandleWheelZoom({ deltaX: 0, deltaY: 48, deltaMode: 0, ctrlKey: false, metaKey: false })).toBe(true);
    expect(getScaleFromWheelDelta(1, -120, 1)).toBeGreaterThan(1);
    expect(getScaleFromWheelDelta(1, 120, 1)).toBeLessThan(1);
  });

  it("projects anchored scroll offsets during zoom transitions", () => {
    expect(getCenteredContentOffset(800, 400)).toBe(200);
    expect(
      projectScrollOffsetForScale({
        viewportLength: 800,
        pointerOffset: 400,
        currentScroll: 0,
        contentLengthBefore: 400,
        contentLengthAfter: 1200,
      }),
    ).toBe(200);
    expect(
      projectPanOffsetForScale({
        viewportLength: 1000,
        pointerOffset: 500,
        naturalLength: 1000,
        currentScale: 0.9,
        nextScale: 1.8,
        currentPan: 0,
      }),
    ).toBe(0);
  });

  it("calculates pinch gesture geometry", () => {
    expect(getPointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(getPointerMidpoint({ x: 10, y: 20 }, { x: 30, y: 50 })).toEqual({ x: 20, y: 35 });
  });

  it("formats file labels for the viewer header", () => {
    expect(resolveFileName("/tmp/demo/image.png")).toBe("image.png");
    expect(resolveFileName("C:\\Users\\chips\\cover.webp")).toBe("cover.webp");
    expect(formatFileSize(999)).toBe("999 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatZoomPercent(1.26)).toBe("126%");
  });
});
