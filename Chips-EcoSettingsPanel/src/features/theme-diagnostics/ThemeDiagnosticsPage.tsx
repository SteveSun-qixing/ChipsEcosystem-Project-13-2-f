import React from "react";
import { ChipsBox, ChipsButton, ChipsCardShell, ChipsEmptyState } from "@chips/component-library";
import type { ThemeDiagnosticStatus } from "chips-sdk";
import { useI18n } from "../../app/providers/I18nProvider";
import { GovernanceList, GovernanceListCell, GovernanceListRow } from "../../shared/ui/GovernanceList";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useThemeDiagnostics } from "./useThemeDiagnostics";
import type { ThemeDiagnosticRowViewModel, ThemeDiagnosticsViewModel } from "./view-model";

function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

function statusTone(status: ThemeDiagnosticStatus): "neutral" | "positive" | "attention" | "danger" {
  if (status === "complete") {
    return "positive";
  }
  if (status === "warning") {
    return "attention";
  }
  return "danger";
}

function diagnosticTone(diagnostic: ThemeDiagnosticRowViewModel): "neutral" | "positive" | "attention" | "danger" {
  if (diagnostic.blocking || diagnostic.severity === "error") {
    return "danger";
  }
  if (diagnostic.severity === "warning") {
    return "attention";
  }
  return "neutral";
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }): React.ReactElement {
  return (
    <article className="metric-card">
      <div className="metric-card__label">{label}</div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__detail">{detail}</div>
    </article>
  );
}

function ThemeChain({ diagnostics }: { diagnostics: ThemeDiagnosticsViewModel }): React.ReactElement {
  const { t } = useI18n();
  return (
    <ChipsCardShell title={t("settingsPanel.themeDiagnostics.chain.title")}>
      <div className="chain-list">
        {diagnostics.chain.map((entry) => (
          <div key={`${entry.order}:${entry.id}`} className="chain-list__item">
            <span className="chain-list__order">{entry.order + 1}</span>
            <span className="chain-list__body">
              <strong>{entry.displayName}</strong>
              <span>{entry.id}</span>
            </span>
            <span className="chain-list__version">{entry.version}</span>
          </div>
        ))}
      </div>
    </ChipsCardShell>
  );
}

function DiagnosticList({ diagnostics }: { diagnostics: ThemeDiagnosticRowViewModel[] }): React.ReactElement {
  const { t } = useI18n();
  const visibleDiagnostics = diagnostics.slice(0, 8);

  if (visibleDiagnostics.length === 0) {
    return (
      <ChipsEmptyState
        ariaLabel={t("settingsPanel.themeDiagnostics.diagnostics.empty.ariaLabel")}
        title={t("settingsPanel.themeDiagnostics.diagnostics.empty.title")}
        description={t("settingsPanel.themeDiagnostics.diagnostics.empty.description")}
      />
    );
  }

  return (
    <div className="diagnostic-list" aria-label={t("settingsPanel.themeDiagnostics.diagnostics.ariaLabel")}>
      {visibleDiagnostics.map((diagnostic) => (
        <article key={diagnostic.id} className="diagnostic-list__item">
          <div className="diagnostic-list__header">
            <StatusBadge tone={diagnosticTone(diagnostic)} label={diagnostic.code} />
            <span className="diagnostic-list__severity">{diagnostic.severity}</span>
          </div>
          <ChipsBox
            as="dl"
            className="settings-detail-field-list"
          >
            <div className="settings-detail-field-list__item">
              <dt>{t("settingsPanel.themeDiagnostics.diagnostics.fields.messageKey")}</dt>
              <dd>{diagnostic.messageKey}</dd>
            </div>
            <div className="settings-detail-field-list__item">
              <dt>{t("settingsPanel.themeDiagnostics.diagnostics.fields.target")}</dt>
              <dd>{diagnostic.component ?? diagnostic.tokenKey ?? diagnostic.themeId ?? t("settingsPanel.common.notAvailable")}</dd>
            </div>
            <div className="settings-detail-field-list__item">
              <dt>{t("settingsPanel.themeDiagnostics.diagnostics.fields.suggestion")}</dt>
              <dd>{diagnostic.suggestionKey ?? t("settingsPanel.common.notAvailable")}</dd>
            </div>
          </ChipsBox>
        </article>
      ))}
    </div>
  );
}

function ThemeDiagnosticsContent({ diagnostics }: { diagnostics: ThemeDiagnosticsViewModel }): React.ReactElement {
  const { t } = useI18n();

  return (
    <div className="diagnostics-page">
      <section className="diagnostics-hero" aria-label={t("settingsPanel.themeDiagnostics.summary.ariaLabel")}>
        <div className="diagnostics-hero__main">
          <StatusBadge
            tone={statusTone(diagnostics.summary.status)}
            label={t(`settingsPanel.themeDiagnostics.status.${diagnostics.summary.status}`)}
          />
          <h2>{diagnostics.themeId}</h2>
          <p>{t("settingsPanel.themeDiagnostics.summary.source", diagnostics.sources)}</p>
        </div>
        <div className="diagnostics-hero__meta">
          <span>{t("settingsPanel.themeDiagnostics.fields.themeVersion")}: {diagnostics.themeVersion}</span>
          <span>{t("settingsPanel.themeDiagnostics.fields.contractVersion")}: {diagnostics.contractVersion}</span>
          <span>{t("settingsPanel.themeDiagnostics.fields.schemaVersion")}: {diagnostics.schemaVersion}</span>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard
          label={t("settingsPanel.themeDiagnostics.metrics.requiredCoverage")}
          value={formatPercent(diagnostics.summary.requiredCoverage)}
          detail={t("settingsPanel.themeDiagnostics.metrics.requiredDetail", {
            missing: diagnostics.summary.missingRequiredTokenCount,
            total: diagnostics.summary.requiredTokenCount,
          })}
        />
        <MetricCard
          label={t("settingsPanel.themeDiagnostics.metrics.optionalCoverage")}
          value={formatPercent(diagnostics.summary.optionalCoverage)}
          detail={t("settingsPanel.themeDiagnostics.metrics.optionalDetail", {
            missing: diagnostics.summary.missingOptionalTokenCount,
            total: diagnostics.summary.optionalTokenCount,
          })}
        />
        <MetricCard
          label={t("settingsPanel.themeDiagnostics.metrics.components")}
          value={`${diagnostics.summary.coveredComponentCount}/${diagnostics.summary.componentCount}`}
          detail={t("settingsPanel.themeDiagnostics.metrics.componentsDetail")}
        />
        <MetricCard
          label={t("settingsPanel.themeDiagnostics.metrics.diagnostics")}
          value={diagnostics.summary.totalDiagnostics}
          detail={t("settingsPanel.themeDiagnostics.metrics.diagnosticsDetail", {
            blocking: diagnostics.summary.blockingDiagnostics,
          })}
        />
      </div>

      <ThemeChain diagnostics={diagnostics} />

      <GovernanceList
        ariaLabel={t("settingsPanel.themeDiagnostics.components.ariaLabel")}
        columns={[
          { id: "component", label: t("settingsPanel.themeDiagnostics.components.columns.component"), width: "minmax(0, 2fr)" },
          { id: "coverage", label: t("settingsPanel.themeDiagnostics.components.columns.coverage"), width: "minmax(0, 1.2fr)" },
          { id: "tokens", label: t("settingsPanel.themeDiagnostics.components.columns.tokens"), width: "minmax(0, 1.4fr)" },
          { id: "status", label: t("settingsPanel.themeDiagnostics.components.columns.status"), width: "auto", align: "end" },
        ]}
      >
        {diagnostics.components.slice(0, 12).map((component) => (
          <GovernanceListRow key={component.id}>
            <GovernanceListCell label={t("settingsPanel.themeDiagnostics.components.columns.component")}>
              <div className="governance-item">
                <div className="governance-item__title">{component.component}</div>
                <div className="governance-item__summary">
                  {t("settingsPanel.themeDiagnostics.components.scope", { scope: component.scope })}
                </div>
              </div>
            </GovernanceListCell>
            <GovernanceListCell label={t("settingsPanel.themeDiagnostics.components.columns.coverage")}>
              <span>{formatPercent(component.requiredCoverage)}</span>
            </GovernanceListCell>
            <GovernanceListCell label={t("settingsPanel.themeDiagnostics.components.columns.tokens")}>
              <div className="governance-meta">
                <span>{t("settingsPanel.themeDiagnostics.components.requiredTokens", {
                  missing: component.missingRequiredTokenCount,
                  total: component.requiredTokenCount,
                })}</span>
                <span>{t("settingsPanel.themeDiagnostics.components.partsStates", {
                  parts: component.partsCount,
                  states: component.statesCount,
                })}</span>
              </div>
            </GovernanceListCell>
            <GovernanceListCell label={t("settingsPanel.themeDiagnostics.components.columns.status")} align="end">
              <StatusBadge
                tone={statusTone(component.status)}
                label={t(`settingsPanel.themeDiagnostics.status.${component.status}`)}
              />
            </GovernanceListCell>
          </GovernanceListRow>
        ))}
      </GovernanceList>

      <ChipsCardShell title={t("settingsPanel.themeDiagnostics.diagnostics.title")}>
        <DiagnosticList diagnostics={diagnostics.diagnostics} />
      </ChipsCardShell>
    </div>
  );
}

export function ThemeDiagnosticsPage(): React.ReactElement {
  const { t } = useI18n();
  const { diagnostics, loading, error, refresh } = useThemeDiagnostics();

  return (
    <PageFrame
      title={t("settingsPanel.themeDiagnostics.title")}
      subtitle={t("settingsPanel.themeDiagnostics.subtitle")}
      actions={<ChipsButton onPress={() => void refresh()}>{t("settingsPanel.themeDiagnostics.actions.refresh")}</ChipsButton>}
    >
      <SectionStateBoundary
        loading={loading}
        error={error}
        loadingLabel={t("settingsPanel.themeDiagnostics.loading")}
        onRetry={() => {
          void refresh();
        }}
      >
        {diagnostics ? (
          <ThemeDiagnosticsContent diagnostics={diagnostics} />
        ) : (
          <ChipsEmptyState
            ariaLabel={t("settingsPanel.themeDiagnostics.empty.ariaLabel")}
            title={t("settingsPanel.themeDiagnostics.empty.title")}
            description={t("settingsPanel.themeDiagnostics.empty.description")}
          />
        )}
      </SectionStateBoundary>
    </PageFrame>
  );
}
