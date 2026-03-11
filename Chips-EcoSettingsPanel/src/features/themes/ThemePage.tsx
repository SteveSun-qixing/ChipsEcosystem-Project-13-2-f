import React from "react";
import { ChipsButton, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { DropZone } from "../../shared/ui/DropZone";
import { GovernanceList, GovernanceListCell, GovernanceListRow } from "../../shared/ui/GovernanceList";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { RecordDetailDialog } from "../../shared/ui/RecordDetailDialog";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useThemeGovernance } from "./useThemeGovernance";

export function ThemePage(): React.ReactElement {
  const { t } = useI18n();
  const {
    themes,
    loading,
    error,
    activeActionId,
    installWithFilePicker,
    installFromDroppedFiles,
    applyTheme,
    uninstallTheme,
    refresh,
    feedback,
    dismissFeedback,
    dropActive,
    setDropActive,
  } = useThemeGovernance();

  return (
    <PageFrame
      title={t("settingsPanel.themes.title")}
      actions={<ChipsButton onPress={installWithFilePicker}>{t("settingsPanel.themes.actions.install")}</ChipsButton>}
    >
      <NotificationStack
        ariaLabel={t("settingsPanel.feedback.ariaLabel")}
        items={feedback}
        onDismiss={(item) => dismissFeedback(item.id)}
      />
      <div onDragEnter={() => setDropActive(true)} onDragLeave={() => setDropActive(false)}>
        <DropZone
          title={t("settingsPanel.themes.dropzone.title")}
          description={t("settingsPanel.themes.dropzone.description")}
          active={dropActive}
          onDropFiles={installFromDroppedFiles}
        />
      </div>
      <SectionStateBoundary
        loading={loading}
        error={error}
        loadingLabel={t("settingsPanel.themes.loading")}
        onRetry={() => {
          void refresh();
        }}
      >
        {themes.length === 0 ? (
          <ChipsEmptyState
            ariaLabel={t("settingsPanel.themes.empty.ariaLabel")}
            title={t("settingsPanel.themes.empty.title")}
            description={t("settingsPanel.themes.empty.description")}
            actionLabel={t("settingsPanel.themes.actions.install")}
            onAction={installWithFilePicker}
          />
        ) : (
          <GovernanceList
            ariaLabel={t("settingsPanel.themes.listAriaLabel")}
            columns={[
              { id: "theme", label: t("settingsPanel.themes.columns.theme"), width: "minmax(0, 2.6fr)" },
              { id: "status", label: t("settingsPanel.themes.columns.status"), width: "minmax(0, 1.2fr)" },
              { id: "meta", label: t("settingsPanel.themes.columns.meta"), width: "minmax(0, 1.8fr)" },
              { id: "actions", label: t("settingsPanel.themes.columns.actions"), width: "auto", align: "end" },
            ]}
          >
            {themes.map((theme) => {
              const busy = activeActionId === theme.pluginId;

              return (
                <GovernanceListRow key={theme.pluginId}>
                  <GovernanceListCell label={t("settingsPanel.themes.columns.theme")}>
                    <div className="governance-item">
                      <div className="governance-item__title">{theme.displayName}</div>
                      <div className="governance-item__summary">{theme.themeId}</div>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.themes.columns.status")}>
                    <div className="governance-status">
                      {theme.current ? (
                        <StatusBadge tone="positive" label={t("settingsPanel.themes.badges.current")} />
                      ) : null}
                      {theme.enabled && !theme.current ? (
                        <StatusBadge tone="attention" label={t("settingsPanel.themes.badges.enabled")} />
                      ) : null}
                      {theme.isDefault ? (
                        <StatusBadge tone="neutral" label={t("settingsPanel.themes.badges.default")} />
                      ) : null}
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.themes.columns.meta")}>
                    <div className="governance-meta">
                      <span>{t("settingsPanel.themes.fields.version")}: {theme.version}</span>
                      <span>
                        {t("settingsPanel.themes.fields.publisher")}: {theme.publisher ?? t("settingsPanel.common.notAvailable")}
                      </span>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.themes.columns.actions")} align="end">
                    <div className="action-row action-row--tight">
                      <RecordDetailDialog
                        triggerLabel={t("settingsPanel.common.details")}
                        title={t("settingsPanel.themes.dialogs.detailTitle", { name: theme.displayName })}
                        description={t("settingsPanel.themes.dialogs.detailDescription")}
                        fields={[
                          { label: t("settingsPanel.themes.fields.themeId"), value: theme.themeId },
                          { label: t("settingsPanel.themes.fields.version"), value: theme.version },
                          {
                            label: t("settingsPanel.themes.fields.publisher"),
                            value: theme.publisher ?? t("settingsPanel.common.notAvailable"),
                          },
                          { label: t("settingsPanel.themes.fields.installPath"), value: theme.installPath },
                        ]}
                      />
                      <ChipsButton disabled={busy || theme.current} onPress={() => void applyTheme(theme)}>
                        {t("settingsPanel.themes.actions.apply")}
                      </ChipsButton>
                      <ChipsButton disabled={busy} onPress={() => void uninstallTheme(theme)}>
                        {t("settingsPanel.themes.actions.uninstall")}
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
