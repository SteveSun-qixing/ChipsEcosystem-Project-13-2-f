import zhCN from "../../i18n/zh-CN.json";
import enUS from "../../i18n/en-US.json";

type ZhCnMessages = typeof zhCN;

export type MessageKey = keyof ZhCnMessages;

type MessageMap = Record<MessageKey, string>;

const defaultMessages = zhCN as MessageMap;
const englishMessages = enUS as MessageMap;

const LOCALES: Record<string, MessageMap> = {
  "zh-cn": defaultMessages,
  zh: defaultMessages,
  "en-us": englishMessages,
  en: englishMessages,
};

function resolveLocale(locale?: string): MessageMap {
  const normalized = (locale || "").toLowerCase();
  if (normalized) {
    const direct = LOCALES[normalized];
    if (direct) {
      return direct;
    }
  }

  const navigatorLocale =
    typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";

  if (navigatorLocale) {
    const byExact = LOCALES[navigatorLocale];
    if (byExact) {
      return byExact;
    }
  }

  if (navigatorLocale.startsWith("en")) {
    return englishMessages;
  }

  return defaultMessages;
}

export function createTranslator(locale?: string) {
  const messages = resolveLocale(locale);

  return (key: MessageKey): string => {
    return messages[key] ?? key;
  };
}
