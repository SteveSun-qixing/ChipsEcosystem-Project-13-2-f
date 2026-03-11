import { getChipsClient } from "./client";
import { normalizeSettingsError } from "./errors";
function sortByName(items) {
    return [...items].sort((left, right) => {
        const leftName = left.displayName ?? left.name ?? "";
        const rightName = right.displayName ?? right.name ?? "";
        const nameDiff = leftName.localeCompare(rightName, "zh-Hans-CN");
        if (nameDiff !== 0) {
            return nameDiff;
        }
        return (right.installedAt ?? 0) - (left.installedAt ?? 0);
    });
}
function toLocaleDisplayName(locale, displayLocale) {
    const displayNames = typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames([displayLocale], { type: "language" })
        : null;
    const nativeNames = typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames([locale], { type: "language" })
        : null;
    const fallbackLabel = locale;
    return {
        displayName: displayNames?.of(locale) ?? fallbackLabel,
        nativeName: nativeNames?.of(locale) ?? fallbackLabel,
    };
}
function toSettingsError(error, fallbackMessage) {
    return normalizeSettingsError(error, fallbackMessage);
}
export class SettingsRuntimeService {
    constructor(client) {
        this.client = client;
    }
    getClient() {
        return this.client;
    }
    async listThemes() {
        try {
            const [installedThemes, enabledThemes, currentTheme] = await Promise.all([
                this.client.plugin.query({ type: "theme" }),
                this.client.theme.list(),
                this.client.theme.getCurrent(),
            ]);
            const enabledThemeIds = new Set(enabledThemes.map((theme) => theme.id));
            return sortByName(installedThemes
                .filter((record) => record.type === "theme" && record.theme)
                .map((record) => {
                const themeInfo = record.theme;
                return {
                    pluginId: record.id,
                    themeId: themeInfo?.themeId ?? record.id,
                    displayName: themeInfo?.displayName ?? record.name,
                    version: record.version,
                    installed: true,
                    enabled: enabledThemeIds.has(themeInfo?.themeId ?? ""),
                    current: currentTheme.themeId === (themeInfo?.themeId ?? ""),
                    installPath: record.installPath,
                    installedAt: record.installedAt,
                    publisher: themeInfo?.publisher,
                    parentTheme: themeInfo?.parentTheme,
                    isDefault: themeInfo?.isDefault === true,
                };
            })).sort((left, right) => {
                if (left.current !== right.current) {
                    return left.current ? -1 : 1;
                }
                if (left.enabled !== right.enabled) {
                    return left.enabled ? -1 : 1;
                }
                return left.displayName.localeCompare(right.displayName, "zh-Hans-CN");
            });
        }
        catch (error) {
            throw toSettingsError(error, "Failed to load installed themes.");
        }
    }
    async installTheme(manifestPath) {
        try {
            await this.client.plugin.install(manifestPath);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to install theme package.");
        }
    }
    async applyTheme(themeId) {
        try {
            await this.client.theme.apply(themeId);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to apply selected theme.");
        }
    }
    async uninstallPlugin(pluginId) {
        try {
            await this.client.plugin.uninstall(pluginId);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to uninstall plugin.");
        }
    }
    async listLanguages(displayLocale) {
        try {
            const [locales, currentLocale] = await Promise.all([
                this.client.i18n.listLocales(),
                this.client.i18n.getCurrent(),
            ]);
            return locales.map((locale) => {
                const names = toLocaleDisplayName(locale, displayLocale);
                return {
                    locale,
                    displayName: names.displayName,
                    nativeName: names.nativeName,
                    current: locale === currentLocale,
                };
            });
        }
        catch (error) {
            throw toSettingsError(error, "Failed to load installed languages.");
        }
    }
    async setCurrentLocale(locale) {
        try {
            await this.client.i18n.setCurrent(locale);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to switch current language.");
        }
    }
    async listAppPlugins() {
        try {
            const installed = await this.client.plugin.query({ type: "app" });
            return sortByName(installed
                .filter((record) => record.type === "app")
                .map((record) => ({
                pluginId: record.id,
                name: record.name,
                description: record.description,
                version: record.version,
                enabled: record.enabled,
                installPath: record.installPath,
                installedAt: record.installedAt,
                capabilities: [...(record.capabilities ?? [])],
            }))).sort((left, right) => {
                if (left.enabled !== right.enabled) {
                    return left.enabled ? -1 : 1;
                }
                return left.name.localeCompare(right.name, "zh-Hans-CN");
            });
        }
        catch (error) {
            throw toSettingsError(error, "Failed to load installed app plugins.");
        }
    }
    async installAppPlugin(manifestPath) {
        try {
            await this.client.plugin.install(manifestPath);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to install app plugin.");
        }
    }
    async enablePlugin(pluginId) {
        try {
            await this.client.plugin.enable(pluginId);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to enable app plugin.");
        }
    }
    async disablePlugin(pluginId) {
        try {
            await this.client.plugin.disable(pluginId);
        }
        catch (error) {
            throw toSettingsError(error, "Failed to disable app plugin.");
        }
    }
    async openPluginFileDialog(kind) {
        try {
            const title = kind === "theme" ? "Install theme package" : "Install app plugin";
            const result = await this.client.invoke("platform.dialogOpenFile", {
                options: {
                    title,
                    properties: ["openFile", "openDirectory"],
                    filters: [
                        {
                            name: kind === "theme" ? "Theme package" : "App plugin",
                            extensions: ["cpk", "yaml", "yml", "json"],
                        },
                    ],
                },
            });
            return result.filePaths ?? [];
        }
        catch (error) {
            throw toSettingsError(error, "Failed to open file picker.");
        }
    }
    getPathForFile(file) {
        return this.client.platform.getPathForFile(file);
    }
    async showConfirm(title, message, detail) {
        try {
            const result = await this.client.invoke("platform.dialogShowConfirm", {
                options: {
                    title,
                    message,
                    detail,
                },
            });
            return result.confirmed;
        }
        catch (error) {
            throw toSettingsError(error, "Failed to open confirm dialog.");
        }
    }
    async showMessage(title, message, detail) {
        try {
            await this.client.invoke("platform.dialogShowMessage", {
                options: {
                    title,
                    message,
                    detail,
                },
            });
        }
        catch (error) {
            throw toSettingsError(error, "Failed to open message dialog.");
        }
    }
}
let cachedService = null;
export function getSettingsRuntimeService() {
    if (!cachedService) {
        cachedService = new SettingsRuntimeService(getChipsClient());
    }
    return cachedService;
}
export function filterPluginsByType(records, type) {
    return records.filter((record) => record.type === type);
}
export function filterThemesByEnabled(themes) {
    return themes.filter((theme) => theme.enabled);
}
export function sortThemeMeta(themes) {
    return sortByName(themes);
}
export function sortThemeState(currentTheme, themes) {
    return [...themes].sort((left, right) => {
        if (currentTheme) {
            if (left.themeId === currentTheme.themeId && right.themeId !== currentTheme.themeId) {
                return -1;
            }
            if (right.themeId === currentTheme.themeId && left.themeId !== currentTheme.themeId) {
                return 1;
            }
        }
        return left.displayName.localeCompare(right.displayName, "zh-Hans-CN");
    });
}
