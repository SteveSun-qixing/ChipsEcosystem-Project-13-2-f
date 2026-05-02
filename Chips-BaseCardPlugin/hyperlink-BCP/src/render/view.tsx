import React from "react";
import type { BasecardOpenResourceInput } from "../index";
import type { BasecardConfig } from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { validateHyperlinkUrl } from "../shared/utils";

type ChipsBridge = {
  invoke?: <TPayload = unknown, TResult = unknown>(
    action: string,
    payload?: TPayload,
  ) => Promise<TResult> | TResult;
  transfer?: {
    openExternal?: (url: string) => Promise<void> | void;
  };
  platform?: {
    openExternal?: (url: string) => Promise<void> | void;
  };
};

export type OpenHyperlinkOptions = {
  openResource?: (input: BasecardOpenResourceInput) => void;
  title?: string;
};

function getChipsBridge(): ChipsBridge | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as Window & { chips?: ChipsBridge }).chips;
}

export async function openHyperlinkInSystemBrowser(
  url: string,
  options: OpenHyperlinkOptions = {},
): Promise<void> {
  if (options.openResource) {
    options.openResource({
      resourceId: url,
      mimeType: "text/html",
      title: options.title,
    });
    return;
  }

  const chips = getChipsBridge();
  if (chips?.transfer?.openExternal) {
    await chips.transfer.openExternal(url);
    return;
  }

  if (chips?.invoke) {
    await chips.invoke("transfer.openExternal", { url });
    return;
  }

  if (chips?.platform?.openExternal) {
    await chips.platform.openExternal(url);
  }
}

export const VIEW_STYLE_TEXT = `
.chips-hyperlink-card {
  width: 100%;
  color: var(--chips-sys-color-on-surface, #111827);
  font: 14px/1.5 var(--chips-font-family-sans, "SF Pro Text", "PingFang SC", sans-serif);
}

.chips-hyperlink-card,
.chips-hyperlink-card * {
  box-sizing: border-box;
}

.chips-hyperlink-card__button {
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--chips-sys-color-outline, rgba(15, 23, 42, 0.28));
  border-radius: 8px;
  background: transparent;
  color: var(--chips-sys-color-on-surface, #111827);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-align: left;
  text-decoration: none;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.chips-hyperlink-card__button:hover,
.chips-hyperlink-card__button:focus-visible {
  border-color: var(--chips-sys-color-on-surface-variant, rgba(15, 23, 42, 0.56));
  background: var(--chips-sys-color-surface-container-low, rgba(15, 23, 42, 0.04));
  color: var(--chips-sys-color-on-surface, #111827);
  outline: none;
}

.chips-hyperlink-card__button:focus-visible {
  box-shadow: 0 0 0 3px var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.12));
}

.chips-hyperlink-card__button--disabled {
  cursor: default;
  color: var(--chips-sys-color-on-surface-variant, #667085);
  border-style: dashed;
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
  openResource?: (input: BasecardOpenResourceInput) => void;
}

export function BasecardView({ config, openResource }: BasecardViewProps) {
  const t = createTranslator(config.locale);
  const anchorText = config.anchor_text || t("hyperlink.view.emptyAnchorText");
  const isValidUrl = validateHyperlinkUrl(config.url);

  return (
    <div className="chips-hyperlink-card" data-card-type={config.card_type}>
      {isValidUrl ? (
        <button
          type="button"
          className="chips-hyperlink-card__button"
          onClick={() => {
            void openHyperlinkInSystemBrowser(config.url, {
              openResource,
              title: anchorText,
            });
          }}
        >
          {anchorText}
        </button>
      ) : (
        <span
          className="chips-hyperlink-card__button chips-hyperlink-card__button--disabled"
          aria-disabled="true"
        >
          {anchorText}
        </span>
      )}
    </div>
  );
}
