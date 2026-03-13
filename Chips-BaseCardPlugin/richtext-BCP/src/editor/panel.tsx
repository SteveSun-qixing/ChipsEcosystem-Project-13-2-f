import type { BasecardConfig } from "../schema/card-config";
import { defaultBasecardConfig } from "../schema/card-config";
import { isNonEmptyString, sanitizeRichTextHtml } from "../shared/utils";
import { createTranslator } from "../shared/i18n";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
}

type DraftConfig = Pick<BasecardConfig, "title" | "body">;

const EMIT_DEBOUNCE_MS = 120;

function ensureEditorFocus(editor: HTMLElement): void {
  if (document.activeElement !== editor) {
    editor.focus();
  }
}

function execEditorCommand(
  editor: HTMLElement,
  command: string,
  value?: string
): void {
  ensureEditorFocus(editor);
  if (value !== undefined) {
    document.execCommand(command, false, value);
  } else {
    document.execCommand(command, false);
  }
}

function wrapSelectionWithTag(tagName: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
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
}

function wrapSelectionWithStyle(style: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return;
  }

  const span = document.createElement("span");
  span.setAttribute("style", style);

  try {
    range.surroundContents(span);
  } catch {
    const text = selection.toString();
    document.execCommand(
      "insertHTML",
      false,
      `<span style="${style}">${text}</span>`
    );
  }
}

function insertHtmlAtSelection(editor: HTMLElement, html: string): void {
  ensureEditorFocus(editor);
  document.execCommand("insertHTML", false, html);
}

export function createBasecardEditorRoot(
  props: BasecardEditorProps
): HTMLElement {
  const t = createTranslator(props.initialConfig.locale);

  const root = document.createElement("div");
  root.className = "chips-basecard-editor chips-basecard-editor--richtext";

  const form = document.createElement("form");
  form.className = "chips-basecard-editor__form";

  const titleLabel = document.createElement("label");
  titleLabel.textContent = t("basecard.title");
  titleLabel.className = "chips-basecard-editor__label";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "chips-basecard-editor__input";
  titleInput.value = props.initialConfig.title ?? "";
  titleLabel.appendChild(titleInput);
  form.appendChild(titleLabel);

  const bodyLabel = document.createElement("label");
  bodyLabel.textContent = t("basecard.body");
  bodyLabel.className = "chips-basecard-editor__label";

  const toolbar = document.createElement("div");
  toolbar.className = "chips-basecard-editor__toolbar";

  const bodyEditor = document.createElement("div");
  bodyEditor.className = "chips-basecard-editor__richtext";
  bodyEditor.contentEditable = "true";
  bodyEditor.innerHTML = props.initialConfig.body ?? "";

  const errorBox = document.createElement("div");
  errorBox.className = "chips-basecard-editor__errors";

  let draft: DraftConfig = {
    title: props.initialConfig.title ?? "",
    body: props.initialConfig.body ?? "",
  };
  let lastCommittedSignature = JSON.stringify(draft);
  let emitTimer: number | null = null;

  function collectDraftFromDom(): DraftConfig {
    return {
      title: titleInput.value,
      body: bodyEditor.innerHTML,
    };
  }

  function renderValidation(showErrors: boolean, textContent: string): void {
    errorBox.textContent = "";
    if (!showErrors) {
      return;
    }

    const errors: string[] = [];
    if (!isNonEmptyString(textContent)) {
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
    const rawBodyHtml = nextDraft.body;
    const safeBodyHtml = sanitizeRichTextHtml(rawBodyHtml);

    if (safeBodyHtml !== rawBodyHtml) {
      bodyEditor.innerHTML = safeBodyHtml;
    }

    draft = {
      title: nextDraft.title,
      body: safeBodyHtml,
    };

    renderValidation(showErrors, bodyEditor.textContent ?? "");

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
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
      validateAndEmit(false);
    });
    return button;
  }

  const boldButton = createToolbarButton("B", "加粗", () =>
    execEditorCommand(bodyEditor, "bold")
  );
  const italicButton = createToolbarButton("I", "斜体", () =>
    execEditorCommand(bodyEditor, "italic")
  );
  const underlineButton = createToolbarButton("U", "下划线", () =>
    execEditorCommand(bodyEditor, "underline")
  );
  const strikeButton = createToolbarButton("S", "删除线", () =>
    execEditorCommand(bodyEditor, "strikeThrough")
  );
  const superscriptButton = createToolbarButton("X²", "上标", () =>
    execEditorCommand(bodyEditor, "superscript")
  );
  const subscriptButton = createToolbarButton("X₂", "下标", () =>
    execEditorCommand(bodyEditor, "subscript")
  );
  const codeButton = createToolbarButton("Code", "行内代码", () => {
    ensureEditorFocus(bodyEditor);
    wrapSelectionWithTag("code");
  });

  toolbar.appendChild(boldButton);
  toolbar.appendChild(italicButton);
  toolbar.appendChild(underlineButton);
  toolbar.appendChild(strikeButton);
  toolbar.appendChild(superscriptButton);
  toolbar.appendChild(subscriptButton);
  toolbar.appendChild(codeButton);

  const blockSelect = document.createElement("select");
  blockSelect.className = "chips-basecard-editor__block-select";
  const blockOptions: Array<{ value: string; label: string }> = [
    { value: "p", label: "正文" },
    { value: "h1", label: "标题 1" },
    { value: "h2", label: "标题 2" },
    { value: "h3", label: "标题 3" },
    { value: "h4", label: "标题 4" },
    { value: "h5", label: "标题 5" },
    { value: "h6", label: "标题 6" },
  ];
  for (const opt of blockOptions) {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    blockSelect.appendChild(optionEl);
  }
  blockSelect.addEventListener("change", () => {
    const value = blockSelect.value;
    ensureEditorFocus(bodyEditor);
    if (value === "p") {
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, value);
    }
    validateAndEmit(false);
  });
  toolbar.appendChild(blockSelect);

  const orderedListButton = createToolbarButton("1.", "有序列表", () =>
    execEditorCommand(bodyEditor, "insertOrderedList")
  );
  const unorderedListButton = createToolbarButton("•", "无序列表", () =>
    execEditorCommand(bodyEditor, "insertUnorderedList")
  );
  const blockquoteButton = createToolbarButton("❝", "引用", () =>
    execEditorCommand(bodyEditor, "formatBlock", "blockquote")
  );
  toolbar.appendChild(orderedListButton);
  toolbar.appendChild(unorderedListButton);
  toolbar.appendChild(blockquoteButton);

  const alignLeftButton = createToolbarButton("左", "左对齐", () =>
    execEditorCommand(bodyEditor, "justifyLeft")
  );
  const alignCenterButton = createToolbarButton("中", "居中对齐", () =>
    execEditorCommand(bodyEditor, "justifyCenter")
  );
  const alignRightButton = createToolbarButton("右", "右对齐", () =>
    execEditorCommand(bodyEditor, "justifyRight")
  );
  const alignJustifyButton = createToolbarButton("两端", "两端对齐", () =>
    execEditorCommand(bodyEditor, "justifyFull")
  );
  toolbar.appendChild(alignLeftButton);
  toolbar.appendChild(alignCenterButton);
  toolbar.appendChild(alignRightButton);
  toolbar.appendChild(alignJustifyButton);

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "chips-basecard-editor__color-input";
  colorInput.title = "文字颜色";
  colorInput.addEventListener("input", () => {
    if (!colorInput.value) return;
    execEditorCommand(bodyEditor, "foreColor", colorInput.value);
    validateAndEmit(false);
  });
  toolbar.appendChild(colorInput);

  const bgColorInput = document.createElement("input");
  bgColorInput.type = "color";
  bgColorInput.className = "chips-basecard-editor__color-input";
  bgColorInput.title = "背景高亮颜色";
  bgColorInput.addEventListener("input", () => {
    if (!bgColorInput.value) return;
    execEditorCommand(bodyEditor, "hiliteColor", bgColorInput.value);
    validateAndEmit(false);
  });
  toolbar.appendChild(bgColorInput);

  const fontSizeSelect = document.createElement("select");
  fontSizeSelect.className = "chips-basecard-editor__fontsize-select";
  const fontSizes = [12, 14, 16, 18, 24, 32];
  const defaultFontSizeOption = document.createElement("option");
  defaultFontSizeOption.value = "";
  defaultFontSizeOption.textContent = "字号";
  fontSizeSelect.appendChild(defaultFontSizeOption);
  for (const size of fontSizes) {
    const optionEl = document.createElement("option");
    optionEl.value = String(size);
    optionEl.textContent = `${size}px`;
    fontSizeSelect.appendChild(optionEl);
  }
  fontSizeSelect.addEventListener("change", () => {
    const value = fontSizeSelect.value;
    if (!value) return;
    const size = Number.parseInt(value, 10);
    if (!Number.isFinite(size)) return;
    ensureEditorFocus(bodyEditor);
    wrapSelectionWithStyle(`font-size: ${size}px`);
    validateAndEmit(false);
    fontSizeSelect.value = "";
  });
  toolbar.appendChild(fontSizeSelect);

  const clearFormatButton = createToolbarButton("清除", "清除格式", () => {
    execEditorCommand(bodyEditor, "removeFormat");
  });
  toolbar.appendChild(clearFormatButton);

  const linkButton = createToolbarButton("链接", "插入链接", () => {
    ensureEditorFocus(bodyEditor);
    const selection = window.getSelection();
    const selectedText =
      selection && selection.rangeCount > 0
        ? selection.toString()
        : "";
    const defaultUrl =
      selectedText && selectedText.startsWith("http")
        ? selectedText
        : "https://";
    const url = window.prompt("输入链接地址", defaultUrl) || "";
    if (!url.trim()) return;
    const text =
      selectedText ||
      window.prompt("输入链接文本（可选）", url) ||
      url;
    const escapedUrl = url.replace(/"/g, "&quot;");
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const linkHtml = `<a href="${escapedUrl}" target="_blank" rel="noopener">${escapedText}</a>`;
    insertHtmlAtSelection(bodyEditor, linkHtml);
  });
  toolbar.appendChild(linkButton);

  const imageButton = createToolbarButton("图片", "插入图片", () => {
    ensureEditorFocus(bodyEditor);
    const src = window.prompt("输入图片地址", "https://") || "";
    if (!src.trim()) return;
    const alt = window.prompt("输入图片说明（可选）", "") || "";
    const width = window.prompt("宽度（像素，可选）", "") || "";
    const height = window.prompt("高度（像素，可选）", "") || "";

    const parts: string[] = [];
    parts.push(`src="${src.replace(/"/g, "&quot;")}"`);
    if (alt) {
      parts.push(`alt="${alt.replace(/"/g, "&quot;")}"`);
    }
    if (width) {
      parts.push(`width="${width.replace(/"/g, "&quot;")}"`);
    }
    if (height) {
      parts.push(`height="${height.replace(/"/g, "&quot;")}"`);
    }
    const imgHtml = `<img ${parts.join(" ")} />`;
    insertHtmlAtSelection(bodyEditor, imgHtml);
  });
  toolbar.appendChild(imageButton);

  const hrButton = createToolbarButton("分隔线", "插入水平线", () => {
    execEditorCommand(bodyEditor, "insertHorizontalRule");
  });
  toolbar.appendChild(hrButton);

  bodyLabel.appendChild(toolbar);
  bodyLabel.appendChild(bodyEditor);
  form.appendChild(bodyLabel);
  form.appendChild(errorBox);

  titleInput.addEventListener("input", () => {
    draft = collectDraftFromDom();
    scheduleValidateAndEmit(false);
  });

  bodyEditor.addEventListener("input", () => {
    draft = collectDraftFromDom();
    scheduleValidateAndEmit(false);
  });

  bodyEditor.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "bold");
      draft = collectDraftFromDom();
      scheduleValidateAndEmit(false);
    } else if (key === "i") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "italic");
      draft = collectDraftFromDom();
      scheduleValidateAndEmit(false);
    } else if (key === "u") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "underline");
      draft = collectDraftFromDom();
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

  root.appendChild(form);
  return root;
}
