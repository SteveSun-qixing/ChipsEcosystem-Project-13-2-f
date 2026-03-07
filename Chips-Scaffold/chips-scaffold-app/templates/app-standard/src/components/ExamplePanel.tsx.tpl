import React from "react";
import { ChipsButton } from "@chips/component-library";

interface ExamplePanelProps {
  title: string;
}

export function ExamplePanel({ title }: ExamplePanelProps) {
  return (
    <section
      data-chips-app="app-standard.example-panel"
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--chips-border-subtle, rgba(255,255,255,0.08))",
      }}
    >
      <h2 style={{ fontSize: 14, marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 12, marginBottom: 12 }}>
        这是由脚手架生成的示例面板组件，你可以在此基础上扩展业务 UI。
      </p>
      <ChipsButton variant="secondary">了解更多</ChipsButton>
    </section>
  );
}

