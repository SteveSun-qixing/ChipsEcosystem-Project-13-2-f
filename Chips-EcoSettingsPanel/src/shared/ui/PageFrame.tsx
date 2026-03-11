import React from "react";
import { ChipsPanelHeader } from "@chips/component-library";

interface PageFrameProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageFrame({ title, subtitle, actions, children }: PageFrameProps): React.ReactElement {
  return (
    <section className="page-frame">
      <ChipsPanelHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="page-frame__body">{children}</div>
    </section>
  );
}
