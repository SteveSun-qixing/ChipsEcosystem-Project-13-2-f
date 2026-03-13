import { useCallback, useSyncExternalStore } from 'react';
import { getLocale, subscribeLocaleChange, translate } from '../i18n';

export function useTranslation() {
    const locale = useSyncExternalStore(subscribeLocaleChange, getLocale, getLocale);
    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        return translate(key, params, locale);
    }, [locale]);

    return { t, locale };
}
