import React from "react";
import { ChipsCardShell, ChipsText } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { PageFrame } from "../../shared/ui/PageFrame";
import { CardDescription, CardGrid, CardGridItem, PageStack, SummaryPanel } from "../../shared/ui/PageLayout";
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
    <PageFrame title={t("settingsPanel.previewQuality.title")}>
      <PageStack>
        <SummaryPanel
          ariaLabel={t("settingsPanel.previewQuality.summary.ariaLabel")}
          main={
            <>
              <StatusBadge tone="attention" label={t("settingsPanel.previewQuality.summary.badge")} />
              <ChipsText as="strong" text={t("settingsPanel.previewQuality.summary.title")} emphasis="strong" />
              <ChipsText as="p" text={t("settingsPanel.previewQuality.summary.description")} tone="muted" />
            </>
          }
          meta={
            <>
              <ChipsText as="span" text={t("settingsPanel.previewQuality.summary.runtimeBoundary")} tone="muted" />
              <ChipsText as="span" text={t("settingsPanel.previewQuality.summary.reportBoundary")} tone="muted" />
            </>
          }
        />

        <CardGrid>
          {PREVIEW_QUALITY_ENTRIES.map((entry) => (
            <CardGridItem key={entry.id}>
              <ChipsCardShell
                title={t(entry.titleKey)}
                toolbar={<StatusBadge tone={kindTone(entry.kind)} label={t(kindLabelKey(entry.kind))} />}
                footer={<span className="preview-quality-card__target">{t(entry.targetKey)}</span>}
              >
                <CardDescription>{t(entry.descriptionKey)}</CardDescription>
                <div className="command-snippet" aria-label={t("settingsPanel.previewQuality.command.ariaLabel")}>
                  <code>{entry.command}</code>
                </div>
                <ChipsText as="p" text={t(entry.boundaryKey)} tone="muted" />
              </ChipsCardShell>
            </CardGridItem>
          ))}
        </CardGrid>
      </PageStack>
    </PageFrame>
  );
}
