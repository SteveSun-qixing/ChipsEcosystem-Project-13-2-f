import { describe, expect, it } from "vitest";
import yaml from "yaml";
import {
  buildCompositeRichTextCardFiles,
  createEmptyRichTextCardDocument,
  parseCompositeRichTextCard,
  validateCompositeRichTextCardFiles,
} from "../../src/lib/card-document";

describe("富文本复合卡片文件模型", () => {
  it("应当能构建并回读单富文本基础卡片复合卡片", () => {
    const document = createEmptyRichTextCardDocument("a1B2c3D4e5", "f6G7h8I9j0", "测试文稿");
    const files = buildCompositeRichTextCardFiles(document, []);

    const parsed = parseCompositeRichTextCard({
      metadataYaml: files.metadataYaml,
      structureYaml: files.structureYaml,
      contentYaml: files.contentYaml,
    });

    expect(parsed.cardId).toBe("a1B2c3D4e5");
    expect(parsed.baseCardId).toBe("f6G7h8I9j0");
    expect(parsed.title).toBe("测试文稿");
    expect(parsed.config.card_type).toBe("base.richtext");
    expect(parsed.config.content_source).toBe("inline");
    expect(parsed.config.markdown_capabilities).toMatchObject({
      commonmark: true,
      gfm: true,
      math: true,
      highlight: true,
      underline: true,
      superscript: true,
      subscript: true,
    });
    expect(validateCompositeRichTextCardFiles(files).valid).toBe(true);
  });

  it("应当在 structure manifest 中写入真实资源清单", () => {
    const document = createEmptyRichTextCardDocument("a1B2c3D4e5", "f6G7h8I9j0", "长文稿");
    document.config = {
      card_type: "base.richtext",
      theme: "",
      locale: "zh-CN",
      content_format: "markdown",
      content_source: "file",
      content_file: "richtext-demo.md",
      markdown_capabilities: {
        commonmark: true,
        gfm: true,
        math: true,
        highlight: true,
        underline: true,
        superscript: true,
        subscript: true,
      },
    };

    const files = buildCompositeRichTextCardFiles(document, [
      {
        path: "richtext-demo.md",
        size: 128,
        type: "text/markdown",
      },
    ]);
    const structure = yaml.parse(files.structureYaml) as {
      manifest?: {
        card_count?: number;
        resource_count?: number;
        resources?: Array<{ path?: string; type?: string; size?: number }>;
      };
    };

    expect(structure.manifest?.card_count).toBe(1);
    expect(structure.manifest?.resource_count).toBe(1);
    expect(structure.manifest?.resources?.[0]).toMatchObject({
      path: "richtext-demo.md",
      type: "text/markdown",
      size: 128,
    });
    expect(validateCompositeRichTextCardFiles(files).valid).toBe(true);
  });

  it("应当拒绝不符合卡片文件结构的富文本保存模型", () => {
    const document = createEmptyRichTextCardDocument("a1B2c3D4e5", "f6G7h8I9j0", "坏结构");
    document.config = {
      card_type: "base.richtext",
      theme: "",
      locale: "zh-CN",
      content_format: "markdown",
      content_source: "file",
      content_text: "不应和 file 模式共存",
      content_file: "/Users/demo/body.md",
      markdown_capabilities: {
        commonmark: true,
        gfm: true,
        math: true,
        highlight: true,
        underline: true,
        superscript: true,
        subscript: true,
      },
    };

    const files = buildCompositeRichTextCardFiles(document, [
      {
        path: "content/body.md",
        size: 12,
        type: "text/markdown",
      },
    ]);
    const validation = validateCompositeRichTextCardFiles({
      ...files,
      structureYaml: yaml.stringify({
        structure: [
          { id: "f6G7h8I9j0", type: "base.richtext" },
          { id: "k1L2m3N4o5", type: "base.richtext" },
        ],
        manifest: {
          card_count: 2,
          resource_count: 1,
          resources: [
            {
              path: "content/body.md",
              size: 12,
              type: "text/markdown",
            },
          ],
        },
      }),
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "CARD_STRUCTURE_NODE_COUNT_INVALID",
      "RICHTEXT_FILE_PATH_INVALID",
      "RICHTEXT_FILE_TEXT_FORBIDDEN",
      "CARD_MANIFEST_CARD_COUNT_INVALID",
      "CARD_MANIFEST_RESOURCE_PATH_INVALID",
    ]));
  });
});
