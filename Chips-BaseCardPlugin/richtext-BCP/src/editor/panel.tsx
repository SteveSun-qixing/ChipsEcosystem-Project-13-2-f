import type { BasecardConfig } from "../schema/card-config";
import { defaultBasecardConfig } from "../schema/card-config";
import { isNonEmptyString, sanitizeRichTextHtml } from "../shared/utils";
import { createTranslator } from "../shared/i18n";

export interface BasecardEditorProps {
  initialConfig: BasecardConfig;
  onChange: (next: BasecardConfig) => void;
}

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

  // 标题
  const titleLabel = document.createElement("label");
  titleLabel.textContent = t("basecard.title");
  titleLabel.className = "chips-basecard-editor__label";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "chips-basecard-editor__input";
  titleInput.value = props.initialConfig.title ?? "";
  titleLabel.appendChild(titleInput);
  form.appendChild(titleLabel);

  // 内容标签
  const bodyLabel = document.createElement("label");
  bodyLabel.textContent = t("basecard.body");
  bodyLabel.className = "chips-basecard-editor__label";

  // 工具栏
  const toolbar = document.createElement("div");
  toolbar.className = "chips-basecard-editor__toolbar";

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
    });
    return button;
  }

  // 文本格式
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

  // 标题 / 段落类型选择
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
    validateAndEmit();
  });
  toolbar.appendChild(blockSelect);

  // 列表与引用
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

  // 对齐
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

  // 颜色与字号
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.className = "chips-basecard-editor__color-input";
  colorInput.title = "文字颜色";
  colorInput.addEventListener("input", () => {
    if (!colorInput.value) return;
    execEditorCommand(bodyEditor, "foreColor", colorInput.value);
    validateAndEmit();
  });
  toolbar.appendChild(colorInput);

  const bgColorInput = document.createElement("input");
  bgColorInput.type = "color";
  bgColorInput.className = "chips-basecard-editor__color-input";
  bgColorInput.title = "背景高亮颜色";
  bgColorInput.addEventListener("input", () => {
    if (!bgColorInput.value) return;
    execEditorCommand(bodyEditor, "hiliteColor", bgColorInput.value);
    validateAndEmit();
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
    validateAndEmit();
    fontSizeSelect.value = "";
  });
  toolbar.appendChild(fontSizeSelect);

  // 清除格式
  const clearFormatButton = createToolbarButton("清除", "清除格式", () => {
    execEditorCommand(bodyEditor, "removeFormat");
    validateAndEmit();
  });
  toolbar.appendChild(clearFormatButton);

  // 插入链接
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
    validateAndEmit();
  });
  toolbar.appendChild(linkButton);

  // 插入图片
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
    validateAndEmit();
  });
  toolbar.appendChild(imageButton);

  // 插入水平线
  const hrButton = createToolbarButton("分隔线", "插入水平线", () => {
    execEditorCommand(bodyEditor, "insertHorizontalRule");
    validateAndEmit();
  });
  toolbar.appendChild(hrButton);

  bodyLabel.appendChild(toolbar);

  // 富文本编辑区域
  const bodyEditor = document.createElement("div");
  bodyEditor.className = "chips-basecard-editor__richtext";
  bodyEditor.contentEditable = "true";
  bodyEditor.innerHTML = props.initialConfig.body ?? "";
  bodyLabel.appendChild(bodyEditor);
  form.appendChild(bodyLabel);

  // 错误区域
  const errorBox = document.createElement("div");
  errorBox.className = "chips-basecard-editor__errors";
  form.appendChild(errorBox);

  function validateAndEmit(): void {
    const rawBodyHtml = bodyEditor.innerHTML;
    const safeBodyHtml = sanitizeRichTextHtml(rawBodyHtml);

    if (safeBodyHtml !== rawBodyHtml) {
      bodyEditor.innerHTML = safeBodyHtml;
    }

    const next: BasecardConfig = {
      ...defaultBasecardConfig,
      ...props.initialConfig,
      title: titleInput.value,
      body: safeBodyHtml,
    };

    const errors: string[] = [];
    if (!isNonEmptyString(next.title)) {
      errors.push(t("basecard.validation.titleRequired"));
    }

    const textContent = bodyEditor.textContent ?? "";
    if (!isNonEmptyString(textContent)) {
      errors.push(t("basecard.validation.bodyRequired"));
    }

    errorBox.textContent = "";
    if (errors.length > 0) {
      const list = document.createElement("ul");
      list.className = "chips-basecard-editor__errors-list";
      for (const msg of errors) {
        const li = document.createElement("li");
        li.textContent = msg;
        list.appendChild(li);
      }
      errorBox.appendChild(list);
      return;
    }

    props.onChange(next);
  }

  titleInput.addEventListener("input", () => {
    validateAndEmit();
  });

  bodyEditor.addEventListener("input", () => {
    validateAndEmit();
  });

  bodyEditor.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "bold");
      validateAndEmit();
    } else if (key === "i") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "italic");
      validateAndEmit();
    } else if (key === "u") {
      event.preventDefault();
      execEditorCommand(bodyEditor, "underline");
      validateAndEmit();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    validateAndEmit();
  });

  root.appendChild(form);
  return root;
}
