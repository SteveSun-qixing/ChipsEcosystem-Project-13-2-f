import { describe, expect, it } from "vitest";
import {
  collectFileBackedRichTextResourcePaths,
  replaceYamlResourceUrls,
  restoreYamlResourcePaths,
} from "../../src/card-rewrite";

describe("card-rewrite rich text file-backed inlining", () => {
  const urlMap = new Map<string, string>([
    ["richtext/a1B2c3D4e5.md", "https://cdn.example/richtext/a1B2c3D4e5.md"],
  ]);
  const textResourceMap = new Map<string, string>([
    ["richtext/a1B2c3D4e5.md", "# 标题\n\n正文内容"],
  ]);

  it("collects the file-backed rich text content file candidate paths", () => {
    const yaml = [
      "card_type: base.richtext",
      "content_source: file",
      "content_file: richtext/a1B2c3D4e5.md",
    ].join("\n");

    const candidates = collectFileBackedRichTextResourcePaths(yaml, "content/a1B2c3D4e5.yaml");
    expect(candidates[0]).toBe("richtext/a1B2c3D4e5.md");
  });

  it("does not collect non-file-backed or non-richtext configs", () => {
    expect(
      collectFileBackedRichTextResourcePaths(
        "card_type: base.richtext\ncontent_source: inline\ncontent_text: hello\n",
        "content/a1B2c3D4e5.yaml",
      ),
    ).toEqual([]);
    expect(
      collectFileBackedRichTextResourcePaths(
        "card_type: base.image\nsource: file\nfile_path: hero.png\n",
        "content/a1B2c3D4e5.yaml",
      ),
    ).toEqual([]);
  });

  it("inlines file-backed rich text content as content_text during upload rewrite", () => {
    const yaml = [
      "card_type: base.richtext",
      "locale: zh-CN",
      "content_format: markdown",
      "content_source: file",
      "content_file: richtext/a1B2c3D4e5.md",
    ].join("\n");

    const rewritten = replaceYamlResourceUrls(
      yaml,
      urlMap,
      "content/a1B2c3D4e5.yaml",
      textResourceMap,
    );

    expect(rewritten).toContain("content_source: inline");
    expect(rewritten).toContain("content_text:");
    expect(rewritten).toContain("# 标题");
    expect(rewritten).toContain("正文内容");
    expect(rewritten).not.toContain("content_file:");
  });

  it("restores inlined rich text content back to a file-backed config", () => {
    const yaml = [
      "card_type: base.richtext",
      "locale: zh-CN",
      "content_format: markdown",
      "content_source: inline",
      "content_text: |",
      "  # 标题",
      "",
      "  正文内容",
    ].join("\n");
    const richTextContentFileMap = new Map<string, string>([
      ["content/a1B2c3D4e5.yaml", "richtext/a1B2c3D4e5.md"],
    ]);

    const restored = restoreYamlResourcePaths(
      yaml,
      new Map<string, string>(),
      "content/a1B2c3D4e5.yaml",
      richTextContentFileMap,
    );

    expect(restored).toContain("content_source: file");
    expect(restored).toContain("content_file: richtext/a1B2c3D4e5.md");
    expect(restored).not.toContain("content_text:");
  });

  it("keeps inline rich text untouched when no original content file mapping exists", () => {
    const yaml = [
      "card_type: base.richtext",
      "content_source: inline",
      "content_text: hello",
    ].join("\n");

    const restored = restoreYamlResourcePaths(
      yaml,
      new Map<string, string>(),
      "content/a1B2c3D4e5.yaml",
      new Map<string, string>(),
    );

    expect(restored).toContain("content_source: inline");
    expect(restored).toContain("content_text: hello");
  });

  it("recovers original resource fields and semantic content after an upload rewrite + download restore round trip", () => {
    const originalYaml = [
      "card_type: base.image",
      "locale: zh-CN",
      "images:",
      "  - id: image-1",
      "    source: file",
      "    file_path: assets/hero.png",
    ].join("\n");
    const urlMap = new Map<string, string>([
      ["assets/hero.png", "https://cdn.example/assets/hero.png"],
    ]);

    const networkYaml = replaceYamlResourceUrls(
      originalYaml,
      urlMap,
      "content/a1B2c3D4e5.yaml",
      new Map<string, string>(),
    );
    expect(networkYaml).toContain("source: url");
    expect(networkYaml).toContain("https://cdn.example/assets/hero.png");
    expect(networkYaml).not.toContain("file_path:");

    const pathMap = new Map<string, string>([
      ["https://cdn.example/assets/hero.png", "assets/hero.png"],
    ]);
    const restoredYaml = restoreYamlResourcePaths(
      networkYaml,
      pathMap,
      "content/a1B2c3D4e5.yaml",
      new Map<string, string>(),
    );

    expect(restoredYaml).toContain("source: file");
    expect(restoredYaml).toContain("file_path: assets/hero.png");
    expect(restoredYaml).not.toContain("https://cdn.example");
  });
});
