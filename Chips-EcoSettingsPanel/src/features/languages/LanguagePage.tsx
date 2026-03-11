import React from "react";
import { ChipsButton, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { GovernanceList, GovernanceListCell, GovernanceListRow } from "../../shared/ui/GovernanceList";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { RecordDetailDialog } from "../../shared/ui/RecordDetailDialog";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useLanguageGovernance } from "./useLanguageGovernance";

export function LanguagePage(): React.ReactElement {
  const { t } = useI18n();
  const { languages, loading, error, activeLocale, switchLocale, refresh, feedback, dismissFeedback } = useLanguageGovernance();

  return (
    <PageFrame title={t("settingsPanel.languages.title")}>
      <NotificationStack
        ariaLabel={t("settingsPanel.feedback.ariaLabel")}
        items={feedback}
        onDismiss={(item) => dismissFeedback(item.id)}
      />
      <SectionStateBoundary
        loading={loading}
        error={error}
        loadingLabel={t("settingsPanel.languages.loading")}
        onRetry={() => {
          void refresh();
        }}
      >
        {languages.length === 0 ? (
          <ChipsEmptyState
            ariaLabel={t("settingsPanel.languages.empty.ariaLabel")}
            title={t("settingsPanel.languages.empty.title")}
            description={t("settingsPanel.languages.empty.description")}
          />
        ) : (
          <GovernanceList
            ariaLabel={t("settingsPanel.languages.listAriaLabel")}
            columns={[
              { id: "language", label: t("settingsPanel.languages.columns.language"), width: "minmax(0, 2.4fr)" },
              { id: "status", label: t("settingsPanel.languages.columns.status"), width: "minmax(0, 1fr)" },
              { id: "meta", label: t("settingsPanel.languages.columns.meta"), width: "minmax(0, 1.4fr)" },
              { id: "actions", label: t("settingsPanel.languages.columns.actions"), width: "auto", align: "end" },
            ]}
          >
            {languages.map((language) => {
              const busy = activeLocale === language.locale;

              return (
                <GovernanceListRow key={language.locale}>
                  <GovernanceListCell label={t("settingsPanel.languages.columns.language")}>
                    <div className="governance-item">
                      <div className="governance-item__title">{language.displayName}</div>
                      <div className="governance-item__summary">{language.nativeName}</div>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.languages.columns.status")}>
                    <div className="governance-status">
                      {language.current ? (
                        <StatusBadge tone="positive" label={t("settingsPanel.languages.badges.current")} />
                      ) : (
                        <StatusBadge tone="neutral" label={t("settingsPanel.languages.badges.available")} />
                      )}
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.languages.columns.meta")}>
                    <div className="governance-meta">
                      <span>{t("settingsPanel.languages.fields.locale")}: {language.locale}</span>
                      <span>{t("settingsPanel.languages.fields.nativeName")}: {language.nativeName}</span>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.languages.columns.actions")} align="end">
                    <div className="action-row action-row--tight">
                      <RecordDetailDialog
                        triggerLabel={t("settingsPanel.common.details")}
                        title={t("settingsPanel.languages.dialogs.detailTitle", { name: language.displayName })}
                        description={t("settingsPanel.languages.dialogs.detailDescription")}
                        fields={[
                          { label: t("settingsPanel.languages.fields.locale"), value: language.locale },
                          { label: t("settingsPanel.languages.fields.nativeName"), value: language.nativeName },
                          { label: t("settingsPanel.languages.columns.status"), value: language.current ? t("settingsPanel.languages.badges.current") : t("settingsPanel.languages.badges.available") },
                        ]}
                      />
                      <ChipsButton disabled={busy || language.current} onPress={() => void switchLocale(language.locale)}>
                        {t("settingsPanel.languages.actions.apply")}
                      </ChipsButton>
                    </div>
                  </GovernanceListCell>
                </GovernanceListRow>
              );
            })}
          </GovernanceList>
        )}
      </SectionStateBoundary>
    </PageFrame>
  );
}
