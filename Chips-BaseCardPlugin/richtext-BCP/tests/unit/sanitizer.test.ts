import { describe, expect, it } from "vitest";
import {
  countPlainTextLengthFromMarkdown,
  collectMarkdownResourcePaths,
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

  it("strips extended markdown markers when computing plain text", () => {
    const markdown = `~~删除线~~ ==高亮== ++下划线++ 2^10^ H~2~O

$$\\frac{a}{b}$$`;

    const plainText = extractPlainTextFromMarkdown(markdown);

    expect(plainText).toContain("删除线");
    expect(plainText).toContain("高亮");
    expect(plainText).toContain("下划线");
    expect(plainText).toContain("10");
    expect(plainText).toContain("2");
    expect(plainText).toContain("\\frac{a}{b}");
    expect(plainText).not.toContain("~~");
    expect(plainText).not.toContain("==");
    expect(plainText).not.toContain("++");
  });

  it("normalizes resource paths and markdown file naming", () => {
    expect(normalizeResourcePath("./richtext-a.md")).toBe("richtext-a.md");
    expect(normalizeResourcePath("../escape.md")).toBe("");
    expect(normalizeResourcePath("file:///tmp/escape.md")).toBe("");
    expect(normalizeResourcePath("docs/a.md?x=1")).toBe("");
    expect(createRichTextMarkdownFileName("base-1")).toBe("richtext-base-1.md");
  });

  it("collects only card-root relative markdown resources", () => {
    expect(
      collectMarkdownResourcePaths("![图](assets/a.png) [文档](docs/a.md) [外链](https://example.com/a.png) <img src=\"./assets/b.webp\">"),
    ).toEqual(["assets/a.png", "docs/a.md", "assets/b.webp"]);
  });

  it("switches to file storage only after 200 characters", () => {
    expect(shouldUseFileStorage(200)).toBe(false);
    expect(shouldUseFileStorage(201)).toBe(true);
  });
});
