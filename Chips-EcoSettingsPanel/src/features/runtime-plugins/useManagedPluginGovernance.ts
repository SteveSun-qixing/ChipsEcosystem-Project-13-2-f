import React from "react";
import type { GovernedPluginType, PluginGovernanceRecord } from "../../shared/runtime/settings-runtime-service";
import { getSettingsRuntimeService } from "../../shared/runtime/settings-runtime-service";
import { normalizeSettingsError, type SettingsPanelError } from "../../shared/runtime/errors";
import { useHostRefresh } from "../../shared/hooks/useHostRefresh";
import { useFeedbackQueue } from "../../shared/hooks/useFeedbackQueue";
import { useI18n } from "../../app/providers/I18nProvider";

interface ManagedPluginMessages {
  listErrorKey: string;
  installErrorKey: string;
  toggleErrorKey: string;
  uninstallErrorKey: string;
  pickerTitleKey: string;
  pickerFilterKey: string;
  installTitleKey: string;
  installSuccessKey: string;
  enableTitleKey: string;
  enableSuccessKey: string;
  disableTitleKey: string;
  disableSuccessKey: string;
  uninstallTitleKey: string;
  uninstallSuccessKey: string;
  confirmTitleKey: string;
  confirmMessageKey: string;
  confirmDetailKey: string;
}

export function useManagedPluginGovernance(type: GovernedPluginType, messages: ManagedPluginMessages) {
  const service = React.useMemo(() => getSettingsRuntimeService(), []);
  const { t } = useI18n();
  const feedback = useFeedbackQueue();
  const [plugins, setPlugins] = React.useState<PluginGovernanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<SettingsPanelError | null>(null);
  const [activeActionId, setActiveActionId] = React.useState<string | null>(null);
  const [dropActive, setDropActive] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const nextPlugins = await service.listPlugins(type);
      setPlugins(nextPlugins);
      setError(null);
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t(messages.listErrorKey)));
    } finally {
      setLoading(false);
    }
  }, [messages.listErrorKey, service, t, type]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  useHostRefresh(["plugin.installed", "plugin.enabled", "plugin.disabled", "plugin.uninstalled"], refresh);

  const installFromPath = React.useCallback(async (manifestPath: string) => {
    setActiveActionId(manifestPath);
    try {
      await service.installPluginOfType(manifestPath, type);
      feedback.push({
        tone: "success",
        title: t(messages.installTitleKey),
        message: t(messages.installSuccessKey),
      });
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t(messages.installErrorKey)));
    } finally {
      setActiveActionId(null);
    }
  }, [feedback, messages.installErrorKey, messages.installSuccessKey, messages.installTitleKey, refresh, service, t, type]);

  const installWithFilePicker = React.useCallback(async () => {
    try {
      const filePaths = await service.openPluginFileDialog(type, {
        title: t(messages.pickerTitleKey),
        filterName: t(messages.pickerFilterKey),
      });
      const first = filePaths[0];
      if (first) {
        await installFromPath(first);
      }
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t("settingsPanel.errors.filePicker")));
    }
  }, [installFromPath, messages.pickerFilterKey, messages.pickerTitleKey, service, t, type]);

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

  const togglePluginEnabled = React.useCallback(async (plugin: PluginGovernanceRecord) => {
    setActiveActionId(plugin.pluginId);
    try {
      if (plugin.enabled) {
        await service.disablePlugin(plugin.pluginId);
        feedback.push({
          tone: "success",
          title: t(messages.disableTitleKey),
          message: t(messages.disableSuccessKey, { name: plugin.name }),
        });
      } else {
        await service.enablePlugin(plugin.pluginId);
        feedback.push({
          tone: "success",
          title: t(messages.enableTitleKey),
          message: t(messages.enableSuccessKey, { name: plugin.name }),
        });
      }
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t(messages.toggleErrorKey)));
    } finally {
      setActiveActionId(null);
    }
  }, [
    feedback,
    messages.disableSuccessKey,
    messages.disableTitleKey,
    messages.enableSuccessKey,
    messages.enableTitleKey,
    messages.toggleErrorKey,
    refresh,
    service,
    t,
  ]);

  const uninstallPlugin = React.useCallback(async (plugin: PluginGovernanceRecord) => {
    const confirmed = await service.showConfirm(
      t(messages.confirmTitleKey),
      t(messages.confirmMessageKey, { name: plugin.name }),
      t(messages.confirmDetailKey),
    );

    if (!confirmed) {
      return;
    }

    setActiveActionId(plugin.pluginId);
    try {
      await service.uninstallPlugin(plugin.pluginId);
      feedback.push({
        tone: "success",
        title: t(messages.uninstallTitleKey),
        message: t(messages.uninstallSuccessKey, { name: plugin.name }),
      });
      await refresh();
    } catch (nextError) {
      setError(normalizeSettingsError(nextError, t(messages.uninstallErrorKey)));
    } finally {
      setActiveActionId(null);
    }
  }, [
    feedback,
    messages.confirmDetailKey,
    messages.confirmMessageKey,
    messages.confirmTitleKey,
    messages.uninstallErrorKey,
    messages.uninstallSuccessKey,
    messages.uninstallTitleKey,
    refresh,
    service,
    t,
  ]);

  return {
    plugins,
    loading,
    error,
    activeActionId,
    installWithFilePicker,
    installFromDroppedFiles,
    togglePluginEnabled,
    uninstallPlugin,
    refresh,
    feedback: feedback.items,
    dismissFeedback: feedback.remove,
    dropActive,
    setDropActive,
  };
}
