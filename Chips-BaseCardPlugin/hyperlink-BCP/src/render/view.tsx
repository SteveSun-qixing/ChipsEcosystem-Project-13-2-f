import React from "react";
import { ChipsBadge, ChipsButton } from "@chips/component-library";
import type { BasecardOpenResourceInput } from "../index";
import type { BasecardConfig } from "../schema/card-config";
import { createTranslator } from "../shared/i18n";
import { analyzeHyperlinkUrl, type HyperlinkUrlAnalysis } from "../shared/utils";

export type OpenHyperlinkOptions = {
  openResource?: (input: BasecardOpenResourceInput) => void;
  title?: string;
  config: BasecardConfig;
  analysis: HyperlinkUrlAnalysis;
};

export function openHyperlinkResource(options: OpenHyperlinkOptions): void {
  if (!options.openResource || !options.analysis.openable) {
    return;
  }

  options.openResource({
    resourceId: options.analysis.normalizedUrl,
    mimeType: "text/html",
    title: options.title,
    fileName: options.analysis.hostname || undefined,
    payload: {
      kind: "chips.hyperlink-card",
      version: "1.0.0",
      cardType: "base.hyperlink",
      openMode: options.config.open_mode,
      displayDensity: options.config.display_density,
      sourceUrl: options.analysis.normalizedUrl,
      securityLevel: options.analysis.level,
      securityReason: options.analysis.reason,
    },
  });
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

.chips-hyperlink-card__surface {
  display: flex;
  align-items: center;
  gap: var(--chips-layout-gap-md, 12px);
  width: 100%;
  min-height: var(--chips-layout-density-comfortable, 44px);
  padding: 12px 16px;
  border: 1px solid var(--chips-sys-color-outline, rgba(15, 23, 42, 0.28));
  border-radius: 8px;
  background: transparent;
  color: var(--chips-sys-color-on-surface, #111827);
  font: inherit;
  line-height: 1.35;
  overflow-wrap: anywhere;
  text-align: left;
  text-decoration: none;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.chips-hyperlink-card[data-density="compact"] .chips-hyperlink-card__surface {
  min-height: var(--chips-layout-density-compact, 36px);
  padding-block: 8px;
}

.chips-hyperlink-card[data-density="spacious"] .chips-hyperlink-card__surface {
  min-height: var(--chips-layout-density-spacious, 56px);
  padding-block: 16px;
}

.chips-hyperlink-card__surface[data-openable="true"] {
  cursor: pointer;
}

.chips-hyperlink-card__surface[data-openable="false"] {
  cursor: default;
  border-style: dashed;
  color: var(--chips-sys-color-on-surface-variant, #667085);
}

.chips-hyperlink-card__surface[data-openable="true"]:hover,
.chips-hyperlink-card__surface[data-openable="true"]:focus-visible {
  border-color: var(--chips-sys-color-on-surface-variant, rgba(15, 23, 42, 0.56));
  background: var(--chips-sys-color-surface-container-low, rgba(15, 23, 42, 0.04));
  color: var(--chips-sys-color-on-surface, #111827);
  outline: none;
}

.chips-hyperlink-card__surface:focus-visible {
  box-shadow: 0 0 0 3px var(--chips-sys-color-outline-variant, rgba(15, 23, 42, 0.12));
}

.chips-hyperlink-card__icon-frame {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--chips-sys-color-surface-container-low, rgba(15, 23, 42, 0.04));
  color: var(--chips-sys-color-primary, #2563eb);
  overflow: hidden;
}

.chips-hyperlink-card__icon-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chips-hyperlink-card__icon-fallback {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}

.chips-hyperlink-card__content {
  display: grid;
  gap: 4px;
  min-width: 0;
  flex: 1 1 auto;
}

.chips-hyperlink-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.chips-hyperlink-card__title {
  min-width: 0;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.chips-hyperlink-card__description,
.chips-hyperlink-card__meta {
  margin: 0;
  color: var(--chips-sys-color-on-surface-variant, #667085);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.chips-hyperlink-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chips-hyperlink-card [data-scope="button"][data-part="root"] {
  all: unset;
  box-sizing: border-box;
  display: block;
  width: 100%;
}

.chips-hyperlink-card [data-scope="button"][data-part="label"] {
  display: block;
}

.chips-hyperlink-card [data-scope="badge"][data-part="root"] {
  border-radius: 999px;
  padding: 2px 8px;
  background: var(--chips-sys-color-surface-container, rgba(15, 23, 42, 0.06));
  color: var(--chips-sys-color-on-surface-variant, #667085);
  font-size: 11px;
  font-weight: 600;
}

.chips-hyperlink-card [data-scope="badge"][data-tone="success"] {
  background: var(--chips-sys-color-success-surface, rgba(12, 126, 67, 0.12));
  color: var(--chips-sys-color-success, #0c7e43);
}

.chips-hyperlink-card [data-scope="badge"][data-tone="warning"] {
  background: var(--chips-sys-color-warning-surface, rgba(181, 102, 0, 0.12));
  color: var(--chips-sys-color-warning, #b56600);
}

.chips-hyperlink-card [data-scope="badge"][data-tone="error"] {
  background: var(--chips-sys-color-error-surface, rgba(217, 45, 32, 0.12));
  color: var(--chips-sys-color-error, #d92d20);
}
`;

export interface BasecardViewProps {
  config: BasecardConfig;
  openResource?: (input: BasecardOpenResourceInput) => void;
}

function getSecurityLabelKey(analysis: HyperlinkUrlAnalysis, hasOpenResource: boolean): string {
  if (analysis.openable && !hasOpenResource) {
    return "hyperlink.security.hostUnavailable";
  }

  if (analysis.reason === "secure") {
    return "hyperlink.security.secure";
  }

  if (analysis.reason === "insecure-http") {
    return "hyperlink.security.insecureHttp";
  }

  if (analysis.reason === "empty") {
    return "hyperlink.security.empty";
  }

  if (analysis.reason === "credentials-blocked") {
    return "hyperlink.security.credentialsBlocked";
  }

  return "hyperlink.security.blocked";
}

function getSecurityBadgeTone(
  analysis: HyperlinkUrlAnalysis,
  hasOpenResource: boolean,
): "success" | "warning" | "error" {
  if (!analysis.openable || !hasOpenResource) {
    return "error";
  }

  return analysis.level === "warning" ? "warning" : "success";
}

function resolveAriaLabel(params: {
  title: string;
  urlText: string;
  securityText: string;
  openable: boolean;
  t: ReturnType<typeof createTranslator>;
}): string {
  const { title, urlText, securityText, openable, t } = params;
  return openable
    ? t("hyperlink.view.openAria", { title, url: urlText, security: securityText })
    : t("hyperlink.view.disabledAria", { title, url: urlText, security: securityText });
}

export function BasecardView({ config, openResource }: BasecardViewProps) {
  const t = createTranslator(config.locale);
  const anchorText = config.anchor_text || t("hyperlink.view.emptyAnchorText");
  const description = (config.description ?? "").trim();
  const analysis = analyzeHyperlinkUrl(config.url);
  const iconAnalysis = config.icon_url ? analyzeHyperlinkUrl(config.icon_url) : null;
  const canOpen = Boolean(openResource && analysis.openable);
  const securityText = t(getSecurityLabelKey(analysis, Boolean(openResource)));
  const displayUrl = analysis.normalizedUrl || analysis.input || t("hyperlink.view.emptyUrl");
  const hostname = analysis.hostname || displayUrl;
  const ariaLabel = resolveAriaLabel({
    title: anchorText,
    urlText: displayUrl,
    securityText,
    openable: canOpen,
    t,
  });

  const content = (
    <span
      className="chips-hyperlink-card__surface"
      data-openable={canOpen ? "true" : "false"}
    >
      <span className="chips-hyperlink-card__icon-frame" aria-hidden="true">
        {iconAnalysis?.openable ? (
          <img
            className="chips-hyperlink-card__icon-image"
            src={iconAnalysis.normalizedUrl}
            alt=""
            draggable={false}
          />
        ) : (
          <span className="chips-hyperlink-card__icon-fallback">↗</span>
        )}
      </span>
      <span className="chips-hyperlink-card__content">
        <span className="chips-hyperlink-card__title-row">
          <span className="chips-hyperlink-card__title">{anchorText}</span>
          {config.show_security_hint ? (
            <ChipsBadge tone={getSecurityBadgeTone(analysis, Boolean(openResource))}>
              {securityText}
            </ChipsBadge>
          ) : null}
        </span>
        {description ? (
          <span className="chips-hyperlink-card__description">{description}</span>
        ) : null}
        <span className="chips-hyperlink-card__meta">
          <span>{hostname}</span>
          <span aria-hidden="true">·</span>
          <span>{t(`hyperlink.openMode.${config.open_mode}`)}</span>
        </span>
      </span>
    </span>
  );

  return (
    <div
      className="chips-hyperlink-card"
      data-card-type={config.card_type}
      data-density={config.display_density}
    >
      {canOpen ? (
        <ChipsButton
          type="button"
          onPress={() => {
            openHyperlinkResource({
              openResource,
              title: anchorText,
              config,
              analysis,
            });
          }}
          aria-label={ariaLabel}
        >
          {content}
        </ChipsButton>
      ) : (
        <div
          role="group"
          aria-label={ariaLabel}
          aria-disabled="true"
        >
          {content}
        </div>
      )}
    </div>
  );
}
