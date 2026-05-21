import { describe, expect, it } from "vitest";
import { buildImageFrameHtml } from "../../src/shared/frame-region";

describe("frame region image rendering", () => {
  it("renders cover mode html for image regions", () => {
    const html = buildImageFrameHtml("file:///tmp/cover.png");

    expect(html).toContain("<img ");
    expect(html).toContain("object-fit: cover");
    expect(html).not.toContain("background-repeat: repeat-y");
  });
});
