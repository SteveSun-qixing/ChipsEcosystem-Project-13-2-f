import "katex/dist/katex.min.css";

import type { Ctx, MilkdownPlugin } from "@milkdown/ctx";
import { remarkStringifyOptionsCtx } from "@milkdown/core";
import { remarkGFMPlugin } from "@milkdown/preset-gfm";
import { markRule } from "@milkdown/prose";
import type { MarkSpec, NodeSpec } from "@milkdown/prose/model";
import { textblockTypeInputRule } from "@milkdown/prose/inputrules";
import { $inputRule, $markAttr, $markSchema, $nodeAttr, $nodeSchema, $remark } from "@milkdown/utils";
import katex from "katex";
import { pandocMarkFromMarkdown, pandocMarkToMarkdown } from "mdast-util-mark";
import { pandocMark } from "micromark-extension-mark";
import remarkMath from "remark-math";
import remarkSupersub from "remark-supersub";

type MarkdownNodeLike = {
  type: string;
  value?: unknown;
  children?: MarkdownNodeLike[];
};

type MarkdownContainerNode = MarkdownNodeLike & {
  children?: MarkdownNodeLike[];
};

type RemarkProcessorData = {
  micromarkExtensions?: unknown[];
  fromMarkdownExtensions?: unknown[];
};

type MarkdownParentLike = MarkdownNodeLike & {
  children: MarkdownNodeLike[];
};

const KATEX_STRICT_MODE = "warn";

function filterMeaningfulChildren(children: MarkdownNodeLike[] | undefined): MarkdownNodeLike[] {
  return (children ?? []).filter(
    (child) => !(child.type === "text" && typeof child.value === "string" && child.value.length === 0),
  );
}

function stripEmptyTextNodes(node: MarkdownNodeLike): void {
  if (!node.children) {
    return;
  }

  node.children = node.children.filter(
    (child) => !(child.type === "text" && typeof child.value === "string" && child.value.length === 0),
  );

  for (const child of node.children) {
    stripEmptyTextNodes(child);
  }
}

function appendUniqueUnsafeEntries(
  existing: Array<{ character: string; inConstruct?: string }> | undefined,
  additions: Array<{ character: string; inConstruct?: string }>,
) {
  const next = [...(existing ?? [])];
  for (const entry of additions) {
    if (!next.some((item) => item.character === entry.character && item.inConstruct === entry.inConstruct)) {
      next.push(entry);
    }
  }
  return next;
}

function renderWrappedPhrasing(
  wrapper: string,
  marker: string,
  node: MarkdownContainerNode,
  context: {
    enter: (name: string) => () => void;
    containerPhrasing: (
      node: MarkdownContainerNode,
      options: {
        before: string;
        after: string;
      },
    ) => string;
  },
) {
  const exit = context.enter(wrapper);
  const value = context.containerPhrasing(node, {
    before: marker,
    after: marker,
  });
  exit();
  return `${marker}${value}${marker}`;
}

function renderInlineMathMarkup(value: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "chips-richtext-math chips-richtext-math--inline";
  span.setAttribute("data-chips-richtext-math", "inline");
  span.setAttribute("data-value", value);

  try {
    span.innerHTML = katex.renderToString(value, {
      displayMode: false,
      throwOnError: false,
      strict: KATEX_STRICT_MODE,
    });
  } catch {
    span.textContent = value;
    span.setAttribute("data-state", "error");
  }

  return span;
}

function renderBlockMathMarkup(value: string): HTMLElement {
  const block = document.createElement("div");
  block.className = "chips-richtext-math chips-richtext-math--block";
  block.setAttribute("data-chips-richtext-math", "block");
  block.setAttribute("data-value", value);

  try {
    block.innerHTML = katex.renderToString(value, {
      displayMode: true,
      throwOnError: false,
      strict: KATEX_STRICT_MODE,
    });
  } catch {
    const fallback = document.createElement("pre");
    fallback.className = "chips-richtext-math__fallback";
    fallback.textContent = value;
    block.replaceChildren(fallback);
    block.setAttribute("data-state", "error");
  }

  return block;
}

const highlightAttr = $markAttr("highlight");
const highlightSchema = $markSchema("highlight", (ctx) => ({
  attrs: {
    class: {
      default: "",
      validate: "string",
    },
  },
  parseDOM: [{ tag: "mark" }],
  toDOM: (mark) => ["mark", ctx.get(highlightAttr.key)(mark), 0],
  parseMarkdown: {
    match: (node) => node.type === "mark",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(filterMeaningfulChildren(node.children));
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "highlight",
    runner: (state, mark) => {
      state.withMark(mark, "mark");
    },
  },
} satisfies MarkSpec));

const underlineAttr = $markAttr("underline");
const underlineSchema = $markSchema("underline", (ctx) => ({
  parseDOM: [{ tag: "u" }, { tag: "ins" }],
  toDOM: (mark) => ["u", ctx.get(underlineAttr.key)(mark), 0],
  parseMarkdown: {
    match: (node) => node.type === "insert",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(filterMeaningfulChildren(node.children));
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "underline",
    runner: (state, mark) => {
      state.withMark(mark, "insert");
    },
  },
} satisfies MarkSpec));

const superscriptAttr = $markAttr("superscript");
const superscriptSchema = $markSchema("superscript", (ctx) => ({
  parseDOM: [{ tag: "sup" }],
  toDOM: (mark) => ["sup", ctx.get(superscriptAttr.key)(mark), 0],
  parseMarkdown: {
    match: (node) => node.type === "superscript",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(filterMeaningfulChildren(node.children));
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "superscript",
    runner: (state, mark) => {
      state.withMark(mark, "superscript");
    },
  },
} satisfies MarkSpec));

const subscriptAttr = $markAttr("subscript");
const subscriptSchema = $markSchema("subscript", (ctx) => ({
  parseDOM: [{ tag: "sub" }],
  toDOM: (mark) => ["sub", ctx.get(subscriptAttr.key)(mark), 0],
  parseMarkdown: {
    match: (node) => node.type === "subscript",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(filterMeaningfulChildren(node.children));
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "subscript",
    runner: (state, mark) => {
      state.withMark(mark, "subscript");
    },
  },
} satisfies MarkSpec));

const inlineMathAttr = $nodeAttr("inline_math");
const inlineMathSchema = $nodeSchema("inline_math", (ctx) => ({
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  attrs: {
    value: {
      default: "",
      validate: "string",
    },
  },
  toDOM: (node) => {
    const rendered = renderInlineMathMarkup(node.attrs.value);
    for (const [key, value] of Object.entries(ctx.get(inlineMathAttr.key)(node))) {
      rendered.setAttribute(key, String(value));
    }
    return rendered;
  },
  parseDOM: [
    {
      tag: 'span[data-chips-richtext-math="inline"]',
      getAttrs: (dom) => ({
        value: (dom as HTMLElement).dataset.value ?? "",
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === "inlineMath",
    runner: (state, node, type) => {
      state.addNode(type, {
        value: typeof node.value === "string" ? node.value : "",
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "inline_math",
    runner: (state, node) => {
      state.addNode("inlineMath", undefined, node.attrs.value);
    },
  },
} satisfies NodeSpec));

const blockMathAttr = $nodeAttr("block_math");
const blockMathSchema = $nodeSchema("block_math", (ctx) => ({
  group: "block",
  atom: true,
  code: true,
  defining: true,
  selectable: true,
  attrs: {
    value: {
      default: "",
      validate: "string",
    },
  },
  toDOM: (node) => {
    const rendered = renderBlockMathMarkup(node.attrs.value);
    for (const [key, value] of Object.entries(ctx.get(blockMathAttr.key)(node))) {
      rendered.setAttribute(key, String(value));
    }
    return rendered;
  },
  parseDOM: [
    {
      tag: 'div[data-chips-richtext-math="block"]',
      getAttrs: (dom) => ({
        value: (dom as HTMLElement).dataset.value ?? "",
      }),
    },
  ],
  parseMarkdown: {
    match: (node) => node.type === "math",
    runner: (state, node, type) => {
      state.addNode(type, {
        value: typeof node.value === "string" ? node.value : "",
      });
    },
  },
  toMarkdown: {
    match: (node) => node.type.name === "block_math",
    runner: (state, node) => {
      state.addNode("math", undefined, node.attrs.value);
    },
  },
} satisfies NodeSpec));

const highlightInputRule = $inputRule((ctx) =>
  markRule(/(?:==)([^=\s](?:[\s\S]*?[^=\s])?)==$/, highlightSchema.type(ctx)));

const underlineInputRule = $inputRule((ctx) =>
  markRule(/(?:\+\+)([^+\s](?:[\s\S]*?[^+\s])?)\+\+$/, underlineSchema.type(ctx)));

const superscriptInputRule = $inputRule((ctx) =>
  markRule(/(?:^|[^^])\^([^^\s](?:[\s\S]*?[^^\s])?)\^$/, superscriptSchema.type(ctx), {
    updateCaptured: ({ fullMatch, start }) =>
      !fullMatch.startsWith("^")
        ? { fullMatch: fullMatch.slice(1), start: start + 1 }
        : {},
  }));

const subscriptInputRule = $inputRule((ctx) =>
  markRule(/(?:^|[^~])~([^~\s](?:[\s\S]*?[^~\s])?)~$/, subscriptSchema.type(ctx), {
    updateCaptured: ({ fullMatch, start }) =>
      !fullMatch.startsWith("~")
        ? { fullMatch: fullMatch.slice(1), start: start + 1 }
        : {},
  }));

const blockMathInputRule = $inputRule((ctx) =>
  textblockTypeInputRule(/^\$\$(?<value>.+)\$\$$/, blockMathSchema.type(ctx), (match) => ({
    value: match.groups?.value?.trim() ?? "",
  })));

const remarkPandocMark = $remark("remarkPandocMark", () => function remarkPandocMarkSyntax(this: {
  data(): RemarkProcessorData;
}) {
  const data = this.data();
  const micromarkExtensions = data.micromarkExtensions ?? (data.micromarkExtensions = []);
  const fromMarkdownExtensions = data.fromMarkdownExtensions ?? (data.fromMarkdownExtensions = []);
  micromarkExtensions.push(pandocMark());
  fromMarkdownExtensions.push(pandocMarkFromMarkdown);
});

const richTextUnderlinePlugin = $remark("richTextUnderline", () => () => (tree) => {
  const visitTextNodes = (node: MarkdownNodeLike) => {
    if (!node.children) {
      return;
    }

    const nextChildren: MarkdownNodeLike[] = [];
    for (const child of node.children) {
      if (child.type === "text" && typeof child.value === "string") {
        const fragments = child.value.split("++");
        if (fragments.length > 1 && fragments.length % 2 === 1) {
          fragments.forEach((fragment, index) => {
            if (index % 2 === 0) {
              nextChildren.push({ type: "text", value: fragment });
              return;
            }

            nextChildren.push({
              type: "insert",
              children: [{ type: "text", value: fragment }],
            });
          });
          continue;
        }
      }

      nextChildren.push(child);
    }

    (node as MarkdownParentLike).children = nextChildren;
    for (const child of nextChildren) {
      visitTextNodes(child);
    }
  };

  visitTextNodes(tree as MarkdownNodeLike);
});
const richTextMathPlugin = $remark("richTextMath", () => remarkMath);
const richTextSuperSubPlugin = $remark("richTextSuperSub", () => remarkSupersub);
const richTextCleanupPlugin = $remark("richTextCleanup", () => () => (tree) => {
  stripEmptyTextNodes(tree as MarkdownNodeLike);
});

export function configureRichTextMarkdown(ctx: Ctx): void {
  ctx.set(remarkGFMPlugin.options.key, {
    singleTilde: false,
  });

  ctx.update(remarkStringifyOptionsCtx, (prev) => ({
    ...prev,
    handlers: {
      ...(prev.handlers ?? {}),
      ...(pandocMarkToMarkdown.handlers ?? {}),
      insert: (node, _, state) => renderWrappedPhrasing("insert", "++", node, state),
      superscript: (node, _, state) => renderWrappedPhrasing("superscript", "^", node, state),
      subscript: (node, _, state) => renderWrappedPhrasing("subscript", "~", node, state),
    },
    unsafe: appendUniqueUnsafeEntries(
      appendUniqueUnsafeEntries(prev.unsafe, pandocMarkToMarkdown.unsafe ?? []),
      [
        { character: "+", inConstruct: "phrasing" },
        { character: "^", inConstruct: "phrasing" },
        { character: "~", inConstruct: "phrasing" },
      ],
    ),
  }));
}

export const richTextMarkdownPlugins: MilkdownPlugin[] = [
  highlightAttr,
  highlightSchema,
  underlineAttr,
  underlineSchema,
  superscriptAttr,
  superscriptSchema,
  subscriptAttr,
  subscriptSchema,
  inlineMathAttr,
  inlineMathSchema,
  blockMathAttr,
  blockMathSchema,
  highlightInputRule,
  underlineInputRule,
  superscriptInputRule,
  subscriptInputRule,
  blockMathInputRule,
  remarkPandocMark,
  richTextMathPlugin,
  richTextUnderlinePlugin,
  richTextSuperSubPlugin,
  richTextCleanupPlugin,
].flat();
