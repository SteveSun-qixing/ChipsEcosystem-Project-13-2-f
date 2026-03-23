import type { Client, PluginRecord, PluginShortcutRecord, PluginType, ThemeMeta, ThemeState } from "chips-sdk";
import { appConfig } from "../../../config/app-config";
import { getChipsClient } from "./client";
import { normalizeSettingsError, type SettingsPanelError } from "./errors";

export interface ThemeGovernanceRecord {
  pluginId: string;
  themeId: string;
  displayName: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  current: boolean;
  installPath: string;
  installedAt: number;
  publisher?: string;
  parentTheme?: string;
  isDefault: boolean;
}

export interface LanguageGovernanceRecord {
  locale: string;
  displayName: string;
  nativeName: string;
  current: boolean;
}

export interface AppPluginGovernanceRecord {
  pluginId: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  selfManaged: boolean;
  installPath: string;
  installedAt: number;
  capabilities: string[];
  shortcut: PluginShortcutRecord;
}

export type GovernedPluginType = Exclude<PluginType, "app" | "theme">;

export interface PluginGovernanceRecord {
  pluginId: string;
  type: GovernedPluginType;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  installPath: string;
  installedAt: number;
  capabilities: string[];
  cardTypes: string[];
  layoutType?: string;
  displayName?: string;
}

interface OpenFileDialogResult {
  filePaths: string[] | null;
}

interface OpenPluginFileDialogOptions {
  title: string;
  filterName: string;
}

interface ConfirmDialogResult {
  confirmed: boolean;
}

interface MessageDialogResult {
  response: number;
}

function sortByName<T extends { displayName?: string; name?: string; installedAt?: number }>(items: T[]): T[] {
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

function toLocaleDisplayName(locale: string, displayLocale: string): { displayName: string; nativeName: string } {
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

function toSettingsError(error: unknown, fallbackMessage: string): SettingsPanelError {
  return normalizeSettingsError(error, fallbackMessage);
}

function toPluginGovernanceRecord(record: PluginRecord): PluginGovernanceRecord {
  return {
    pluginId: record.id,
    type: record.type as GovernedPluginType,
    name: record.name,
    description: record.description,
    version: record.version,
    enabled: record.enabled,
    installPath: record.installPath,
    installedAt: record.installedAt,
    capabilities: [...(record.capabilities ?? [])],
    cardTypes: record.type === "card" ? [...(record.capabilities ?? [])] : [],
    layoutType: record.layout?.layoutType,
    displayName: record.layout?.displayName,
  };
}

export class SettingsRuntimeService {
  public constructor(private readonly client: Client) {}

  public getClient(): Client {
    return this.client;
  }

  public async listThemes(): Promise<ThemeGovernanceRecord[]> {
    try {
      const [installedThemes, enabledThemes, currentTheme] = await Promise.all([
        this.client.plugin.query({ type: "theme" }),
        this.client.theme.list(),
        this.client.theme.getCurrent(),
      ]);

      const enabledThemeIds = new Set(enabledThemes.map((theme) => theme.id));
      return sortByName(
        installedThemes
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
          }),
      ).sort((left, right) => {
        if (left.current !== right.current) {
          return left.current ? -1 : 1;
        }
        if (left.enabled !== right.enabled) {
          return left.enabled ? -1 : 1;
        }
        return left.displayName.localeCompare(right.displayName, "zh-Hans-CN");
      });
    } catch (error) {
      throw toSettingsError(error, "Failed to load installed themes.");
    }
  }

  public async installTheme(manifestPath: string): Promise<void> {
    try {
      const { pluginId } = await this.client.plugin.install(manifestPath);
      await this.client.plugin.enable(pluginId);
    } catch (error) {
      throw toSettingsError(error, "Failed to install theme package.");
    }
  }

  public async applyTheme(themeId: string): Promise<void> {
    try {
      await this.client.theme.apply(themeId);
    } catch (error) {
      throw toSettingsError(error, "Failed to apply selected theme.");
    }
  }

  public async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      await this.client.plugin.uninstall(pluginId);
    } catch (error) {
      throw toSettingsError(error, "Failed to uninstall plugin.");
    }
  }

  public async listLanguages(displayLocale: string): Promise<LanguageGovernanceRecord[]> {
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
    } catch (error) {
      throw toSettingsError(error, "Failed to load installed languages.");
    }
  }

  public async setCurrentLocale(locale: string): Promise<void> {
    try {
      await this.client.i18n.setCurrent(locale);
    } catch (error) {
      throw toSettingsError(error, "Failed to switch current language.");
    }
  }

  public async listAppPlugins(): Promise<AppPluginGovernanceRecord[]> {
    try {
      const installed = await this.client.plugin.query({ type: "app" });
      const appRecords = installed.filter((record) => record.type === "app");
      const shortcuts = await Promise.all(
        appRecords.map(async (record) => {
          const shortcut = await this.client.plugin.getShortcut(record.id);
          return [record.id, shortcut] as const;
        }),
      );
      const shortcutMap = new Map(shortcuts);

      return sortByName(
        appRecords.map((record) => ({
          pluginId: record.id,
          name: record.name,
          description: record.description,
          version: record.version,
          enabled: record.enabled,
          selfManaged: record.id === appConfig.appId,
          installPath: record.installPath,
          installedAt: record.installedAt,
          capabilities: [...(record.capabilities ?? [])],
          shortcut: shortcutMap.get(record.id) ?? {
            pluginId: record.id,
            name: record.name,
            location: "desktop",
            launcherPath: "",
            executablePath: "",
            args: [],
            exists: false,
          },
        })),
      ).sort((left, right) => {
        if (left.enabled !== right.enabled) {
          return left.enabled ? -1 : 1;
        }
        return left.name.localeCompare(right.name, "zh-Hans-CN");
      });
    } catch (error) {
      throw toSettingsError(error, "Failed to load installed app plugins.");
    }
  }

  public async installAppPlugin(manifestPath: string): Promise<void> {
    try {
      await this.client.plugin.install(manifestPath);
    } catch (error) {
      throw toSettingsError(error, "Failed to install app plugin.");
    }
  }

  public async listPlugins(type: GovernedPluginType): Promise<PluginGovernanceRecord[]> {
    try {
      const installed = await this.client.plugin.query({ type });
      return sortByName(
        installed
          .filter((record) => record.type === type)
          .map((record) => toPluginGovernanceRecord(record)),
      ).sort((left, right) => {
        if (left.enabled !== right.enabled) {
          return left.enabled ? -1 : 1;
        }
        return left.name.localeCompare(right.name, "zh-Hans-CN");
      });
    } catch (error) {
      throw toSettingsError(error, `Failed to load installed ${type} plugins.`);
    }
  }

  public async installPluginOfType(manifestPath: string, expectedType: GovernedPluginType): Promise<void> {
    try {
      const installResult = await this.client.plugin.install(manifestPath);
      const plugin = await this.client.plugin.get(installResult.pluginId);
      if (!plugin || plugin.type !== expectedType) {
        throw toSettingsError(
          null,
          `Installed package type mismatch. Expected ${expectedType}.`,
        );
      }
    } catch (error) {
      throw toSettingsError(error, `Failed to install ${expectedType} plugin.`);
    }
  }

  public async enablePlugin(pluginId: string): Promise<void> {
    try {
      await this.client.plugin.enable(pluginId);
    } catch (error) {
      throw toSettingsError(error, "Failed to enable app plugin.");
    }
  }

  public async disablePlugin(pluginId: string): Promise<void> {
    try {
      await this.client.plugin.disable(pluginId);
    } catch (error) {
      throw toSettingsError(error, "Failed to disable app plugin.");
    }
  }

  public async launchPlugin(pluginId: string): Promise<void> {
    try {
      await this.client.plugin.launch(pluginId, {});
    } catch (error) {
      throw toSettingsError(error, "Failed to launch app plugin.");
    }
  }

  public async createPluginShortcut(pluginId: string, replace = false): Promise<PluginShortcutRecord> {
    try {
      return await this.client.plugin.createShortcut(pluginId, { replace });
    } catch (error) {
      throw toSettingsError(error, "Failed to create app shortcut.");
    }
  }

  public async removePluginShortcut(pluginId: string): Promise<{ removed: boolean; launcherPath: string; location: "desktop" | "launchpad" }> {
    try {
      return await this.client.plugin.removeShortcut(pluginId);
    } catch (error) {
      throw toSettingsError(error, "Failed to remove app shortcut.");
    }
  }

  public async revealPath(path: string): Promise<void> {
    try {
      await this.client.invoke("platform.shellShowItemInFolder", { path });
    } catch (error) {
      throw toSettingsError(error, "Failed to reveal shortcut path.");
    }
  }

  public async openPluginFileDialog(kind: "theme" | "app" | GovernedPluginType, dialog: OpenPluginFileDialogOptions): Promise<string[]> {
    try {
      const result = await this.client.invoke<{ options: Record<string, unknown> }, OpenFileDialogResult>(
        "platform.dialogOpenFile",
        {
          options: {
            title: dialog.title,
            properties: ["openFile", "openDirectory"],
            filters: [
              {
                name: dialog.filterName,
                extensions: ["cpk", "yaml", "yml", "json"],
              },
            ],
          },
        },
      );
      return result.filePaths ?? [];
    } catch (error) {
      throw toSettingsError(error, "Failed to open file picker.");
    }
  }

  public getPathForFile(file: File): string {
    return this.client.platform.getPathForFile(file);
  }

  public async showConfirm(title: string, message: string, detail?: string): Promise<boolean> {
    try {
      const result = await this.client.invoke<{ options: Record<string, unknown> }, ConfirmDialogResult>(
        "platform.dialogShowConfirm",
        {
          options: {
            title,
            message,
            detail,
          },
        },
      );
      return result.confirmed;
    } catch (error) {
      throw toSettingsError(error, "Failed to open confirm dialog.");
    }
  }

  public async showMessage(title: string, message: string, detail?: string): Promise<void> {
    try {
      await this.client.invoke<{ options: Record<string, unknown> }, MessageDialogResult>("platform.dialogShowMessage", {
        options: {
          title,
          message,
          detail,
        },
      });
    } catch (error) {
      throw toSettingsError(error, "Failed to open message dialog.");
    }
  }
}

let cachedService: SettingsRuntimeService | null = null;

export function getSettingsRuntimeService(): SettingsRuntimeService {
  if (!cachedService) {
    cachedService = new SettingsRuntimeService(getChipsClient());
  }
  return cachedService;
}

export function filterPluginsByType(records: PluginRecord[], type: PluginType): PluginRecord[] {
  return records.filter((record) => record.type === type);
}

export function filterThemesByEnabled(themes: ThemeGovernanceRecord[]): ThemeGovernanceRecord[] {
  return themes.filter((theme) => theme.enabled);
}

export function sortThemeMeta(themes: ThemeMeta[]): ThemeMeta[] {
  return sortByName(themes);
}

export function sortThemeState(currentTheme: ThemeState | null, themes: ThemeGovernanceRecord[]): ThemeGovernanceRecord[] {
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
