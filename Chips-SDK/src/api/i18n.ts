import type { CoreClient } from "../types/client";
import { createError } from "../types/errors";

export interface I18nApi {
  getCurrent(): Promise<string>;
  setCurrent(locale: string): Promise<void>;
  translate(key: string, params?: Record<string, unknown>): Promise<string>;
  listLocales(): Promise<string[]>;
}

export function createI18nApi(client: CoreClient): I18nApi {
  return {
    async getCurrent() {
      const result = await client.invoke<Record<string, never>, { locale: string }>("i18n.getCurrent", {});
      return result.locale;
    },
    async setCurrent(locale) {
      if (!locale) {
        throw createError("INVALID_ARGUMENT", "i18n.setCurrent: locale is required.");
      }
      return client.invoke("i18n.setCurrent", { locale });
    },
    async translate(key, params) {
      if (!key) {
        throw createError("INVALID_ARGUMENT", "i18n.translate: key is required.");
      }
      const result = await client.invoke<{ key: string; params?: Record<string, unknown> }, { text: string }>(
        "i18n.translate",
        { key, params },
      );
      return result.text;
    },
    async listLocales() {
      const result = await client.invoke<Record<string, never>, { locales: string[] }>("i18n.listLocales", {});
      return result.locales;
    },
  };
}
