import { describe, expect, it } from "vitest";
import {
  countPlainTextLengthFromMarkdown,
  createRichTextMarkdownFileName,
  extractPlainTextFromMarkdown,
  normalizeResourcePath,
  shouldUseFileStorage,
} from "../../src/shared/utils";

describe("markdown helpers", () => {
  it("extracts readable text from markdown", () => {
    const markdown = `# 标题

这是 **内容**，包含 [链接](https://example.com) 和 \`code\`。`;
    expect(extractPlainTextFromMarkdown(markdown)).toContain("标题");
    expect(extractPlainTextFromMarkdown(markdown)).toContain("内容");
    expect(countPlainTextLengthFromMarkdown(markdown)).toBeGreaterThan(2);
  });

  it("normalizes resource paths and markdown file naming", () => {
    expect(normalizeResourcePath("./richtext-a.md")).toBe("richtext-a.md");
    expect(createRichTextMarkdownFileName("base-1")).toBe("richtext-base-1.md");
  });

  it("switches to file storage only after 200 characters", () => {
    expect(shouldUseFileStorage(200)).toBe(false);
    expect(shouldUseFileStorage(201)).toBe(true);
  });
});
