import React from "react";
import { ChipsCardShell } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { PageFrame } from "../../shared/ui/PageFrame";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { PREVIEW_QUALITY_ENTRIES, type PreviewQualityEntryKind } from "./view-model";

function kindLabelKey(kind: PreviewQualityEntryKind): string {
  return `settingsPanel.previewQuality.kind.${kind}`;
}

function kindTone(kind: PreviewQualityEntryKind): "neutral" | "positive" | "attention" | "danger" {
  if (kind === "preview") {
    return "positive";
  }
  if (kind === "contract") {
    return "attention";
  }
  return "neutral";
}

export function PreviewQualityPage(): React.ReactElement {
  const { t } = useI18n();

  return (
    <PageFrame title={t("settingsPanel.previewQuality.title")} subtitle={t("settingsPanel.previewQuality.subtitle")}>
      <div className="preview-quality-page">
        <section className="diagnostics-hero" aria-label={t("settingsPanel.previewQuality.summary.ariaLabel")}>
          <div className="diagnostics-hero__main">
            <StatusBadge tone="attention" label={t("settingsPanel.previewQuality.summary.badge")} />
            <h2>{t("settingsPanel.previewQuality.summary.title")}</h2>
            <p>{t("settingsPanel.previewQuality.summary.description")}</p>
          </div>
          <div className="diagnostics-hero__meta">
            <span>{t("settingsPanel.previewQuality.summary.runtimeBoundary")}</span>
            <span>{t("settingsPanel.previewQuality.summary.reportBoundary")}</span>
          </div>
        </section>

        <div className="preview-quality-grid">
          {PREVIEW_QUALITY_ENTRIES.map((entry) => (
            <article key={entry.id} className="preview-quality-card">
              <ChipsCardShell
                title={t(entry.titleKey)}
                toolbar={<StatusBadge tone={kindTone(entry.kind)} label={t(kindLabelKey(entry.kind))} />}
                footer={<span className="preview-quality-card__target">{t(entry.targetKey)}</span>}
              >
                <p className="card-description">{t(entry.descriptionKey)}</p>
                <div className="command-snippet" aria-label={t("settingsPanel.previewQuality.command.ariaLabel")}>
                  <code>{entry.command}</code>
                </div>
                <p className="preview-quality-card__boundary">{t(entry.boundaryKey)}</p>
              </ChipsCardShell>
            </article>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}
