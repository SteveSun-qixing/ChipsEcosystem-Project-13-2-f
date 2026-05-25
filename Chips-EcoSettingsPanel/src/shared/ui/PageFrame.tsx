import React from "react";
import { ChipsPanelHeader, ChipsStack } from "@chips/component-library";

interface PageFrameProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageFrame({ title, subtitle, actions, children }: PageFrameProps): React.ReactElement {
  return (
    <ChipsStack
      as="section"
      className="settings-page-frame"
      gap="var(--chips-layout-gap-md, 18px)"
      align="stretch"
      aria-label={title}
    >
      <ChipsPanelHeader title={title} subtitle={subtitle} actions={actions} />
      <ChipsStack
        className="settings-page-frame__body"
        gap="var(--chips-layout-gap-md, 18px)"
        align="stretch"
      >
        {children}
      </ChipsStack>
    </ChipsStack>
  );
}
