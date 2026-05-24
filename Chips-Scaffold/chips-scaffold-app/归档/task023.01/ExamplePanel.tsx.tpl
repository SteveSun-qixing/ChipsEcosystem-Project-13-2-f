import React from "react";
import { ChipsButton, useChipsI18nText } from "@chips/component-library";
import { localeBundles } from "../i18n/locales";

interface ExamplePanelProps {
  title: string;
}

export function ExamplePanel({ title }: ExamplePanelProps) {
  const text = useChipsI18nText({
    bundles: localeBundles,
    fallbackLocale: "en-US",
    defaultLocale: "zh-CN",
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
        {text("app-standard.examplePanel.body")}
      </p>
      <ChipsButton variant="secondary">{text("app-standard.actions.learnMore")}</ChipsButton>
    </section>
  );
}
