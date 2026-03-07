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
      return client.invoke("i18n.getCurrent", {});
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
      return client.invoke("i18n.translate", { key, params });
    },
    async listLocales() {
      return client.invoke("i18n.listLocales", {});
    },
  };
}

