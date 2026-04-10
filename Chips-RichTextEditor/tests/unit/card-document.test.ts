import { describe, expect, it } from "vitest";
import yaml from "yaml";
import {
  buildCompositeRichTextCardFiles,
  createEmptyRichTextCardDocument,
  parseCompositeRichTextCard,
} from "../../src/lib/card-document";

describe("富文本复合卡片文件模型", () => {
  it("应当能构建并回读单富文本基础卡片复合卡片", () => {
    const document = createEmptyRichTextCardDocument("card-demo", "base-demo", "测试文稿");
    const files = buildCompositeRichTextCardFiles(document, []);

    const parsed = parseCompositeRichTextCard({
      metadataYaml: files.metadataYaml,
      structureYaml: files.structureYaml,
      contentYaml: files.contentYaml,
    });

    expect(parsed.cardId).toBe("card-demo");
    expect(parsed.baseCardId).toBe("base-demo");
    expect(parsed.title).toBe("测试文稿");
    expect(parsed.config.card_type).toBe("RichTextCard");
    expect(parsed.config.content_source).toBe("inline");
  });

  it("应当在 structure manifest 中写入真实资源清单", () => {
    const document = createEmptyRichTextCardDocument("card-demo", "base-demo", "长文稿");
    document.config = {
      card_type: "RichTextCard",
      theme: "",
      locale: "zh-CN",
      content_format: "markdown",
      content_source: "file",
      content_file: "richtext-demo.md",
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
  });
});
