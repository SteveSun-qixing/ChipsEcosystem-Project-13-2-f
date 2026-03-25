import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
} from "@milkdown/core";
import { commonmark, insertHrCommand, toggleEmphasisCommand, toggleInlineCodeCommand, toggleLinkCommand, toggleStrongCommand, turnIntoTextCommand, wrapInBlockquoteCommand, wrapInBulletListCommand, wrapInHeadingCommand, wrapInOrderedListCommand } from "@milkdown/preset-commonmark";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { callCommand, getMarkdown } from "@milkdown/utils";
import type { Editor as MilkdownEditor } from "@milkdown/core";
import type { Selection } from "@milkdown/prose/state";
import { editorViewOptionsCtx as _editorViewOptionsCtx } from "@milkdown/core";
import { toggleMark } from "@milkdown/prose/commands";
import type { BasecardResourceImportRequest, BasecardResourceImportResult } from "../index";
import {
  collectRichTextResourcePaths,
  createFileBasecardConfig,
  createInlineBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
  type BasecardConfig,
} from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { rewriteRelativeResourceUrls, loadMarkdownFromConfig } from "../shared/resource-links";
import {
  MAX_INLINE_RICHTEXT_LENGTH,
  countUnicodeCharacters,
  createRichTextMarkdownFileName,
  extractPlainTextFromMarkdown,
  hasMeaningfulMarkdownContent,
  normalizeMarkdown,
  shouldUseFileStorage,
} from "../shared/utils";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
  resolveResourceUrl?: (resourcePath: string) => Promise<string>;
  releaseResourceUrl?: (resourcePath: string) => Promise<void> | void;
  importResource?: (
    input: BasecardResourceImportRequest,
  ) => Promise<BasecardResourceImportResult>;
  deleteResource?: (resourcePath: string) => Promise<void>;
}

type EditorRoot = HTMLElement & {
  __chipsDispose?: () => void;
};

type ToolbarButton = {
  key: string;
  labelKey: string;
  run: (controller: EditorController) => void | Promise<void>;
};

type EditorController = {
  root: EditorRoot;
  editorHost: HTMLDivElement;
  scrollSurface: HTMLDivElement;
  floatingToolbar: HTMLDivElement;
  errorList: HTMLUListElement;
  locale: string;
  theme: string;
  props: BasecardEditorProps;
  t: ReturnType<typeof createTranslator>;
  editor?: MilkdownEditor;
  disposed: boolean;
  focused: boolean;
  currentMarkdown: string;
  currentFilePath?: string;
  sessionFileName: string;
  lastCommittedSignature: string;
  lastResolvedResources: Set<string>;
  isComposing: boolean;
  isImporting: boolean;
  rerunCommitAfterImport: boolean;
  flushTimer?: number;
  pendingErrors: string[];
  handleWindowResize: () => void;
};

const EDITOR_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--chips-sys-color-surface, #ffffff);
}

#chips-basecard-editor-root {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.chips-basecard-editor {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 14px 16px 16px;
  background: var(--chips-sys-color-surface, #ffffff);
  color: var(--chips-sys-color-on-surface, #111827);
  font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.chips-basecard-editor *,
.chips-basecard-editor *::before,
.chips-basecard-editor *::after {
  box-sizing: border-box;
}

.chips-basecard-editor__surface-frame {
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.chips-basecard-editor__surface {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 22px;
  background: var(--chips-comp-card-shell-root-surface, var(--chips-sys-color-surface, #ffffff));
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  overscroll-behavior: contain;
}

.chips-basecard-editor__editor-host {
  min-height: 100%;
  padding: 20px 24px 56px;
}

.chips-basecard-editor__editor-host .milkdown,
.chips-basecard-editor__editor-host .milkdown .editor {
  background: transparent;
}

.chips-basecard-editor__editor-host .ProseMirror {
  min-height: 100%;
  outline: none;
  color: inherit;
  white-space: break-spaces;
  word-break: break-word;
}

.chips-basecard-editor__editor-host .ProseMirror > :first-child {
  margin-top: 0;
}

.chips-basecard-editor__editor-host .ProseMirror > :last-child {
  margin-bottom: 0;
}

.chips-basecard-editor__editor-host .ProseMirror p,
.chips-basecard-editor__editor-host .ProseMirror ul,
.chips-basecard-editor__editor-host .ProseMirror ol,
.chips-basecard-editor__editor-host .ProseMirror blockquote,
.chips-basecard-editor__editor-host .ProseMirror h1,
.chips-basecard-editor__editor-host .ProseMirror h2,
.chips-basecard-editor__editor-host .ProseMirror h3,
.chips-basecard-editor__editor-host .ProseMirror h4,
.chips-basecard-editor__editor-host .ProseMirror h5,
.chips-basecard-editor__editor-host .ProseMirror h6 {
  margin: 0 0 12px;
}

.chips-basecard-editor__editor-host .ProseMirror blockquote {
  margin-left: 0;
  padding-left: 14px;
  border-left: 3px solid rgba(37, 99, 235, 0.28);
  color: #475467;
}

.chips-basecard-editor__editor-host .ProseMirror code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}

.chips-basecard-editor__editor-host .ProseMirror img {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

.chips-basecard-editor__floating-toolbar {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: min(560px, calc(100% - 32px));
  padding: 10px 12px;
  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.14);
  transform: translate(-50%, calc(-100% - 12px));
  backdrop-filter: blur(16px);
}

.chips-basecard-editor__floating-toolbar[hidden] {
  display: none;
}

.chips-basecard-editor__toolbar-button,
.chips-basecard-editor__toolbar-select {
  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.12));
  border-radius: 10px;
  background: var(--chips-comp-card-shell-root-surface, #ffffff);
  color: inherit;
  font: inherit;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease,
    transform 0.15s ease;
}

.chips-basecard-editor__toolbar-button {
  min-width: 36px;
  min-height: 36px;
  padding: 0 10px;
  cursor: pointer;
  font-weight: 600;
}

.chips-basecard-editor__toolbar-select {
  min-width: 108px;
  min-height: 36px;
  padding: 0 10px;
}

.chips-basecard-editor__toolbar-button:hover,
.chips-basecard-editor__toolbar-select:hover {
  border-color: rgba(37, 99, 235, 0.55);
  transform: translateY(-1px);
}

.chips-basecard-editor__toolbar-button:focus-visible,
.chips-basecard-editor__toolbar-select:focus-visible {
  border-color: rgba(37, 99, 235, 0.85);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.chips-basecard-editor__meta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 20px;
  color: var(--chips-sys-color-on-surface-variant, #667085);
  font-size: 12px;
}

.chips-basecard-editor__errors {
  flex: 0 0 auto;
  min-height: 0;
  padding: 10px 16px 14px;
  font-size: 13px;
  color: var(--chips-sys-color-error, #d92d20);
}

.chips-basecard-editor__errors[hidden] {
  display: none;
}

.chips-basecard-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}
`;

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    key: "bold",
    labelKey: "basecard.toolbar.bold",
    run: (controller) => {
      runCommand(controller, toggleStrongCommand.key);
    },
  },
  {
    key: "italic",
    labelKey: "basecard.toolbar.italic",
    run: (controller) => {
      runCommand(controller, toggleEmphasisCommand.key);
    },
  },
  {
    key: "code",
    labelKey: "basecard.toolbar.code",
    run: (controller) => {
      runCommand(controller, toggleInlineCodeCommand.key);
    },
  },
  {
    key: "blockquote",
    labelKey: "basecard.toolbar.blockquote",
    run: (controller) => {
      runCommand(controller, wrapInBlockquoteCommand.key);
    },
  },
  {
    key: "orderedList",
    labelKey: "basecard.toolbar.orderedList",
    run: (controller) => {
      runCommand(controller, wrapInOrderedListCommand.key);
    },
  },
  {
    key: "unorderedList",
    labelKey: "basecard.toolbar.unorderedList",
    run: (controller) => {
      runCommand(controller, wrapInBulletListCommand.key);
    },
  },
  {
    key: "divider",
    labelKey: "basecard.toolbar.divider",
    run: (controller) => {
      runCommand(controller, insertHrCommand.key);
    },
  },
  {
    key: "link",
    labelKey: "basecard.toolbar.link",
    run: async (controller) => {
      const url = askUserForValue(controller.t("basecard.prompt.linkUrl"));
      if (!url) {
        return;
      }
      runCommand(controller, toggleLinkCommand.key, { href: url });
    },
  },
  {
    key: "clear",
    labelKey: "basecard.toolbar.clear",
    run: (controller) => {
      clearInlineFormatting(controller);
    },
  },
];

function askUserForValue(label: string): string | null {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return null;
  }
  const value = window.prompt(label);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function createToolbarSelect(controller: EditorController): HTMLSelectElement {
  const select = document.createElement("select");
  select.className = "chips-basecard-editor__toolbar-select";
  select.setAttribute("aria-label", controller.t("basecard.toolbar.block"));

  const options = [
    { value: "paragraph", label: controller.t("basecard.block.paragraph") },
    { value: "h1", label: controller.t("basecard.block.h1") },
    { value: "h2", label: controller.t("basecard.block.h2") },
    { value: "h3", label: controller.t("basecard.block.h3") },
  ];

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  }

  select.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });
  select.addEventListener("change", () => {
    if (select.value === "paragraph") {
      runCommand(controller, turnIntoTextCommand.key);
    } else {
      const level = Number(select.value.replace("h", ""));
      runCommand(controller, wrapInHeadingCommand.key, level);
    }
    select.value = "paragraph";
  });

  return select;
}

function renderMeta(controller: EditorController, meta: HTMLDivElement): void {
  const plainTextLength = countUnicodeCharacters(extractPlainTextFromMarkdown(controller.currentMarkdown));
  const storageMode = plainTextLength > MAX_INLINE_RICHTEXT_LENGTH
    ? controller.t("basecard.storage.file")
    : controller.t("basecard.storage.inline");
  meta.textContent = controller.t("basecard.meta.storage", {
    mode: storageMode,
    count: plainTextLength,
  });
}

function setErrors(controller: EditorController, errors: string[]): void {
  controller.pendingErrors = errors;
  controller.errorList.innerHTML = "";
  const wrapper = controller.errorList.parentElement as HTMLElement;
  if (errors.length === 0) {
    wrapper.hidden = true;
    return;
  }

  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = error;
    controller.errorList.appendChild(item);
  }
  wrapper.hidden = false;
}

function scheduleCommit(controller: EditorController, reason: "change" | "flush"): void {
  if (controller.disposed || controller.isComposing) {
    return;
  }

  if (controller.flushTimer) {
    window.clearTimeout(controller.flushTimer);
    controller.flushTimer = undefined;
  }

  if (reason === "flush") {
    void commitCurrentMarkdown(controller);
    return;
  }

  controller.flushTimer = window.setTimeout(() => {
    controller.flushTimer = undefined;
    void commitCurrentMarkdown(controller);
  }, 80);
}

function buildConfigSignature(config: BasecardConfig): string {
  return JSON.stringify(config);
}

async function commitCurrentMarkdown(controller: EditorController): Promise<void> {
  if (controller.disposed || !controller.editor) {
    return;
  }

  if (controller.isImporting) {
    controller.rerunCommitAfterImport = true;
    return;
  }

  const markdown = normalizeMarkdown(controller.editor.action(getMarkdown()));
  controller.currentMarkdown = markdown;

  const hasContent = hasMeaningfulMarkdownContent(markdown);
  if (!hasContent) {
    setErrors(controller, [controller.t("basecard.validation.bodyRequired")]);
    const meta = controller.root.querySelector(".chips-basecard-editor__meta") as HTMLDivElement | null;
    if (meta) {
      renderMeta(controller, meta);
    }
    return;
  }

  const plainTextLength = countUnicodeCharacters(extractPlainTextFromMarkdown(markdown));
  let nextConfig: BasecardConfig;

  if (shouldUseFileStorage(plainTextLength)) {
    if (!controller.props.importResource) {
      setErrors(controller, [controller.t("basecard.validation.importUnavailable")]);
      return;
    }

    controller.isImporting = true;
    try {
      const currentPreferredPath = controller.currentFilePath || controller.sessionFileName;
      const file = new File([markdown], currentPreferredPath, { type: "text/markdown;charset=utf-8" });
      const imported = await controller.props.importResource({
        file,
        preferredPath: currentPreferredPath,
      });
      const nextFilePath = imported.path;
      if (controller.currentFilePath && controller.currentFilePath !== nextFilePath && controller.props.deleteResource) {
        await controller.props.deleteResource(controller.currentFilePath);
      }
      controller.currentFilePath = nextFilePath;
      nextConfig = createFileBasecardConfig(nextFilePath, controller.locale, controller.theme);
    } finally {
      controller.isImporting = false;
    }
  } else {
    if (controller.currentFilePath && controller.props.deleteResource) {
      await controller.props.deleteResource(controller.currentFilePath);
      controller.currentFilePath = undefined;
    }
    nextConfig = createInlineBasecardConfig(markdown, controller.locale, controller.theme);
  }

  const validation = validateBasecardConfig(nextConfig);
  if (!validation.valid) {
    setErrors(controller, Object.values(validation.errors));
    return;
  }

  setErrors(controller, []);
  const signature = buildConfigSignature(nextConfig);
  if (signature !== controller.lastCommittedSignature) {
    controller.lastCommittedSignature = signature;
    controller.props.onChange(nextConfig);
  }

  const meta = controller.root.querySelector(".chips-basecard-editor__meta") as HTMLDivElement | null;
  if (meta) {
    renderMeta(controller, meta);
  }

  if (controller.rerunCommitAfterImport) {
    controller.rerunCommitAfterImport = false;
    void commitCurrentMarkdown(controller);
  }
}

function runCommand<T>(controller: EditorController, commandKey: string | { name?: string }, payload?: T): void {
  if (!controller.editor) {
    return;
  }

  const key = typeof commandKey === "string" ? commandKey : (commandKey as { name?: string }).name ?? commandKey;
  controller.editor.action(callCommand(key as never, payload));
  void syncPreviewResources(controller);
  scheduleCommit(controller, "change");
}

function clearInlineFormatting(controller: EditorController): void {
  if (!controller.editor) {
    return;
  }

  controller.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const { state } = view;
    const { from, to } = state.selection;
    const tr = state.tr;
    const marks = [
      state.schema.marks.strong,
      state.schema.marks.em,
      state.schema.marks.link,
      state.schema.marks.code,
    ].filter(Boolean);

    for (const mark of marks) {
      tr.removeMark(from, to, mark);
    }

    const paragraph = state.schema.nodes.paragraph;
    if (paragraph) {
      try {
        tr.setBlockType(from, to, paragraph);
      } catch {
        // ignore block conversion failures
      }
    }

    view.dispatch(tr.scrollIntoView());
  });

  void syncPreviewResources(controller);
  scheduleCommit(controller, "change");
}

function updateToolbarPosition(controller: EditorController, selection?: Selection): void {
  if (!controller.editor || !controller.focused) {
    controller.floatingToolbar.hidden = true;
    return;
  }

  const view = controller.editor.action((ctx) => ctx.get(editorViewCtx));
  const currentSelection = selection ?? view.state.selection;
  if (currentSelection.empty) {
    controller.floatingToolbar.hidden = true;
    return;
  }

  const start = view.coordsAtPos(currentSelection.from);
  const end = view.coordsAtPos(currentSelection.to);
  const rootRect = controller.root.getBoundingClientRect();
  const toolbarWidth = controller.floatingToolbar.offsetWidth || 280;
  const centerX = ((start.left + end.right) / 2) - rootRect.left;
  const clampedX = Math.min(Math.max(centerX, 24 + toolbarWidth / 2), rootRect.width - 24 - toolbarWidth / 2);
  const top = Math.max(Math.min(start.top, end.top) - rootRect.top, 16);

  controller.floatingToolbar.style.left = `${clampedX}px`;
  controller.floatingToolbar.style.top = `${top}px`;
  controller.floatingToolbar.hidden = false;
}

async function syncPreviewResources(controller: EditorController): Promise<void> {
  if (!controller.props.resolveResourceUrl) {
    return;
  }

  for (const resourcePath of controller.lastResolvedResources) {
    controller.props.releaseResourceUrl?.(resourcePath);
  }
  controller.lastResolvedResources.clear();

  const resolved = await rewriteRelativeResourceUrls(controller.editorHost, controller.props.resolveResourceUrl);
  resolved.forEach((resourcePath) => controller.lastResolvedResources.add(resourcePath));
}

export function createBasecardEditorRoot(props: BasecardEditorProps): EditorRoot {
  const config = normalizeBasecardConfig(props.initialConfig as unknown as Record<string, unknown>);
  const root = document.createElement("div") as EditorRoot;
  root.id = "chips-basecard-editor-root";

  const style = document.createElement("style");
  style.textContent = EDITOR_STYLE_TEXT;
  root.appendChild(style);

  const editorRoot = document.createElement("div");
  editorRoot.className = "chips-basecard-editor";
  root.appendChild(editorRoot);

  const surfaceFrame = document.createElement("div");
  surfaceFrame.className = "chips-basecard-editor__surface-frame";
  editorRoot.appendChild(surfaceFrame);

  const scrollSurface = document.createElement("div");
  scrollSurface.className = "chips-basecard-editor__surface";
  surfaceFrame.appendChild(scrollSurface);

  const editorHost = document.createElement("div");
  editorHost.className = "chips-basecard-editor__editor-host";
  scrollSurface.appendChild(editorHost);

  const floatingToolbar = document.createElement("div");
  floatingToolbar.className = "chips-basecard-editor__floating-toolbar";
  floatingToolbar.hidden = true;
  surfaceFrame.appendChild(floatingToolbar);

  const meta = document.createElement("div");
  meta.className = "chips-basecard-editor__meta";
  editorRoot.appendChild(meta);

  const errors = document.createElement("div");
  errors.className = "chips-basecard-editor__errors";
  errors.hidden = true;
  const errorList = document.createElement("ul");
  errorList.className = "chips-basecard-editor__errors-list";
  errors.appendChild(errorList);
  editorRoot.appendChild(errors);

  const controller: EditorController = {
    root,
    editorHost,
    scrollSurface,
    floatingToolbar,
    errorList,
    locale: config.locale ?? "zh-CN",
    theme: config.theme ?? "",
    props,
    t: createTranslator(config.locale),
    disposed: false,
    focused: false,
    currentMarkdown: "",
    currentFilePath: config.content_source === "file" ? config.content_file : undefined,
    sessionFileName: createRichTextMarkdownFileName(config.content_file?.replace(/\.md$/i, "")),
    lastCommittedSignature: "",
    lastResolvedResources: new Set<string>(),
    isComposing: false,
    isImporting: false,
    rerunCommitAfterImport: false,
    pendingErrors: [],
    handleWindowResize: () => {
      updateToolbarPosition(controller);
    },
  };

  const toolbarSelect = createToolbarSelect(controller);
  floatingToolbar.appendChild(toolbarSelect);

  for (const definition of TOOLBAR_BUTTONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chips-basecard-editor__toolbar-button";
    button.setAttribute("aria-label", controller.t(definition.labelKey));
    button.textContent = controller.t(definition.labelKey);
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      void definition.run(controller);
    });
    floatingToolbar.appendChild(button);
  }

  renderMeta(controller, meta);

  scrollSurface.addEventListener("scroll", () => {
    updateToolbarPosition(controller);
  }, { passive: true });
  window.addEventListener("resize", controller.handleWindowResize);

  void (async () => {
    try {
      const markdown = normalizeMarkdown(await loadMarkdownFromConfig(config, props.resolveResourceUrl));
      controller.currentMarkdown = markdown;
      controller.editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorHost);
          ctx.set(defaultValueCtx, markdown);
          ctx.update(_editorViewOptionsCtx, (prev) => ({
            ...prev,
            attributes: {
              ...(typeof prev.attributes === "object" ? prev.attributes : {}),
              spellcheck: "true",
              autocapitalize: "off",
              autocorrect: "off",
              translate: "no",
            },
          }));
        })
        .use(commonmark)
        .use(listener)
        .create();

      if (controller.disposed) {
        await controller.editor.destroy();
        return;
      }

      controller.editor.action((ctx) => {
        const manager = ctx.get(listenerCtx);
        manager.markdownUpdated((_listenerCtx, nextMarkdown) => {
          controller.currentMarkdown = normalizeMarkdown(nextMarkdown);
          renderMeta(controller, meta);
          void syncPreviewResources(controller);
          scheduleCommit(controller, "change");
        });
        manager.selectionUpdated((_listenerCtx, selection) => {
          updateToolbarPosition(controller, selection);
        });
        manager.focus(() => {
          controller.focused = true;
          updateToolbarPosition(controller);
        });
        manager.blur(() => {
          controller.focused = false;
          controller.floatingToolbar.hidden = true;
          scheduleCommit(controller, "flush");
        });
      });

      const view = controller.editor.action((ctx) => ctx.get(editorViewCtx));
      view.dom.addEventListener("compositionstart", () => {
        controller.isComposing = true;
      });
      view.dom.addEventListener("compositionend", () => {
        controller.isComposing = false;
        scheduleCommit(controller, "change");
      });
      view.dom.addEventListener("keydown", (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
          event.preventDefault();
          runCommand(controller, toggleStrongCommand.key);
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
          event.preventDefault();
          runCommand(controller, toggleEmphasisCommand.key);
        }
      });

      await syncPreviewResources(controller);
      renderMeta(controller, meta);
      if (!hasMeaningfulMarkdownContent(markdown)) {
        setErrors(controller, [controller.t("basecard.validation.bodyRequired")]);
      }
    } catch (error) {
      setErrors(controller, [`${controller.t("basecard.status.loadFailed")}：${error instanceof Error ? error.message : String(error)}`]);
    }
  })();

  root.__chipsDispose = () => {
    controller.disposed = true;
    if (controller.flushTimer) {
      window.clearTimeout(controller.flushTimer);
      controller.flushTimer = undefined;
    }
    if (controller.editor) {
      void controller.editor.destroy();
    }
    for (const resourcePath of controller.lastResolvedResources) {
      controller.props.releaseResourceUrl?.(resourcePath);
    }
    controller.lastResolvedResources.clear();
    window.removeEventListener("resize", controller.handleWindowResize);
  };

  return root;
}
