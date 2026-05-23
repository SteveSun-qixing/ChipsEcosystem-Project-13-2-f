import React from "react";
import { ChipsButton, resolveI18nText } from "@chips/component-library";
import { translateLocalKey } from "../i18n/locales";

interface ExamplePanelProps {
  title: string;
}

function t(key: string, params?: Record<string, string | number>): string {
  return translateLocalKey(key, "zh-CN", params);
}

function text(key: string, fallback = key): string {
  return resolveI18nText({
    i18n: t,
    key,
    fallback,
  });
}

export function ExamplePanel({ title }: ExamplePanelProps) {
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
        {text("app-standard.examplePanel.body")}
      </p>
      <ChipsButton variant="secondary">{text("app-standard.actions.learnMore")}</ChipsButton>
    </section>
  );
}
