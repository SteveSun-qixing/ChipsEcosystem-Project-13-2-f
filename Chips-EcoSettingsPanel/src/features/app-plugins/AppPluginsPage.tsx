import React from "react";
import { ChipsButton, ChipsEmptyState, ChipsIcon } from "@chips/component-library";
import type { IconDescriptor } from "chips-sdk";
import type { AppPluginGovernanceRecord } from "../../shared/runtime/settings-runtime-service";
import { useI18n } from "../../app/providers/I18nProvider";
import { useWindowFileDrop } from "../../shared/hooks/useWindowFileDrop";
import { NotificationStack } from "../../shared/ui/NotificationStack";
import { PageFrame } from "../../shared/ui/PageFrame";
import { SectionStateBoundary } from "../../shared/ui/SectionStateBoundary";
import { SettingsDetailPage } from "../../shared/ui/SettingsDetailPage";
import { SettingsRecordItem, SettingsRecordList } from "../../shared/ui/SettingsRecordList";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { WindowDropOverlay } from "../../shared/ui/WindowDropOverlay";
import { useAppPluginGovernance } from "./useAppPluginGovernance";

const APP_PLUGIN_FALLBACK_ICON: IconDescriptor = {
  name: "apps",
  decorative: true,
};

function toFileUrl(filePath?: string): string | null {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return null;
  }

  const normalized = filePath.replace(/\\/g, "/");
  if (/^file:\/\//i.test(normalized)) {
    return normalized;
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  return encodeURI(`file://${normalized.startsWith("/") ? normalized : `/${normalized}`}`);
}

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

function AppPluginIcon({ plugin }: { plugin: AppPluginGovernanceRecord }): React.ReactElement {
  const shortcutIconUrl = toFileUrl(plugin.shortcut.iconPath);

  return (
    <>
      {shortcutIconUrl ? (
        <img
          className="settings-record-main__icon-image"
          src={shortcutIconUrl}
          alt=""
        />
      ) : (
        <ChipsIcon descriptor={APP_PLUGIN_FALLBACK_ICON} />
      )}
    </>
  );
}

function AppPluginStatus({ plugin }: { plugin: AppPluginGovernanceRecord }): React.ReactElement {
  const { t } = useI18n();
  return (
    <>
      {plugin.enabled ? (
        <StatusBadge tone="positive" label={t("settingsPanel.appPlugins.badges.enabled")} />
      ) : (
        <StatusBadge tone="neutral" label={t("settingsPanel.appPlugins.badges.disabled")} />
      )}
      {plugin.selfManaged ? (
        <StatusBadge tone="attention" label={t("settingsPanel.appPlugins.badges.currentApp")} />
      ) : null}
    </>
  );
}

function AppShortcutStatus({ plugin }: { plugin: AppPluginGovernanceRecord }): React.ReactElement {
  const { t } = useI18n();
  const shortcut = plugin.shortcut;
  return (
    <>
      {shortcut.exists ? (
        <StatusBadge tone="positive" label={t("settingsPanel.appPlugins.badges.shortcutReady")} />
      ) : (
        <StatusBadge tone="neutral" label={t("settingsPanel.appPlugins.badges.shortcutMissing")} />
      )}
      <span>
        {shortcut.exists
          ? t(`settingsPanel.appPlugins.shortcut.location.${shortcut.location}`)
          : t("settingsPanel.appPlugins.shortcut.empty")}
      </span>
    </>
  );
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
    launchPlugin,
    createPluginShortcut,
    removePluginShortcut,
    revealPluginShortcut,
    refresh,
    feedback,
    dismissFeedback,
  } = useAppPluginGovernance();
  const [selectedPluginId, setSelectedPluginId] = React.useState<string | null>(null);
  const selectedPlugin = plugins.find((plugin) => plugin.pluginId === selectedPluginId) ?? null;
  const dropActive = useWindowFileDrop({ onDropFiles: installFromDroppedFiles });

  React.useEffect(() => {
    if (selectedPluginId && !selectedPlugin) {
      setSelectedPluginId(null);
    }
  }, [selectedPlugin, selectedPluginId]);

  if (selectedPlugin) {
    const busy = activeActionId === selectedPlugin.pluginId;
    const installedAtLabel = formatInstalledAt(locale, selectedPlugin.installedAt);
    const shortcut = selectedPlugin.shortcut;

    return (
      <>
        <NotificationStack
          ariaLabel={t("settingsPanel.feedback.ariaLabel")}
          closeButtonLabel={t("settingsPanel.common.close")}
          items={feedback}
          onDismiss={(item) => dismissFeedback(item.id)}
        />
        <WindowDropOverlay
          active={dropActive}
          title={t("settingsPanel.appPlugins.dropzone.title")}
          description={t("settingsPanel.appPlugins.dropzone.description")}
        />
        <SettingsDetailPage
          title={t("settingsPanel.appPlugins.detail.title", { name: selectedPlugin.name })}
          description={selectedPlugin.description ?? t("settingsPanel.appPlugins.detail.description")}
          backLabel={t("settingsPanel.common.back")}
          onBack={() => setSelectedPluginId(null)}
          hero={<AppPluginIcon plugin={selectedPlugin} />}
          status={<div className="governance-status"><AppPluginStatus plugin={selectedPlugin} /></div>}
          primaryActions={
            <div className="action-row">
              <ChipsButton disabled={busy || !selectedPlugin.enabled} onPress={() => void launchPlugin(selectedPlugin)}>
                {t("settingsPanel.appPlugins.actions.launch")}
              </ChipsButton>
              <ChipsButton disabled={busy || selectedPlugin.selfManaged} onPress={() => void togglePluginEnabled(selectedPlugin)}>
                {selectedPlugin.enabled
                  ? t("settingsPanel.appPlugins.actions.disable")
                  : t("settingsPanel.appPlugins.actions.enable")}
              </ChipsButton>
            </div>
          }
          secondaryActions={
            <div className="action-row">
              <ChipsButton disabled={busy} onPress={() => void createPluginShortcut(selectedPlugin)}>
                {shortcut.exists
                  ? t("settingsPanel.appPlugins.actions.rebuildShortcut")
                  : t("settingsPanel.appPlugins.actions.createShortcut")}
              </ChipsButton>
              <ChipsButton disabled={busy || !shortcut.exists} onPress={() => void revealPluginShortcut(selectedPlugin)}>
                {t("settingsPanel.appPlugins.actions.revealShortcut")}
              </ChipsButton>
              <ChipsButton disabled={busy || !shortcut.exists} onPress={() => void removePluginShortcut(selectedPlugin)}>
                {t("settingsPanel.appPlugins.actions.removeShortcut")}
              </ChipsButton>
              <ChipsButton disabled={busy || selectedPlugin.selfManaged} onPress={() => void uninstallPlugin(selectedPlugin)}>
                {t("settingsPanel.appPlugins.actions.uninstall")}
              </ChipsButton>
            </div>
          }
          fieldGroups={[
            {
              title: t("settingsPanel.appPlugins.detail.groups.identity"),
              description: t("settingsPanel.appPlugins.detail.groups.identityDescription"),
              fields: [
                { label: t("settingsPanel.appPlugins.fields.pluginId"), value: selectedPlugin.pluginId },
                { label: t("settingsPanel.appPlugins.fields.version"), value: selectedPlugin.version },
                {
                  label: t("settingsPanel.appPlugins.fields.capabilities"),
                  value: selectedPlugin.capabilities.length > 0
                    ? selectedPlugin.capabilities.join(", ")
                    : t("settingsPanel.common.notAvailable"),
                },
              ],
            },
            {
              title: t("settingsPanel.appPlugins.detail.groups.installation"),
              description: t("settingsPanel.appPlugins.detail.groups.installationDescription"),
              fields: [
                { label: t("settingsPanel.appPlugins.fields.installPath"), value: selectedPlugin.installPath },
                { label: t("settingsPanel.appPlugins.fields.installedAt"), value: installedAtLabel },
              ],
            },
            {
              title: t("settingsPanel.appPlugins.detail.groups.shortcut"),
              description: t("settingsPanel.appPlugins.detail.groups.shortcutDescription"),
              fields: [
                {
                  label: t("settingsPanel.appPlugins.fields.shortcut"),
                  value: shortcut.exists ? shortcut.launcherPath : t("settingsPanel.common.notAvailable"),
                },
              ],
            },
          ]}
        />
      </>
    );
  }

  return (
    <PageFrame
      title={t("settingsPanel.appPlugins.title")}
      actions={<ChipsButton onPress={installWithFilePicker}>{t("settingsPanel.appPlugins.actions.install")}</ChipsButton>}
    >
      <NotificationStack
        ariaLabel={t("settingsPanel.feedback.ariaLabel")}
        closeButtonLabel={t("settingsPanel.common.close")}
        items={feedback}
        onDismiss={(item) => dismissFeedback(item.id)}
      />
      <WindowDropOverlay
        active={dropActive}
        title={t("settingsPanel.appPlugins.dropzone.title")}
        description={t("settingsPanel.appPlugins.dropzone.description")}
      />
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
          <SettingsRecordList
            ariaLabel={t("settingsPanel.appPlugins.listAriaLabel")}
          >
            {plugins.map((plugin) => {
              const busy = activeActionId === plugin.pluginId;
              const installedAtLabel = formatInstalledAt(locale, plugin.installedAt);

              return (
                <SettingsRecordItem
                  key={plugin.pluginId}
                  id={plugin.pluginId}
                  icon={<AppPluginIcon plugin={plugin} />}
                  title={plugin.name}
                  summary={plugin.selfManaged
                    ? t("settingsPanel.appPlugins.selfManaged.description")
                    : plugin.description ?? plugin.pluginId}
                  status={<AppPluginStatus plugin={plugin} />}
                  meta={
                    <>
                      <span>{t("settingsPanel.appPlugins.fields.version")}: {plugin.version}</span>
                      <span>{t("settingsPanel.appPlugins.fields.installedAt")}: {installedAtLabel}</span>
                      <span className="settings-record-meta__shortcut"><AppShortcutStatus plugin={plugin} /></span>
                    </>
                  }
                  actions={
                    <>
                      <ChipsButton disabled={busy || !plugin.enabled} onPress={() => void launchPlugin(plugin)}>
                        {t("settingsPanel.appPlugins.actions.launch")}
                      </ChipsButton>
                      <ChipsButton disabled={busy || plugin.selfManaged} onPress={() => void togglePluginEnabled(plugin)}>
                        {plugin.enabled
                          ? t("settingsPanel.appPlugins.actions.disable")
                          : t("settingsPanel.appPlugins.actions.enable")}
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
