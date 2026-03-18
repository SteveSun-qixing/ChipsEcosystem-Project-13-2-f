import React from "react";
import type { BasecardConfig } from "../schema/card-config";
import { normalizeRichTextHtml } from "../shared/utils";

export const VIEW_STYLE_TEXT = `
.chips-richtext-card {
  width: 100%;
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
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow-wrap: anywhere;
}

.chips-richtext-card__surface > :first-child {
  margin-top: 0;
}

.chips-richtext-card__surface > :last-child {
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
`;

export interface RichTextCardViewProps {
  config: BasecardConfig;
}

export function RichTextCardView({ config }: RichTextCardViewProps) {
  return (
    <div className="chips-richtext-card" data-card-type={config.card_type}>
      <div
        className="chips-richtext-card__surface"
        dangerouslySetInnerHTML={{ __html: normalizeRichTextHtml(config.body) }}
      />
    </div>
  );
}
