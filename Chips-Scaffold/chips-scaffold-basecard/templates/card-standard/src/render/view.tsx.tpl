import React from "react";
import {
  ChipsBox,
  ChipsStack,
  ChipsText,
} from "@chips/component-library";
import type { BasecardConfig } from "../schema/card-config";
import { createBasecardText } from "../shared/i18n";

export const VIEW_STYLE_TEXT = `
.chips-basecard {
  width: 100%;
}

.chips-basecard,
.chips-basecard * {
  box-sizing: border-box;
}

.chips-basecard__title {
  margin: 0;
}

.chips-basecard__body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
}

export function BasecardView({ config }: BasecardViewProps) {
  const t = createBasecardText(config.locale);

  return (
    <ChipsBox
      as="article"
      className="chips-basecard"
      data-card-type={config.card_type}
      aria-label={t("basecard.view.ariaLabel", { title: config.title })}
    >
      <ChipsStack
        className="chips-basecard__content"
        gap="var(--chips-comp-basecard-content-gap, var(--chips-sys-space-2))"
      >
        <ChipsText
          as="div"
          className="chips-basecard__title"
          role="heading"
          aria-level={2}
          text={config.title}
          emphasis="strong"
        />
        <ChipsText
          as="div"
          className="chips-basecard__body"
          text={config.body}
          tone="muted"
        />
      </ChipsStack>
    </ChipsBox>
  );
}
