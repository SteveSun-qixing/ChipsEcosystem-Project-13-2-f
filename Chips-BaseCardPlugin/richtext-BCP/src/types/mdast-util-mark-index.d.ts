import type { Extension as FromMarkdownExtension } from "mdast-util-from-markdown";
import type { Options as ToMarkdownOptions } from "mdast-util-to-markdown";

export interface Mark {
  type: "mark";
  children: unknown[];
}

export const pandocMarkFromMarkdown: FromMarkdownExtension;
export const pandocMarkToMarkdown: ToMarkdownOptions;
