import type { BasecardConfig } from "../schema/card-config";
import { defaultBasecardConfig } from "../schema/card-config";
import { sanitizeRichTextHtml } from "../shared/utils";
import { createTranslator } from "../shared/i18n";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
}

type DraftConfig = Pick<BasecardConfig, "title" | "body">;

const EMIT_DEBOUNCE_MS = 120;
const EMPTY_BODY_HTML = "<p></p>";
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "li",
]);

const EDITOR_STYLE_TEXT = `
.chips-basecard-editor {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  height: 100%;
  padding: 16px;
  gap: 12px;
  background: var(--chips-color-surface, #ffffff);
  color: var(--chips-color-text, #111827);
  font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.chips-basecard-editor *,
.chips-basecard-editor *::before,
.chips-basecard-editor *::after {
  box-sizing: border-box;
}

.chips-basecard-editor__form {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.chips-basecard-editor__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.chips-basecard-editor__label-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--chips-color-text-secondary, #475467);
}

.chips-basecard-editor__input {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--chips-color-border, #d0d5dd);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--chips-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.chips-basecard-editor__input:focus {
  border-color: var(--chips-color-primary, #1570ef);
  box-shadow: 0 0 0 3px rgba(21, 112, 239, 0.12);
}

.chips-basecard-editor__editor-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--chips-color-border, #d0d5dd);
  border-radius: 16px;
  background: var(--chips-color-surface, #ffffff);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.chips-basecard-editor__toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--chips-color-border, #eaecf0);
  background: color-mix(
    in srgb,
    var(--chips-color-surface, #ffffff) 92%,
    var(--chips-color-primary, #1570ef) 8%
  );
}

.chips-basecard-editor__toolbar-button,
.chips-basecard-editor__toolbar-select,
.chips-basecard-editor__toolbar-color {
  border: 1px solid var(--chips-color-border, #d0d5dd);
  border-radius: 10px;
  background: var(--chips-color-surface, #ffffff);
  color: inherit;
  font: inherit;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.chips-basecard-editor__toolbar-button {
  min-width: 36px;
  padding: 7px 10px;
  cursor: pointer;
  font-weight: 600;
}

.chips-basecard-editor__toolbar-button:hover,
.chips-basecard-editor__toolbar-select:hover,
.chips-basecard-editor__toolbar-color:hover {
  border-color: var(--chips-color-primary, #1570ef);
}

.chips-basecard-editor__toolbar-button:focus-visible,
.chips-basecard-editor__toolbar-select:focus-visible,
.chips-basecard-editor__toolbar-color:focus-visible {
  border-color: var(--chips-color-primary, #1570ef);
  box-shadow: 0 0 0 3px rgba(21, 112, 239, 0.12);
}

.chips-basecard-editor__toolbar-select {
  min-width: 108px;
  padding: 7px 10px;
}

.chips-basecard-editor__toolbar-color {
  width: 38px;
  height: 38px;
  padding: 4px;
  cursor: pointer;
}

.chips-basecard-editor__body-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0) 32px),
    var(--chips-color-surface, #ffffff);
}

.chips-basecard-editor__richtext {
  min-height: 100%;
  outline: none;
  color: inherit;
  word-break: break-word;
}

.chips-basecard-editor__richtext > :first-child {
  margin-top: 0;
}

.chips-basecard-editor__richtext > :last-child {
  margin-bottom: 0;
}

.chips-basecard-editor__richtext p,
.chips-basecard-editor__richtext ul,
.chips-basecard-editor__richtext ol,
.chips-basecard-editor__richtext blockquote,
.chips-basecard-editor__richtext h1,
.chips-basecard-editor__richtext h2,
.chips-basecard-editor__richtext h3,
.chips-basecard-editor__richtext h4,
.chips-basecard-editor__richtext h5,
.chips-basecard-editor__richtext h6 {
  margin: 0 0 12px;
}

.chips-basecard-editor__richtext blockquote {
  margin-left: 0;
  padding-left: 12px;
  border-left: 3px solid var(--chips-color-border, #d0d5dd);
  color: var(--chips-color-text-secondary, #667085);
}

.chips-basecard-editor__richtext code {
  padding: 2px 5px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}

.chips-basecard-editor__richtext img {
  max-width: 100%;
  height: auto;
}

.chips-basecard-editor__errors {
  min-height: 20px;
  font-size: 13px;
  color: var(--chips-color-error, #d92d20);
}

.chips-basecard-editor__errors-list {
  margin: 0;
  padding-left: 18px;
}
`;

function ensureEditorFocus(editor: HTMLElement): void {
  if (document.activeElement !== editor) {
    editor.focus();
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasMeaningfulEditorContent(editor: HTMLElement): boolean {
  const text = (editor.textContent ?? "").replace(/\u00a0/g, " ").trim();
  if (text.length > 0) {
    return true;
  }

  return editor.querySelector("img, hr") !== null;
}

function normalizeEditorHtml(html: string): string {
  const sanitized = sanitizeRichTextHtml(html);
  if (!sanitized.trim()) {
    return EMPTY_BODY_HTML;
  }
  return sanitized;
}

function isRangeInsideEditor(range: Range, editor: HTMLElement): boolean {
  const container = range.commonAncestorContainer;
  return container === editor || editor.contains(container);
}

function cloneEditorSelection(editor: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!isRangeInsideEditor(range, editor)) {
    return null;
  }

  return range.cloneRange();
}

function placeCaretAtEnd(editor: HTMLElement): Range {
  ensureEditorFocus(editor);
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);

  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return range;
}

function restoreEditorSelection(
  editor: HTMLElement,
  savedRange: Range | null
): Range {
  ensureEditorFocus(editor);

  const selection = window.getSelection();
  if (!selection) {
    return placeCaretAtEnd(editor);
  }

  if (savedRange && isRangeInsideEditor(savedRange, editor)) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
    return savedRange;
  }

  return placeCaretAtEnd(editor);
}

function executeDocumentCommand(command: string, value?: string): boolean {
  const execCommand = (document as Document & {
    execCommand?: (name: string, showUi?: boolean, value?: string) => boolean;
  }).execCommand;

  if (typeof execCommand !== "function") {
    return false;
  }

  if (command === "formatBlock" && value) {
    return (
      execCommand.call(document, command, false, value) ||
      execCommand.call(document, command, false, `<${value}>`)
    );
  }

  return execCommand.call(document, command, false, value);
}

function replaceSelectionWithHtml(editor: HTMLElement, html: string): void {
  const safeHtml = sanitizeRichTextHtml(html).trim();
  if (!safeHtml) {
    return;
  }

  const range = restoreEditorSelection(editor, cloneEditorSelection(editor));
  range.deleteContents();

  const fragment = range.createContextualFragment(safeHtml);
  const lastInsertedNode = fragment.lastChild;
  range.insertNode(fragment);

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const nextRange = document.createRange();
  if (lastInsertedNode) {
    nextRange.setStartAfter(lastInsertedNode);
  } else {
    nextRange.selectNodeContents(editor);
    nextRange.collapse(false);
  }
  nextRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

function wrapSelectionWithTag(editor: HTMLElement, tagName: string): void {
  const range = restoreEditorSelection(editor, cloneEditorSelection(editor));
  if (range.collapsed) {
    return;
  }

  const element = document.createElement(tagName);
  try {
    range.surroundContents(element);
  } catch {
    const contents = range.extractContents();
    element.appendChild(contents);
    range.insertNode(element);
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const nextRange = document.createRange();
  nextRange.selectNodeContents(element);
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

function wrapSelectionWithStyle(editor: HTMLElement, style: string): void {
  const range = restoreEditorSelection(editor, cloneEditorSelection(editor));
  if (range.collapsed) {
    return;
  }

  const span = document.createElement("span");
  span.setAttribute("style", style);

  try {
    range.surroundContents(span);
  } catch {
    const text = range.toString();
    replaceSelectionWithHtml(
      editor,
      `<span style="${escapeHtml(style)}">${escapeHtml(text)}</span>`
    );
    return;
  }

  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  nextRange.collapse(false);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

function plainTextToRichTextHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return EMPTY_BODY_HTML;
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const lineHtml = block
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>");
      return `<p>${lineHtml || "<br>"}</p>`;
    })
    .join("");
}

function getCurrentBlockTag(editor: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return "p";
  }

  const range = selection.getRangeAt(0);
  if (!isRangeInsideEditor(range, editor)) {
    return "p";
  }

  let node: Node | null = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      const tagName = node.tagName.toLowerCase();
      if (BLOCK_TAGS.has(tagName)) {
        return tagName === "li" ? "p" : tagName;
      }
    }
    node = node.parentNode;
  }

  return "p";
}

function createValidatedFragmentHtml(
  html: string,
  requiredSelector?: string
): string {
  const safeHtml = sanitizeRichTextHtml(html).trim();
  if (!safeHtml) {
    return "";
  }

  if (!requiredSelector) {
    return safeHtml;
  }

  const template = document.createElement("template");
  template.innerHTML = safeHtml;
  return template.content.querySelector(requiredSelector) ? safeHtml : "";
}

export function createBasecardEditorRoot(
  props: BasecardEditorProps
): HTMLElement {
  const t = createTranslator(props.initialConfig.locale);

  const root = document.createElement("div");
  root.className = "chips-basecard-editor chips-basecard-editor--richtext";

  const style = document.createElement("style");
  style.textContent = EDITOR_STYLE_TEXT;
  root.appendChild(style);

  const form = document.createElement("form");
  form.className = "chips-basecard-editor__form";

  const titleField = document.createElement("label");
  titleField.className = "chips-basecard-editor__field";

  const titleLabelText = document.createElement("span");
  titleLabelText.className = "chips-basecard-editor__label-text";
  titleLabelText.textContent = t("basecard.title");
  titleField.appendChild(titleLabelText);

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "chips-basecard-editor__input";
  titleInput.value = props.initialConfig.title ?? "";
  titleField.appendChild(titleInput);
  form.appendChild(titleField);

  const bodyField = document.createElement("section");
  bodyField.className = "chips-basecard-editor__field";

  const bodyLabelText = document.createElement("span");
  bodyLabelText.className = "chips-basecard-editor__label-text";
  bodyLabelText.textContent = t("basecard.body");
  bodyField.appendChild(bodyLabelText);

  const editorShell = document.createElement("div");
  editorShell.className = "chips-basecard-editor__editor-shell";

  const toolbar = document.createElement("div");
  toolbar.className = "chips-basecard-editor__toolbar";

  const bodyScroll = document.createElement("div");
  bodyScroll.className = "chips-basecard-editor__body-scroll";

  const bodyEditor = document.createElement("div");
  bodyEditor.className = "chips-basecard-editor__richtext";
  bodyEditor.contentEditable = "true";
  bodyEditor.spellcheck = true;
  bodyEditor.setAttribute("role", "textbox");
  bodyEditor.setAttribute("aria-multiline", "true");
  bodyEditor.innerHTML = normalizeEditorHtml(props.initialConfig.body ?? "");
  bodyScroll.appendChild(bodyEditor);

  const errorBox = document.createElement("div");
  errorBox.className = "chips-basecard-editor__errors";

  let draft: DraftConfig = {
    title: props.initialConfig.title ?? "",
    body: normalizeEditorHtml(props.initialConfig.body ?? ""),
  };
  let lastCommittedSignature = JSON.stringify(draft);
  let emitTimer: number | null = null;
  let savedSelection: Range | null = null;

  function rememberSelection(): void {
    savedSelection = cloneEditorSelection(bodyEditor);
  }

  function restoreSelection(): Range {
    return restoreEditorSelection(bodyEditor, savedSelection);
  }

  function syncToolbarState(): void {
    blockSelect.value = getCurrentBlockTag(bodyEditor);
  }

  function collectDraftFromDom(): DraftConfig {
    return {
      title: titleInput.value,
      body: normalizeEditorHtml(bodyEditor.innerHTML),
    };
  }

  function renderValidation(showErrors: boolean): void {
    errorBox.textContent = "";
    if (!showErrors) {
      return;
    }

    const errors: string[] = [];
    if (!hasMeaningfulEditorContent(bodyEditor)) {
      errors.push(t("basecard.validation.bodyRequired"));
    }

    if (errors.length === 0) {
      return;
    }

    const list = document.createElement("ul");
    list.className = "chips-basecard-editor__errors-list";
    for (const msg of errors) {
      const li = document.createElement("li");
      li.textContent = msg;
      list.appendChild(li);
    }
    errorBox.appendChild(list);
  }

  function validateAndEmit(showErrors = false): void {
    const nextDraft = collectDraftFromDom();
    const safeBodyHtml = normalizeEditorHtml(nextDraft.body);

    if (safeBodyHtml !== bodyEditor.innerHTML) {
      bodyEditor.innerHTML = safeBodyHtml;
    }

    draft = {
      title: nextDraft.title,
      body: safeBodyHtml,
    };

    renderValidation(showErrors);

    const next: BasecardConfig = {
      ...defaultBasecardConfig,
      ...props.initialConfig,
      title: draft.title,
      body: safeBodyHtml,
    };

    const signature = JSON.stringify(draft);
    if (signature === lastCommittedSignature) {
      return;
    }

    lastCommittedSignature = signature;
    props.onChange(next);
  }

  function scheduleValidateAndEmit(showErrors = false): void {
    if (emitTimer !== null) {
      window.clearTimeout(emitTimer);
    }
    emitTimer = window.setTimeout(() => {
      emitTimer = null;
      validateAndEmit(showErrors);
    }, EMIT_DEBOUNCE_MS);
  }

  function flushValidateAndEmit(showErrors = true): void {
    if (emitTimer !== null) {
      window.clearTimeout(emitTimer);
      emitTimer = null;
    }
    validateAndEmit(showErrors);
  }

  function runEditorCommand(command: string, value?: string): void {
    restoreSelection();
    executeDocumentCommand(command, value);
    rememberSelection();
    syncToolbarState();
  }

  function createToolbarButton(
    text: string,
    title: string,
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chips-basecard-editor__toolbar-button";
    button.textContent = text;
    button.title = title;
    button.setAttribute("aria-label", title);
    button.addEventListener("mousedown", (event) => {
      rememberSelection();
      event.preventDefault();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
      validateAndEmit(false);
    });
    return button;
  }

  const boldButton = createToolbarButton("B", t("basecard.toolbar.bold"), () =>
    runEditorCommand("bold")
  );
  const italicButton = createToolbarButton("I", t("basecard.toolbar.italic"), () =>
    runEditorCommand("italic")
  );
  const underlineButton = createToolbarButton("U", t("basecard.toolbar.underline"), () =>
    runEditorCommand("underline")
  );
  const strikeButton = createToolbarButton("S", t("basecard.toolbar.strike"), () =>
    runEditorCommand("strikeThrough")
  );
  const superscriptButton = createToolbarButton(
    "X2",
    t("basecard.toolbar.superscript"),
    () => runEditorCommand("superscript")
  );
  const subscriptButton = createToolbarButton(
    "X_2",
    t("basecard.toolbar.subscript"),
    () => runEditorCommand("subscript")
  );
  const codeButton = createToolbarButton("Code", t("basecard.toolbar.code"), () => {
    restoreSelection();
    wrapSelectionWithTag(bodyEditor, "code");
    rememberSelection();
  });

  toolbar.appendChild(boldButton);
  toolbar.appendChild(italicButton);
  toolbar.appendChild(underlineButton);
  toolbar.appendChild(strikeButton);
  toolbar.appendChild(superscriptButton);
  toolbar.appendChild(subscriptButton);
  toolbar.appendChild(codeButton);

  const blockSelect = document.createElement("select");
  blockSelect.className = "chips-basecard-editor__toolbar-select";
  blockSelect.title = t("basecard.toolbar.block");
  blockSelect.setAttribute("aria-label", t("basecard.toolbar.block"));

  const blockOptions: Array<{ value: string; label: string }> = [
    { value: "p", label: t("basecard.block.paragraph") },
    { value: "h1", label: t("basecard.block.h1") },
    { value: "h2", label: t("basecard.block.h2") },
    { value: "h3", label: t("basecard.block.h3") },
    { value: "h4", label: t("basecard.block.h4") },
    { value: "h5", label: t("basecard.block.h5") },
    { value: "h6", label: t("basecard.block.h6") },
  ];

  for (const opt of blockOptions) {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    blockSelect.appendChild(optionEl);
  }

  blockSelect.addEventListener("mousedown", () => {
    rememberSelection();
  });
  blockSelect.addEventListener("change", () => {
    const value = blockSelect.value;
    runEditorCommand("formatBlock", value === "p" ? "p" : value);
    validateAndEmit(false);
  });
  toolbar.appendChild(blockSelect);

  const orderedListButton = createToolbarButton(
    "1.",
    t("basecard.toolbar.orderedList"),
    () => runEditorCommand("insertOrderedList")
  );
  const unorderedListButton = createToolbarButton(
    "•",
    t("basecard.toolbar.unorderedList"),
    () => runEditorCommand("insertUnorderedList")
  );
  const blockquoteButton = createToolbarButton(
    "\"",
    t("basecard.toolbar.blockquote"),
    () => runEditorCommand("formatBlock", "blockquote")
  );
  toolbar.appendChild(orderedListButton);
  toolbar.appendChild(unorderedListButton);
  toolbar.appendChild(blockquoteButton);

  const alignLeftButton = createToolbarButton("L", t("basecard.toolbar.alignLeft"), () =>
    runEditorCommand("justifyLeft")
  );
  const alignCenterButton = createToolbarButton(
    "C",
    t("basecard.toolbar.alignCenter"),
    () => runEditorCommand("justifyCenter")
  );
  const alignRightButton = createToolbarButton("R", t("basecard.toolbar.alignRight"), () =>
    runEditorCommand("justifyRight")
  );
  const alignJustifyButton = createToolbarButton(
    "J",
    t("basecard.toolbar.alignJustify"),
    () => runEditorCommand("justifyFull")
  );
  toolbar.appendChild(alignLeftButton);
  toolbar.appendChild(alignCenterButton);
  toolbar.appendChild(alignRightButton);
  toolbar.appendChild(alignJustifyButton);

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "chips-basecard-editor__toolbar-color";
  colorInput.title = t("basecard.toolbar.textColor");
  colorInput.setAttribute("aria-label", t("basecard.toolbar.textColor"));
  colorInput.addEventListener("mousedown", () => {
    rememberSelection();
  });
  colorInput.addEventListener("input", () => {
    if (!colorInput.value) {
      return;
    }
    runEditorCommand("foreColor", colorInput.value);
    validateAndEmit(false);
  });
  toolbar.appendChild(colorInput);

  const bgColorInput = document.createElement("input");
  bgColorInput.type = "color";
  bgColorInput.className = "chips-basecard-editor__toolbar-color";
  bgColorInput.title = t("basecard.toolbar.highlightColor");
  bgColorInput.setAttribute("aria-label", t("basecard.toolbar.highlightColor"));
  bgColorInput.addEventListener("mousedown", () => {
    rememberSelection();
  });
  bgColorInput.addEventListener("input", () => {
    if (!bgColorInput.value) {
      return;
    }
    runEditorCommand("hiliteColor", bgColorInput.value);
    validateAndEmit(false);
  });
  toolbar.appendChild(bgColorInput);

  const fontSizeSelect = document.createElement("select");
  fontSizeSelect.className = "chips-basecard-editor__toolbar-select";
  fontSizeSelect.title = t("basecard.toolbar.fontSize");
  fontSizeSelect.setAttribute("aria-label", t("basecard.toolbar.fontSize"));

  const fontSizes = [12, 14, 16, 18, 24, 32];
  const defaultFontSizeOption = document.createElement("option");
  defaultFontSizeOption.value = "";
  defaultFontSizeOption.textContent = t("basecard.toolbar.fontSize");
  fontSizeSelect.appendChild(defaultFontSizeOption);
  for (const size of fontSizes) {
    const optionEl = document.createElement("option");
    optionEl.value = String(size);
    optionEl.textContent = `${size}px`;
    fontSizeSelect.appendChild(optionEl);
  }
  fontSizeSelect.addEventListener("mousedown", () => {
    rememberSelection();
  });
  fontSizeSelect.addEventListener("change", () => {
    const value = fontSizeSelect.value;
    if (!value) {
      return;
    }

    const size = Number.parseInt(value, 10);
    if (!Number.isFinite(size)) {
      return;
    }

    restoreSelection();
    wrapSelectionWithStyle(bodyEditor, `font-size: ${size}px`);
    rememberSelection();
    validateAndEmit(false);
    fontSizeSelect.value = "";
  });
  toolbar.appendChild(fontSizeSelect);

  const clearFormatButton = createToolbarButton(
    t("basecard.toolbar.clear"),
    t("basecard.toolbar.clear"),
    () => runEditorCommand("removeFormat")
  );
  toolbar.appendChild(clearFormatButton);

  const linkButton = createToolbarButton(
    t("basecard.toolbar.link"),
    t("basecard.toolbar.link"),
    () => {
      const selectionRange = cloneEditorSelection(bodyEditor);
      const selectedText = selectionRange?.toString() ?? "";
      const defaultUrl =
        selectedText && selectedText.startsWith("http")
          ? selectedText
          : "https://";

      const url = (window.prompt(t("basecard.prompt.linkUrl"), defaultUrl) ?? "").trim();
      if (!url) {
        return;
      }

      const text = (
        selectedText || window.prompt(t("basecard.prompt.linkText"), url) || url
      ).trim();
      const linkHtml = createValidatedFragmentHtml(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`,
        'a[href]'
      );
      if (!linkHtml) {
        return;
      }

      restoreEditorSelection(bodyEditor, selectionRange);
      replaceSelectionWithHtml(bodyEditor, linkHtml);
      rememberSelection();
    }
  );
  toolbar.appendChild(linkButton);

  const imageButton = createToolbarButton(
    t("basecard.toolbar.image"),
    t("basecard.toolbar.image"),
    () => {
      const selectionRange = cloneEditorSelection(bodyEditor);
      const src = (window.prompt(t("basecard.prompt.imageUrl"), "https://") ?? "").trim();
      if (!src) {
        return;
      }

      const alt = (window.prompt(t("basecard.prompt.imageAlt"), "") ?? "").trim();
      const width = (window.prompt(t("basecard.prompt.imageWidth"), "") ?? "").trim();
      const height = (window.prompt(t("basecard.prompt.imageHeight"), "") ?? "").trim();

      const parts: string[] = [];
      parts.push(`src="${escapeHtml(src)}"`);
      if (alt) {
        parts.push(`alt="${escapeHtml(alt)}"`);
      }
      if (width) {
        parts.push(`width="${escapeHtml(width)}"`);
      }
      if (height) {
        parts.push(`height="${escapeHtml(height)}"`);
      }

      const imageHtml = createValidatedFragmentHtml(
        `<img ${parts.join(" ")} />`,
        "img[src]"
      );
      if (!imageHtml) {
        return;
      }

      restoreEditorSelection(bodyEditor, selectionRange);
      replaceSelectionWithHtml(bodyEditor, imageHtml);
      rememberSelection();
    }
  );
  toolbar.appendChild(imageButton);

  const hrButton = createToolbarButton(
    t("basecard.toolbar.divider"),
    t("basecard.toolbar.divider"),
    () => runEditorCommand("insertHorizontalRule")
  );
  toolbar.appendChild(hrButton);

  editorShell.appendChild(toolbar);
  editorShell.appendChild(bodyScroll);
  bodyField.appendChild(editorShell);
  form.appendChild(bodyField);
  form.appendChild(errorBox);

  titleInput.addEventListener("input", () => {
    draft = collectDraftFromDom();
    scheduleValidateAndEmit(false);
  });

  bodyEditor.addEventListener("focus", () => {
    rememberSelection();
    syncToolbarState();
  });

  bodyEditor.addEventListener("mouseup", () => {
    rememberSelection();
    syncToolbarState();
  });

  bodyEditor.addEventListener("keyup", () => {
    rememberSelection();
    syncToolbarState();
  });

  bodyEditor.addEventListener("input", () => {
    rememberSelection();
    syncToolbarState();
    draft = collectDraftFromDom();
    scheduleValidateAndEmit(false);
  });

  bodyEditor.addEventListener("paste", (event) => {
    event.preventDefault();

    const clipboardData = event.clipboardData;
    const pastedHtml = clipboardData?.getData("text/html") ?? "";
    const pastedText = clipboardData?.getData("text/plain") ?? "";
    const normalizedHtml = pastedHtml
      ? sanitizeRichTextHtml(pastedHtml).trim()
      : plainTextToRichTextHtml(pastedText);

    if (!normalizedHtml) {
      return;
    }

    rememberSelection();
    restoreSelection();
    replaceSelectionWithHtml(bodyEditor, normalizedHtml);
    rememberSelection();
    syncToolbarState();
    scheduleValidateAndEmit(false);
  });

  bodyEditor.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      runEditorCommand("bold");
      scheduleValidateAndEmit(false);
    } else if (key === "i") {
      event.preventDefault();
      runEditorCommand("italic");
      scheduleValidateAndEmit(false);
    } else if (key === "u") {
      event.preventDefault();
      runEditorCommand("underline");
      scheduleValidateAndEmit(false);
    }
  });

  form.addEventListener("focusout", (event) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && form.contains(nextTarget)) {
      return;
    }
    flushValidateAndEmit(true);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    flushValidateAndEmit(true);
  });

  syncToolbarState();
  root.appendChild(form);
  return root;
}
