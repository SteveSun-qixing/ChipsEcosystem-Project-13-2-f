import React from "react";
import type { GovernedPluginType, PluginGovernanceRecord } from "../../shared/runtime/settings-runtime-service";
import { ChipsButton, ChipsEmptyState } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";
import { useWindowFileDrop } from "../../shared/hooks/useWindowFileDrop";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { SettingsDetailPage } from "../../shared/ui/SettingsDetailPage";
import { SettingsRecordItem, SettingsRecordList } from "../../shared/ui/SettingsRecordList";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { WindowDropOverlay } from "../../shared/ui/WindowDropOverlay";
import { useManagedPluginGovernance } from "./useManagedPluginGovernance";

interface ManagedPluginPageProps {
  type: GovernedPluginType;
  translationBaseKey: "settingsPanel.cardPlugins" | "settingsPanel.layoutPlugins" | "settingsPanel.modulePlugins";
}

function ManagedPluginStatus({
  plugin,
  translationBaseKey,
}: {
  plugin: PluginGovernanceRecord;
  translationBaseKey: ManagedPluginPageProps["translationBaseKey"];
}): React.ReactElement {
  const { t } = useI18n();
  return plugin.enabled ? (
    <StatusBadge tone="positive" label={t(`${translationBaseKey}.badges.enabled`)} />
  ) : (
    <StatusBadge tone="neutral" label={t(`${translationBaseKey}.badges.disabled`)} />
  );
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
  const [selectedPluginId, setSelectedPluginId] = React.useState<string | null>(null);
  const selectedPlugin = plugins.find((plugin) => plugin.pluginId === selectedPluginId) ?? null;
  const dropActive = useWindowFileDrop({ onDropFiles: installFromDroppedFiles });

  React.useEffect(() => {
    if (selectedPluginId && !selectedPlugin) {
      setSelectedPluginId(null);
    }
  }, [selectedPlugin, selectedPluginId]);

  const resolvePluginTypeLabel = React.useCallback((plugin: PluginGovernanceRecord) => {
    const capabilityLabel = plugin.capabilities.length > 0
      ? plugin.capabilities.join(", ")
      : t("settingsPanel.common.notAvailable");

    if (plugin.type === "card") {
      return plugin.cardTypes.length > 0
        ? plugin.cardTypes.join(", ")
        : t("settingsPanel.common.notAvailable");
    }

    if (plugin.type === "layout") {
      return plugin.layoutType ?? t("settingsPanel.common.notAvailable");
    }

    return capabilityLabel;
  }, [t]);

  if (selectedPlugin) {
    const busy = activeActionId === selectedPlugin.pluginId;
    const capabilityLabel = selectedPlugin.capabilities.length > 0
      ? selectedPlugin.capabilities.join(", ")
      : t("settingsPanel.common.notAvailable");
    const pluginTypeLabel = resolvePluginTypeLabel(selectedPlugin);

    return (
      <>
        <NotificationStack
          ariaLabel={t("settingsPanel.feedback.ariaLabel")}
          items={feedback}
          onDismiss={(item) => dismissFeedback(item.id)}
        />
        <WindowDropOverlay
          active={dropActive}
          title={t(`${translationBaseKey}.dropzone.title`)}
          description={t(`${translationBaseKey}.dropzone.description`)}
        />
        <SettingsDetailPage
          title={t(`${translationBaseKey}.detail.title`, { name: selectedPlugin.displayName ?? selectedPlugin.name })}
          description={selectedPlugin.description ?? t(`${translationBaseKey}.detail.description`)}
          backLabel={t("settingsPanel.common.back")}
          onBack={() => setSelectedPluginId(null)}
          status={
            <div className="governance-status">
              <ManagedPluginStatus plugin={selectedPlugin} translationBaseKey={translationBaseKey} />
            </div>
          }
          primaryActions={
            <div className="action-row">
              <ChipsButton disabled={busy} onPress={() => void togglePluginEnabled(selectedPlugin)}>
                {selectedPlugin.enabled
                  ? t(`${translationBaseKey}.actions.disable`)
                  : t(`${translationBaseKey}.actions.enable`)}
              </ChipsButton>
            </div>
          }
          secondaryActions={
            <div className="action-row">
              <ChipsButton disabled={busy} onPress={() => void uninstallPlugin(selectedPlugin)}>
                {t(`${translationBaseKey}.actions.uninstall`)}
              </ChipsButton>
            </div>
          }
          fieldGroups={[
            {
              title: t(`${translationBaseKey}.detail.groups.identity`),
              description: t(`${translationBaseKey}.detail.groups.identityDescription`),
              fields: [
                { label: t(`${translationBaseKey}.fields.pluginId`), value: selectedPlugin.pluginId },
                { label: t(`${translationBaseKey}.fields.version`), value: selectedPlugin.version },
                { label: t(`${translationBaseKey}.fields.identity`), value: pluginTypeLabel },
              ],
            },
            {
              title: t(`${translationBaseKey}.detail.groups.capabilities`),
              description: t(`${translationBaseKey}.detail.groups.capabilitiesDescription`),
              fields: [
                { label: t(`${translationBaseKey}.fields.capabilities`), value: capabilityLabel },
              ],
            },
            {
              title: t(`${translationBaseKey}.detail.groups.installation`),
              description: t(`${translationBaseKey}.detail.groups.installationDescription`),
              fields: [
                { label: t(`${translationBaseKey}.fields.installPath`), value: selectedPlugin.installPath },
              ],
            },
          ]}
        />
      </>
    );
  }

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
      <WindowDropOverlay
        active={dropActive}
        title={t(`${translationBaseKey}.dropzone.title`)}
        description={t(`${translationBaseKey}.dropzone.description`)}
      />
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
          <SettingsRecordList
            ariaLabel={t(`${translationBaseKey}.listAriaLabel`)}
          >
            {plugins.map((plugin) => {
              const busy = activeActionId === plugin.pluginId;
              const pluginTypeLabel = resolvePluginTypeLabel(plugin);

              return (
                <SettingsRecordItem
                  key={plugin.pluginId}
                  id={plugin.pluginId}
                  title={plugin.displayName ?? plugin.name}
                  summary={plugin.description ?? plugin.pluginId}
                  status={<ManagedPluginStatus plugin={plugin} translationBaseKey={translationBaseKey} />}
                  meta={
                    <>
                      <span>{t(`${translationBaseKey}.fields.version`)}: {plugin.version}</span>
                      <span>{t(`${translationBaseKey}.fields.identity`)}: {pluginTypeLabel}</span>
                    </>
                  }
                  actions={
                    <>
                      <ChipsButton disabled={busy} onPress={() => void togglePluginEnabled(plugin)}>
                        {plugin.enabled
                          ? t(`${translationBaseKey}.actions.disable`)
                          : t(`${translationBaseKey}.actions.enable`)}
                      </ChipsButton>
                    </>
                  }
                  detailLabel={t("settingsPanel.common.details")}
                  onOpenDetail={() => setSelectedPluginId(plugin.pluginId)}
                />
              );
            })}
          </SettingsRecordList>
        )}
      </SectionStateBoundary>
    </PageFrame>
  );
}
