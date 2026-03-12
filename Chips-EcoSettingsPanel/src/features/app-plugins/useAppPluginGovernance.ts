import React from "react";
import type { AppPluginGovernanceRecord } from "../../shared/runtime/settings-runtime-service";
import { getSettingsRuntimeService } from "../../shared/runtime/settings-runtime-service";
import { normalizeSettingsError, type SettingsPanelError } from "../../shared/runtime/errors";
import { useHostRefresh } from "../../shared/hooks/useHostRefresh";
import { useFeedbackQueue } from "../../shared/hooks/useFeedbackQueue";
import { useI18n } from "../../app/providers/I18nProvider";

export function useAppPluginGovernance() {
  const service = React.useMemo(() => getSettingsRuntimeService(), []);
  const { t } = useI18n();
  const feedback = useFeedbackQueue();
  const [plugins, setPlugins] = React.useState<AppPluginGovernanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<SettingsPanelError | null>(null);
  const [activeActionId, setActiveActionId] = React.useState<string | null>(null);
  const [dropActive, setDropActive] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextPlugins = await service.listAppPlugins();
      setPlugins(nextPlugins);
      setError(null);
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginList")));
    } finally {
      setLoading(false);
    }
  }, [service, t]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  useHostRefresh(["plugin.installed", "plugin.enabled", "plugin.disabled", "plugin.uninstalled"], refresh);

  const installFromPath = React.useCallback(async (manifestPath: string) => {
    setActiveActionId(manifestPath);
    try {
      await service.installAppPlugin(manifestPath);
      feedback.push({
        tone: "success",
        title: t("settingsPanel.appPlugins.feedback.installTitle"),
        message: t("settingsPanel.appPlugins.feedback.installSuccess"),
      });
      await refresh();
    } catch (nextError) {
      const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginInstall"));
      setError(normalized);
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, refresh, service, t]);

  const installWithFilePicker = React.useCallback(async () => {
    try {
      const filePaths = await service.openPluginFileDialog("app", {
        title: t("settingsPanel.appPlugins.dialogs.filePickerTitle"),
        filterName: t("settingsPanel.appPlugins.dialogs.filePickerFilter"),
      });
      const first = filePaths[0];
      if (first) {
        await installFromPath(first);
      }
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.filePicker")));
    }
  }, [installFromPath, service, t]);

  const installFromDroppedFiles = React.useCallback(async (files: File[]) => {
    setDropActive(false);
    const firstFile = files[0];
    if (!firstFile) {
      return;
    }

    const manifestPath = service.getPathForFile(firstFile);
    if (!manifestPath) {
      setError(normalizeSettingsError(null, t("settingsPanel.errors.dragPathUnavailable")));
      return;
    }

    await installFromPath(manifestPath);
  }, [installFromPath, service, t]);

  const togglePluginEnabled = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    if (plugin.selfManaged) {
      feedback.push({
        tone: "warning",
        title: t("settingsPanel.appPlugins.feedback.selfManagedBlockedTitle"),
        message: t("settingsPanel.appPlugins.feedback.selfManagedBlockedMessage"),
      });
      return;
    }

    setActiveActionId(plugin.pluginId);
    try {
      if (plugin.enabled) {
        await service.disablePlugin(plugin.pluginId);
        feedback.push({
          tone: "success",
          title: t("settingsPanel.appPlugins.feedback.disableTitle"),
          message: t("settingsPanel.appPlugins.feedback.disableSuccess", { name: plugin.name }),
        });
      } else {
        await service.enablePlugin(plugin.pluginId);
        feedback.push({
          tone: "success",
          title: t("settingsPanel.appPlugins.feedback.enableTitle"),
          message: t("settingsPanel.appPlugins.feedback.enableSuccess", { name: plugin.name }),
        });
      }
      await refresh();
    } catch (nextError) {
      const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginToggle"));
      setError(normalized);
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, refresh, service, t]);

  const uninstallPlugin = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    if (plugin.selfManaged) {
      feedback.push({
        tone: "warning",
        title: t("settingsPanel.appPlugins.feedback.selfManagedBlockedTitle"),
        message: t("settingsPanel.appPlugins.feedback.selfManagedBlockedMessage"),
      });
      return;
    }

    const confirmed = await service.showConfirm(
      t("settingsPanel.appPlugins.dialogs.uninstallTitle"),
      t("settingsPanel.appPlugins.dialogs.uninstallMessage", { name: plugin.name }),
      t("settingsPanel.appPlugins.dialogs.uninstallDetail"),
    );

    if (!confirmed) {
      return;
    }

    setActiveActionId(plugin.pluginId);
    try {
      await service.uninstallPlugin(plugin.pluginId);
      feedback.push({
        tone: "success",
        title: t("settingsPanel.appPlugins.feedback.uninstallTitle"),
        message: t("settingsPanel.appPlugins.feedback.uninstallSuccess", { name: plugin.name }),
      });
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginUninstall")));
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, refresh, service, t]);

  const createPluginShortcut = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    setActiveActionId(plugin.pluginId);
    try {
      await service.createPluginShortcut(plugin.pluginId, plugin.shortcut.exists);
      feedback.push({
        tone: "success",
        title: t("settingsPanel.appPlugins.feedback.shortcutCreateTitle"),
        message: t("settingsPanel.appPlugins.feedback.shortcutCreateSuccess", { name: plugin.name }),
      });
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginShortcutCreate")));
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, refresh, service, t]);

  const launchPlugin = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    setActiveActionId(plugin.pluginId);
    try {
      await service.launchPlugin(plugin.pluginId);
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginLaunch")));
    } finally {
      setActiveActionId(null);
    }
  }, [service, t]);

  const removePluginShortcut = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    setActiveActionId(plugin.pluginId);
    try {
      await service.removePluginShortcut(plugin.pluginId);
      feedback.push({
        tone: "success",
        title: t("settingsPanel.appPlugins.feedback.shortcutRemoveTitle"),
        message: t("settingsPanel.appPlugins.feedback.shortcutRemoveSuccess", { name: plugin.name }),
      });
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginShortcutRemove")));
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, refresh, service, t]);

  const revealPluginShortcut = React.useCallback(async (plugin: AppPluginGovernanceRecord) => {
    if (!plugin.shortcut.launcherPath) {
      return;
    }

    setActiveActionId(plugin.pluginId);
    try {
      await service.revealPath(plugin.shortcut.launcherPath);
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginShortcutReveal")));
    } finally {
      setActiveActionId(null);
    }
  }, [service, t]);

  return {
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
    feedback: feedback.items,
    dismissFeedback: feedback.remove,
    dropActive,
    setDropActive,
  };
}
