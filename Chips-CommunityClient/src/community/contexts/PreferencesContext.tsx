import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAppText, type AppTextResolver } from "../../i18n/useAppText";

interface CommunityPreferencesValue {
  locale: string;
  t: AppTextResolver;
  formatDate: (value: string | number | Date) => string;
  formatNumber: (value: number) => string;
}

const CommunityPreferencesContext = createContext<CommunityPreferencesValue | null>(null);

export function CommunityPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { locale, text } = useAppText();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<CommunityPreferencesValue>(() => ({
    locale,
    t: text,
    formatDate(input) {
      return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(input));
    },
    formatNumber(input) {
      return new Intl.NumberFormat(locale).format(input);
    },
  }), [locale, text]);

  return (
    <CommunityPreferencesContext.Provider value={value}>
      {children}
    </CommunityPreferencesContext.Provider>
  );
}

export function useAppPreferences(): CommunityPreferencesValue {
  const context = useContext(CommunityPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside CommunityPreferencesProvider");
  }
  return context;
}
