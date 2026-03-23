import React from "react";
import type { GovernedPluginType } from "../../shared/runtime/settings-runtime-service";
import { ChipsButton, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { DropZone } from "../../shared/ui/DropZone";
import { GovernanceList, GovernanceListCell, GovernanceListRow } from "../../shared/ui/GovernanceList";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { RecordDetailDialog } from "../../shared/ui/RecordDetailDialog";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { useManagedPluginGovernance } from "./useManagedPluginGovernance";

interface ManagedPluginPageProps {
  type: GovernedPluginType;
  translationBaseKey: "settingsPanel.cardPlugins" | "settingsPanel.layoutPlugins" | "settingsPanel.modulePlugins";
}

export function ManagedPluginPage({ type, translationBaseKey }: ManagedPluginPageProps): React.ReactElement {
  const { t } = useI18n();
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
  } = useManagedPluginGovernance(type, {
    listErrorKey: `settingsPanel.errors.${type}PluginList`,
    installErrorKey: `settingsPanel.errors.${type}PluginInstall`,
    toggleErrorKey: `settingsPanel.errors.${type}PluginToggle`,
    uninstallErrorKey: `settingsPanel.errors.${type}PluginUninstall`,
    pickerTitleKey: `${translationBaseKey}.dialogs.filePickerTitle`,
    pickerFilterKey: `${translationBaseKey}.dialogs.filePickerFilter`,
    installTitleKey: `${translationBaseKey}.feedback.installTitle`,
    installSuccessKey: `${translationBaseKey}.feedback.installSuccess`,
    enableTitleKey: `${translationBaseKey}.feedback.enableTitle`,
    enableSuccessKey: `${translationBaseKey}.feedback.enableSuccess`,
    disableTitleKey: `${translationBaseKey}.feedback.disableTitle`,
    disableSuccessKey: `${translationBaseKey}.feedback.disableSuccess`,
    uninstallTitleKey: `${translationBaseKey}.feedback.uninstallTitle`,
    uninstallSuccessKey: `${translationBaseKey}.feedback.uninstallSuccess`,
    confirmTitleKey: `${translationBaseKey}.dialogs.uninstallTitle`,
    confirmMessageKey: `${translationBaseKey}.dialogs.uninstallMessage`,
    confirmDetailKey: `${translationBaseKey}.dialogs.uninstallDetail`,
  });

  return (
    <PageFrame
      title={t(`${translationBaseKey}.title`)}
      actions={<ChipsButton onPress={installWithFilePicker}>{t(`${translationBaseKey}.actions.install`)}</ChipsButton>}
    >
      <NotificationStack
        ariaLabel={t("settingsPanel.feedback.ariaLabel")}
        items={feedback}
        onDismiss={(item) => dismissFeedback(item.id)}
      />
      <div onDragEnter={() => setDropActive(true)} onDragLeave={() => setDropActive(false)}>
        <DropZone
          title={t(`${translationBaseKey}.dropzone.title`)}
          description={t(`${translationBaseKey}.dropzone.description`)}
          active={dropActive}
          onDropFiles={installFromDroppedFiles}
        />
      </div>
      <SectionStateBoundary
        loading={loading}
        error={error}
        loadingLabel={t(`${translationBaseKey}.loading`)}
        onRetry={() => {
          void refresh();
        }}
      >
        {plugins.length === 0 ? (
          <ChipsEmptyState
            ariaLabel={t(`${translationBaseKey}.empty.ariaLabel`)}
            title={t(`${translationBaseKey}.empty.title`)}
            description={t(`${translationBaseKey}.empty.description`)}
            actionLabel={t(`${translationBaseKey}.actions.install`)}
            onAction={installWithFilePicker}
          />
        ) : (
          <GovernanceList
            ariaLabel={t(`${translationBaseKey}.listAriaLabel`)}
            columns={[
              { id: "plugin", label: t(`${translationBaseKey}.columns.plugin`), width: "minmax(0, 2.6fr)" },
              { id: "status", label: t(`${translationBaseKey}.columns.status`), width: "minmax(0, 1.1fr)" },
              { id: "meta", label: t(`${translationBaseKey}.columns.meta`), width: "minmax(0, 1.8fr)" },
              { id: "actions", label: t(`${translationBaseKey}.columns.actions`), width: "auto", align: "end" },
            ]}
          >
            {plugins.map((plugin) => {
              const busy = activeActionId === plugin.pluginId;
              const capabilityLabel = plugin.capabilities.length > 0
                ? plugin.capabilities.join(", ")
                : t("settingsPanel.common.notAvailable");
              const pluginTypeLabel = plugin.type === "card"
                ? plugin.cardTypes.join(", ")
                : plugin.type === "layout"
                  ? plugin.layoutType ?? t("settingsPanel.common.notAvailable")
                  : capabilityLabel;

              return (
                <GovernanceListRow key={plugin.pluginId}>
                  <GovernanceListCell label={t(`${translationBaseKey}.columns.plugin`)}>
                    <div className="governance-item">
                      <div className="governance-item__title">{plugin.displayName ?? plugin.name}</div>
                      <div className="governance-item__summary">{plugin.description ?? plugin.pluginId}</div>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t(`${translationBaseKey}.columns.status`)}>
                    <div className="governance-status">
                      {plugin.enabled ? (
                        <StatusBadge tone="positive" label={t(`${translationBaseKey}.badges.enabled`)} />
                      ) : (
                        <StatusBadge tone="neutral" label={t(`${translationBaseKey}.badges.disabled`)} />
                      )}
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t(`${translationBaseKey}.columns.meta`)}>
                    <div className="governance-meta">
                      <span>{t(`${translationBaseKey}.fields.version`)}: {plugin.version}</span>
                      <span>{t(`${translationBaseKey}.fields.identity`)}: {pluginTypeLabel}</span>
                    </div>
                  </GovernanceListCell>
                  <GovernanceListCell label={t(`${translationBaseKey}.columns.actions`)} align="end">
                    <div className="action-row action-row--tight">
                      <RecordDetailDialog
                        triggerLabel={t("settingsPanel.common.details")}
                        title={t(`${translationBaseKey}.dialogs.detailTitle`, { name: plugin.name })}
                        description={t(`${translationBaseKey}.dialogs.detailDescription`)}
                        fields={[
                          { label: t(`${translationBaseKey}.fields.pluginId`), value: plugin.pluginId },
                          { label: t(`${translationBaseKey}.fields.version`), value: plugin.version },
                          { label: t(`${translationBaseKey}.fields.identity`), value: pluginTypeLabel },
                          { label: t(`${translationBaseKey}.fields.capabilities`), value: capabilityLabel },
                          { label: t(`${translationBaseKey}.fields.installPath`), value: plugin.installPath },
                        ]}
                      />
                      <ChipsButton disabled={busy} onPress={() => void togglePluginEnabled(plugin)}>
                        {plugin.enabled
                          ? t(`${translationBaseKey}.actions.disable`)
                          : t(`${translationBaseKey}.actions.enable`)}
                      </ChipsButton>
                      <ChipsButton disabled={busy} onPress={() => void uninstallPlugin(plugin)}>
                        {t(`${translationBaseKey}.actions.uninstall`)}
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
