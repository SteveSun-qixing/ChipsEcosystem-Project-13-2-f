export const VIEW_STYLE_TEXT = `
html, body {
  margin: 0;
  width: 100%;
  min-height: 100%;
  background: transparent;
}

.chips-richtext-card {
  width: 100%;
  min-height: 100%;
  color: var(--chips-sys-color-on-surface, #111827);
  font: 14px/1.7 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
  background: transparent;
}

.chips-richtext-card,
.chips-richtext-card * {
  box-sizing: border-box;
}

.chips-richtext-card__surface {
  width: 100%;
  min-height: 100%;
  padding: 20px 24px;
  background: transparent;
  overflow-wrap: anywhere;
}

.chips-richtext-card__surface .milkdown,
.chips-richtext-card__surface .milkdown .editor {
  background: transparent;
}

.chips-richtext-card__surface .ProseMirror {
  outline: none;
  white-space: break-spaces;
}

.chips-richtext-card__surface .ProseMirror[contenteditable="false"] {
  cursor: default;
}

.chips-richtext-card__surface .ProseMirror > :first-child {
  margin-top: 0;
}

.chips-richtext-card__surface .ProseMirror > :last-child {
  margin-bottom: 0;
}

.chips-richtext-card__surface p,
.chips-richtext-card__surface ul,
.chips-richtext-card__surface ol,
.chips-richtext-card__surface blockquote,
.chips-richtext-card__surface h1,
.chips-richtext-card__surface h2,
.chips-richtext-card__surface h3,
.chips-richtext-card__surface h4,
.chips-richtext-card__surface h5,
.chips-richtext-card__surface h6 {
  margin: 0 0 12px;
}

.chips-richtext-card__surface blockquote {
  margin-left: 0;
  padding-left: 14px;
  border-left: 3px solid rgba(37, 99, 235, 0.28);
  color: #475467;
}

.chips-richtext-card__surface code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 0.92em;
}

.chips-richtext-card__surface img {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

.chips-richtext-card__surface hr {
  border: 0;
  border-top: 1px solid rgba(15, 23, 42, 0.12);
  margin: 16px 0;
}

.chips-richtext-card__status {
  padding: 20px 24px;
  color: var(--chips-sys-color-on-surface-variant, #667085);
}

.chips-richtext-card__status--error {
  color: var(--chips-sys-color-error, #d92d20);
}
`;
