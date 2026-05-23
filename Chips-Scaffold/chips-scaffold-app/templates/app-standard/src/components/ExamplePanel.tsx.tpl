import React from "react";
import { ChipsButton, resolveI18nText, useChipsI18n } from "@chips/component-library";
import { translateLocalKey } from "../i18n/locales";

interface ExamplePanelProps {
  title: string;
}

export function ExamplePanel({ title }: ExamplePanelProps) {
  const i18n = useChipsI18n();
  const locale = i18n.locale || "zh-CN";
  const localText = (key: string, fallback = key): string => resolveI18nText({
    i18n: (nextKey, params) => translateLocalKey(nextKey, locale, params),
    key,
    fallback,
  });

  return (
    <section
      data-chips-app="app-standard.example-panel"
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--chips-border-subtle)",
      }}
    >
      <h2 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 12, marginBottom: 12 }}>
        {localText("app-standard.examplePanel.body")}
      </p>
      <ChipsButton variant="secondary">{localText("app-standard.actions.learnMore")}</ChipsButton>
    </section>
  );
}
