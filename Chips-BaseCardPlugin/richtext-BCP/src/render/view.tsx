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

.chips-richtext-card__surface del {
  text-decoration-thickness: 1.5px;
}

.chips-richtext-card__surface u,
.chips-richtext-card__surface ins {
  text-decoration-thickness: 1.5px;
  text-decoration-skip-ink: auto;
}

.chips-richtext-card__surface mark {
  padding: 0 0.18em;
  border-radius: 0.28em;
  background: color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 16%, #fff5b1);
  color: inherit;
}

.chips-richtext-card__surface sup,
.chips-richtext-card__surface sub {
  font-size: 0.78em;
  line-height: 0;
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

.chips-richtext-card__surface pre {
  margin: 0 0 16px;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: color-mix(in srgb, var(--chips-sys-color-surface-container, #f8fafc) 90%, #eef2ff);
  color: var(--chips-sys-color-on-surface, #111827);
  white-space: pre-wrap;
}

.chips-richtext-card__surface pre code {
  padding: 0;
  border-radius: 0;
  background: transparent;
  font-size: 0.95em;
}

.chips-richtext-card__surface table {
  width: 100%;
  margin: 0 0 16px;
  border-collapse: collapse;
  table-layout: fixed;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 14px;
}

.chips-richtext-card__surface th,
.chips-richtext-card__surface td {
  padding: 10px 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  text-align: left;
  vertical-align: top;
}

.chips-richtext-card__surface th {
  background: color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 7%, #f8fafc);
  font-weight: 600;
}

.chips-richtext-card__surface input[type="checkbox"] {
  margin-right: 8px;
  pointer-events: none;
}

.chips-richtext-card__surface .chips-richtext-math {
  overflow-x: auto;
}

.chips-richtext-card__surface .chips-richtext-math--inline {
  display: inline-flex;
  align-items: baseline;
  max-width: 100%;
}

.chips-richtext-card__surface .chips-richtext-math--block {
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 16px;
  background: color-mix(in srgb, var(--chips-sys-color-surface-container, #f8fafc) 90%, #ffffff);
}

.chips-richtext-card__surface .chips-richtext-math__fallback {
  margin: 0;
  white-space: pre-wrap;
  font: 0.94em/1.6 "SFMono-Regular", Consolas, monospace;
}

.chips-richtext-card__status {
  padding: 20px 24px;
  color: var(--chips-sys-color-on-surface-variant, #667085);
}

.chips-richtext-card__status--error {
  color: var(--chips-sys-color-error, #d92d20);
}
`;
