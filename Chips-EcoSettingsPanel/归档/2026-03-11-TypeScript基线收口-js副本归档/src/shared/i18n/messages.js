import zhCN from "../../../i18n/zh-CN.json";
import enUS from "../../../i18n/en-US.json";
const MESSAGE_BUNDLES = {
    "zh-CN": zhCN,
    "en-US": enUS,
};
export const DEFAULT_LOCALE = "zh-CN";
function getByPath(record, key) {
    return key.split(".").reduce((current, part) => {
        if (!current || typeof current !== "object") {
            return undefined;
        }
        return current[part];
    }, record);
}
export function resolveLocale(input) {
    if (input && input in MESSAGE_BUNDLES) {
        return input;
    }
    return DEFAULT_LOCALE;
}
export function formatMessage(locale, key, params) {
    const bundle = MESSAGE_BUNDLES[resolveLocale(locale)];
    const template = getByPath(bundle, key);
    if (typeof template !== "string") {
        return `[[${key}]]`;
    }
    return Object.entries(params ?? {}).reduce((text, [paramKey, value]) => {
        return text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    }, template);
}
export function getSupportedLocales() {
    return Object.keys(MESSAGE_BUNDLES);
}
