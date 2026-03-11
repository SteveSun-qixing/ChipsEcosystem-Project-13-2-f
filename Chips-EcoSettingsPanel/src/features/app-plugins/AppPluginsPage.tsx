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
import { useAppPluginGovernance } from "./useAppPluginGovernance";

function formatInstalledAt(locale: string, installedAt: number): string {
  if (!Number.isFinite(installedAt) || installedAt <= 0) {
    return String(installedAt);
  }

  if (installedAt < 100000000000) {
    return String(installedAt);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(installedAt));
}

export function AppPluginsPage(): React.ReactElement {
  const { locale, t } = useI18n();
  const {
    plugins,
    loading,
    error,
    activeActionId,
    installWithFilePicker,
    installFromDroppedFiles,
    togglePluginEnabled,
    uninstallPlugin,
    refresh,
    feedback,
    dismissFeedback,
    dropActive,
    setDropActive,
  } = useAppPluginGovernance();

  return (
    <PageFrame
      title={t("settingsPanel.appPlugins.title")}
      actions={<ChipsButton onPress={installWithFilePicker}>{t("settingsPanel.appPlugins.actions.install")}</ChipsButton>}
    >
      <NotificationStack
        ariaLabel={t("settingsPanel.feedback.ariaLabel")}
        items={feedback}
        onDismiss={(item) => dismissFeedback(item.id)}
      />
      <div onDragEnter={() => setDropActive(true)} onDragLeave={() => setDropActive(false)}>
        <DropZone
          title={t("settingsPanel.appPlugins.dropzone.title")}
          description={t("settingsPanel.appPlugins.dropzone.description")}
          active={dropActive}
          onDropFiles={installFromDroppedFiles}
        />
      </div>
      <SectionStateBoundary
        loading={loading}
        error={error}
        loadingLabel={t("settingsPanel.appPlugins.loading")}
        onRetry={() => {
          void refresh();
        }}
      >
        {plugins.length === 0 ? (
          <ChipsEmptyState
            ariaLabel={t("settingsPanel.appPlugins.empty.ariaLabel")}
            title={t("settingsPanel.appPlugins.empty.title")}
            description={t("settingsPanel.appPlugins.empty.description")}
            actionLabel={t("settingsPanel.appPlugins.actions.install")}
            onAction={installWithFilePicker}
          />
        ) : (
          <GovernanceList
            ariaLabel={t("settingsPanel.appPlugins.listAriaLabel")}
            columns={[
              { id: "plugin", label: t("settingsPanel.appPlugins.columns.plugin"), width: "minmax(0, 2.6fr)" },
              { id: "status", label: t("settingsPanel.appPlugins.columns.status"), width: "minmax(0, 1.2fr)" },
              { id: "meta", label: t("settingsPanel.appPlugins.columns.meta"), width: "minmax(0, 1.8fr)" },
              { id: "actions", label: t("settingsPanel.appPlugins.columns.actions"), width: "auto", align: "end" },
            ]}
          >
            {plugins.map((plugin) => {
              const busy = activeActionId === plugin.pluginId;
              const installedAtLabel = formatInstalledAt(locale, plugin.installedAt);

              return (
                <GovernanceListRow key={plugin.pluginId}>
                  <GovernanceListCell label={t("settingsPanel.appPlugins.columns.plugin")}>
                    <div className="governance-item">
                      <div className="governance-item__title">{plugin.name}</div>
                      <div className="governance-item__summary">
                        {plugin.selfManaged
                          ? t("settingsPanel.appPlugins.selfManaged.description")
                          : plugin.description ?? plugin.pluginId}
                      </div>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.appPlugins.columns.status")}>
                    <div className="governance-status">
                      {plugin.enabled ? (
                        <StatusBadge tone="positive" label={t("settingsPanel.appPlugins.badges.enabled")} />
                      ) : (
                        <StatusBadge tone="neutral" label={t("settingsPanel.appPlugins.badges.disabled")} />
                      )}
                      {plugin.selfManaged ? (
                        <StatusBadge tone="attention" label={t("settingsPanel.appPlugins.badges.currentApp")} />
                      ) : null}
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.appPlugins.columns.meta")}>
                    <div className="governance-meta">
                      <span>{t("settingsPanel.appPlugins.fields.pluginId")}: {plugin.pluginId}</span>
                      <span>{t("settingsPanel.appPlugins.fields.version")}: {plugin.version}</span>
                      <span>{t("settingsPanel.appPlugins.fields.installedAt")}: {installedAtLabel}</span>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t("settingsPanel.appPlugins.columns.actions")} align="end">
                    <div className="action-row action-row--tight">
                      <RecordDetailDialog
                        triggerLabel={t("settingsPanel.common.details")}
                        title={t("settingsPanel.appPlugins.dialogs.detailTitle", { name: plugin.name })}
                        description={t("settingsPanel.appPlugins.dialogs.detailDescription")}
                        fields={[
                          { label: t("settingsPanel.appPlugins.fields.pluginId"), value: plugin.pluginId },
                          { label: t("settingsPanel.appPlugins.fields.version"), value: plugin.version },
                          {
                            label: t("settingsPanel.appPlugins.fields.capabilities"),
                            value: plugin.capabilities.length > 0
                              ? plugin.capabilities.join(", ")
                              : t("settingsPanel.common.notAvailable"),
                          },
                          { label: t("settingsPanel.appPlugins.fields.installPath"), value: plugin.installPath },
                          { label: t("settingsPanel.appPlugins.fields.installedAt"), value: installedAtLabel },
                        ]}
                      />
                      <ChipsButton disabled={busy || plugin.selfManaged} onPress={() => void togglePluginEnabled(plugin)}>
                        {plugin.enabled
                          ? t("settingsPanel.appPlugins.actions.disable")
                          : t("settingsPanel.appPlugins.actions.enable")}
                      </ChipsButton>
                      <ChipsButton disabled={busy || plugin.selfManaged} onPress={() => void uninstallPlugin(plugin)}>
                        {t("settingsPanel.appPlugins.actions.uninstall")}
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
