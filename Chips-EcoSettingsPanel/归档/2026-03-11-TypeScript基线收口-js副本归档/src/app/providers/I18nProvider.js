import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { formatMessage } from "../../shared/i18n/messages";
import { useRuntimeContext } from "./RuntimeProvider";
const I18nContext = React.createContext(null);
export function I18nProvider({ children }) {
    const { currentLocale } = useRuntimeContext();
    const value = React.useMemo(() => {
        return {
            locale: currentLocale,
            t(key, params) {
                return formatMessage(currentLocale, key, params);
            },
        };
    }, [currentLocale]);
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useI18n() {
    const context = React.useContext(I18nContext);
    if (!context) {
        throw new Error("I18nContext is not available.");
    }
    return context;
}
