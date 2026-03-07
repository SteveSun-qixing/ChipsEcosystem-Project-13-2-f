import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface ThemeMeta {
  id: string;
  displayName: string;
  version?: string;
  publisher?: string;
}

export interface ThemeState {
  id: string;
  displayName: string;
  variables?: Record<string, unknown>;
}

export interface ResolvedTheme {
  resolved: Array<{ id: string; displayName: string; order: number }>;
  tokens: Record<string, unknown>;
}

export interface ThemeContract {
  component?: string;
  [key: string]: unknown;
}

export interface ThemeApi {
  list(publisher?: string): Promise<ThemeMeta[]>;
  apply(themeId: string): Promise<void>;
  getCurrent(options?: { appId?: string; pluginId?: string }): Promise<ThemeState>;
  getAllCss(): Promise<string>;
  resolve(chain: string[]): Promise<ResolvedTheme>;
  contract: {
    get(component?: string): Promise<ThemeContract>;
  };
}

export function createThemeApi(client: CoreClient): ThemeApi {
  return {
    async list(publisher) {
      return client.invoke("theme.list", { publisher });
    },
    async apply(themeId) {
      if (!themeId) {
        throw createError("INVALID_ARGUMENT", "theme.apply: themeId is required.");
      }
      return client.invoke("theme.apply", { id: themeId });
    },
    async getCurrent(options) {
      return client.invoke("theme.getCurrent", options ?? {});
    },
    async getAllCss() {
      const result = await client.invoke<Record<string, never>, { css: string; themeId?: string }>(
        "theme.getAllCss",
        {},
      );
      return result.css;
    },
    async resolve(chain) {
      if (!Array.isArray(chain)) {
        throw createError("INVALID_ARGUMENT", "theme.resolve: chain must be an array of theme ids.");
      }
      return client.invoke("theme.resolve", { chain });
    },
    contract: {
      async get(component) {
        return client.invoke("theme.contract.get", component ? { component } : {});
      },
    },
  };
}
