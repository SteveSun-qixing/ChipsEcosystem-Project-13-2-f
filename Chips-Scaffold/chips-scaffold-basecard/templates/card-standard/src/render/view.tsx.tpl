import React from "react";
import type { BasecardConfig } from "../schema/card-config";

export const VIEW_STYLE_TEXT = `
.chips-basecard {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #111827);
  font: 14px/1.6 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-basecard,
.chips-basecard * {
  box-sizing: border-box;
}

.chips-basecard__surface {
  width: 100%;
  padding: 20px 24px;
  border-radius: 22px;
  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(15, 23, 42, 0.12));
  background: var(--chips-comp-card-shell-root-surface, var(--chips-sys-color-surface, #ffffff));
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.chips-basecard__title {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.chips-basecard__body {
  white-space: pre-wrap;
  color: var(--chips-sys-color-on-surface-variant, #475467);
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
}

export function BasecardView({ config }: BasecardViewProps) {
  return (
    <div className="chips-basecard" data-card-type={config.card_type}>
      <div className="chips-basecard__surface">
        <h2 className="chips-basecard__title">{config.title}</h2>
        <div className="chips-basecard__body">{config.body}</div>
      </div>
    </div>
  );
}
