import enUS from "../../i18n/en-US.json";
import zhCN from "../../i18n/zh-CN.json";

type MessageLeaf = string;
type MessageNode = Record<string, MessageLeaf | MessageNode>;

export type SupportedLocale = "zh-CN" | "en-US";

const dictionaries: Record<SupportedLocale, MessageNode> = {
  "zh-CN": zhCN as MessageNode,
  "en-US": enUS as MessageNode,
};

function readMessage(node: MessageNode, segments: string[]): string | undefined {
  let current: MessageLeaf | MessageNode | undefined = node;

  for (const segment of segments) {
    if (!current || typeof current === "string") {
      return undefined;
    }
    current = current[segment];
  }

  return typeof current === "string" ? current : undefined;
}

export function resolveLocale(locale?: string): SupportedLocale {
  return locale === "en-US" ? "en-US" : "zh-CN";
}

export function formatMessage(
  locale: string,
  key: string,
  params?: Record<string, string | number>
): string {
  const normalizedLocale = resolveLocale(locale);
  const dictionary = dictionaries[normalizedLocale];
  const template = readMessage(dictionary, key.split(".")) ?? key;

  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, name) => {
    const value = params[name];
    return value === undefined || value === null ? "" : String(value);
  });
}
