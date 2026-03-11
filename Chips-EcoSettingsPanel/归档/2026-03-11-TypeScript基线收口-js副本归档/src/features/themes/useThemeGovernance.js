import React from "react";
import { getSettingsRuntimeService } from "../../shared/runtime/settings-runtime-service";
import { normalizeSettingsError } from "../../shared/runtime/errors";
import { useHostRefresh } from "../../shared/hooks/useHostRefresh";
import { useFeedbackQueue } from "../../shared/hooks/useFeedbackQueue";
import { useI18n } from "../../app/providers/I18nProvider";
export function useThemeGovernance() {
    const service = React.useMemo(() => getSettingsRuntimeService(), []);
    const { t } = useI18n();
    const feedback = useFeedbackQueue();
    const [themes, setThemes] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [activeActionId, setActiveActionId] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [dropActive, setDropActive] = React.useState(false);
    const refresh = React.useCallback(async () => {
        setLoading(true);
        try {
            const nextThemes = await service.listThemes();
            setThemes(nextThemes);
            setError(null);
        }
        catch (nextError) {
            setError(normalizeSettingsError(nextError, t("settingsPanel.errors.themeList")));
        }
        finally {
            setLoading(false);
        }
    }, [service, t]);
    React.useEffect(() => {
        void refresh();
    }, [refresh]);
    useHostRefresh(["theme.changed", "plugin.installed", "plugin.uninstalled"], refresh);
    const filteredThemes = React.useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        if (!keyword) {
            return themes;
        }
        return themes.filter((theme) => {
            return [theme.displayName, theme.themeId, theme.version, theme.publisher]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(keyword));
        });
    }, [searchTerm, themes]);
    const installFromPath = React.useCallback(async (manifestPath) => {
        setActiveActionId(manifestPath);
        try {
            await service.installTheme(manifestPath);
            feedback.push({
                tone: "success",
                title: t("settingsPanel.themes.feedback.installTitle"),
                message: t("settingsPanel.themes.feedback.installSuccess"),
            });
            await refresh();
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.themeInstall"));
            setError(normalized);
            feedback.push({
                tone: "error",
                title: t("settingsPanel.themes.feedback.installTitle"),
                message: normalized.message,
            });
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    const installWithFilePicker = React.useCallback(async () => {
        try {
            const filePaths = await service.openPluginFileDialog("theme");
            const first = filePaths[0];
            if (first) {
                await installFromPath(first);
            }
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.filePicker"));
            setError(normalized);
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
            const unsupported = normalizeSettingsError(null, t("settingsPanel.errors.dragPathUnavailable"));
            setError(unsupported);
            feedback.push({
                tone: "warning",
                title: t("settingsPanel.themes.feedback.installTitle"),
                message: unsupported.message,
            });
            return;
        }
        await installFromPath(manifestPath);
    }, [feedback, installFromPath, service, t]);
    const applyTheme = React.useCallback(async (theme) => {
        setActiveActionId(theme.pluginId);
        try {
            await service.applyTheme(theme.themeId);
            feedback.push({
                tone: "success",
                title: t("settingsPanel.themes.feedback.switchTitle"),
                message: t("settingsPanel.themes.feedback.switchSuccess", { name: theme.displayName }),
            });
            await refresh();
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.themeApply"));
            setError(normalized);
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    const uninstallTheme = React.useCallback(async (theme) => {
        if (theme.current) {
            await service.showMessage(t("settingsPanel.themes.dialogs.currentThemeTitle"), t("settingsPanel.themes.dialogs.currentThemeMessage"), t("settingsPanel.themes.dialogs.currentThemeDetail"));
            return;
        }
        const confirmed = await service.showConfirm(t("settingsPanel.themes.dialogs.uninstallTitle"), t("settingsPanel.themes.dialogs.uninstallMessage", { name: theme.displayName }), t("settingsPanel.themes.dialogs.uninstallDetail"));
        if (!confirmed) {
            return;
        }
        setActiveActionId(theme.pluginId);
        try {
            await service.uninstallPlugin(theme.pluginId);
            feedback.push({
                tone: "success",
                title: t("settingsPanel.themes.feedback.uninstallTitle"),
                message: t("settingsPanel.themes.feedback.uninstallSuccess", { name: theme.displayName }),
            });
            await refresh();
        }
        catch (nextError) {
            const normalized = normalizeSettingsError(nextError, t("settingsPanel.errors.themeUninstall"));
            setError(normalized);
        }
        finally {
            setActiveActionId(null);
        }
    }, [feedback, refresh, service, t]);
    return {
        themes: filteredThemes,
        loading,
        error,
        searchTerm,
        setSearchTerm,
        activeActionId,
        installWithFilePicker,
        installFromDroppedFiles,
        applyTheme,
        uninstallTheme,
        refresh,
        feedback: feedback.items,
        dropActive,
        setDropActive,
    };
}
