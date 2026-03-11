import React from "react";
import { getSettingsRuntimeService } from "../../shared/runtime/settings-runtime-service";
import { normalizeSettingsError } from "../../shared/runtime/errors";
import { useHostRefresh } from "../../shared/hooks/useHostRefresh";
import { useFeedbackQueue } from "../../shared/hooks/useFeedbackQueue";
import { useI18n } from "../../app/providers/I18nProvider";
export function useAppPluginGovernance() {
    const service = React.useMemo(() => getSettingsRuntimeService(), []);
    const { t } = useI18n();
    const feedback = useFeedbackQueue();
    const [plugins, setPlugins] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeActionId, setActiveActionId] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [dropActive, setDropActive] = React.useState(false);
    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            const nextPlugins = await service.listAppPlugins();
            setPlugins(nextPlugins);
            setError(null);
        }
        catch (nextError) {
            setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginList")));
        }
        finally {
            setLoading(false);
        }
    }, [service, t]);
    React.useEffect(() => {
        void refresh();
    }, [refresh]);
    useHostRefresh(["plugin.installed", "plugin.enabled", "plugin.disabled", "plugin.uninstalled"], refresh);
    const filteredPlugins = React.useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) {
            return plugins;
        }
        return plugins.filter((plugin) => {
            return [plugin.name, plugin.description, plugin.version, plugin.pluginId]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword));
        });
    }, [plugins, searchTerm]);
    const installFromPath = React.useCallback(async (manifestPath) => {
        setActiveActionId(manifestPath);
        try {
            await service.installAppPlugin(manifestPath);
            feedback.push({
                tone: "success",
                title: t("settingsPanel.appPlugins.feedback.installTitle"),
                message: t("settingsPanel.appPlugins.feedback.installSuccess"),
            });
            await refresh();
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginInstall"));
            setError(normalized);
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    const installWithFilePicker = React.useCallback(async () => {
        try {
            const filePaths = await service.openPluginFileDialog("app");
            const first = filePaths[0];
            if (first) {
                await installFromPath(first);
            }
        }
        catch (nextError) {
            setError(normalizeSettingsError(nextError, t("settingsPanel.errors.filePicker")));
        }
    }, [installFromPath, service, t]);
    const installFromDroppedFiles = React.useCallback(async (files) => {
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
    const togglePluginEnabled = React.useCallback(async (plugin) => {
        setActiveActionId(plugin.pluginId);
        try {
            if (plugin.enabled) {
                await service.disablePlugin(plugin.pluginId);
                feedback.push({
                    tone: "success",
                    title: t("settingsPanel.appPlugins.feedback.disableTitle"),
                    message: t("settingsPanel.appPlugins.feedback.disableSuccess", { name: plugin.name }),
                });
            }
            else {
                await service.enablePlugin(plugin.pluginId);
                feedback.push({
                    tone: "success",
                    title: t("settingsPanel.appPlugins.feedback.enableTitle"),
                    message: t("settingsPanel.appPlugins.feedback.enableSuccess", { name: plugin.name }),
                });
            }
            await refresh();
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginToggle"));
            setError(normalized);
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    const uninstallPlugin = React.useCallback(async (plugin) => {
        const confirmed = await service.showConfirm(t("settingsPanel.appPlugins.dialogs.uninstallTitle"), t("settingsPanel.appPlugins.dialogs.uninstallMessage", { name: plugin.name }), t("settingsPanel.appPlugins.dialogs.uninstallDetail"));
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
        }
        catch (nextError) {
            setError(normalizeSettingsError(nextError, t("settingsPanel.errors.appPluginUninstall")));
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    return {
        plugins: filteredPlugins,
        loading,
        error,
        activeActionId,
        searchTerm,
        setSearchTerm,
        installWithFilePicker,
        installFromDroppedFiles,
        togglePluginEnabled,
        uninstallPlugin,
        refresh,
        feedback: feedback.items,
        dropActive,
        setDropActive,
    };
}
