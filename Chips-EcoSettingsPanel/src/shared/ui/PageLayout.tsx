import React from "react";
import { ChipsBox, ChipsCardShell, ChipsGrid, ChipsSection, ChipsStack, ChipsText } from "@chips/component-library";

interface PageStackProps {
  children: React.ReactNode;
}

interface PageSectionProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  titleId?: string;
  children: React.ReactNode;
}

type CardGridEmphasis = "hero" | "wide" | "standard";

interface SummaryPanelProps {
  ariaLabel: string;
  main: React.ReactNode;
  meta?: React.ReactNode;
}

interface CardGridProps {
  minItemSize?: string;
  children: React.ReactNode;
}

interface ShowcaseCardGridProps {
  children: React.ReactNode;
}

interface CardGridItemProps {
  emphasis?: CardGridEmphasis;
  children: React.ReactNode;
}

interface CardDescriptionProps {
  children: React.ReactNode;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  detail: string;
}

export function PageStack({ children }: PageStackProps): React.ReactElement {
  return (
    <ChipsStack className="settings-page-stack" gap="var(--chips-layout-gap-md, 18px)" align="stretch">
      {children}
    </ChipsStack>
  );
}

export function PageSection({
  title,
  description,
  meta,
  titleId,
  children,
}: PageSectionProps): React.ReactElement {
  return (
    <ChipsSection
      className="settings-page-section"
      title={title}
      titleId={titleId}
      description={description}
      ariaLabelledBy={titleId}
      footer={meta}
    >
      {children}
    </ChipsSection>
  );
}

export function SummaryPanel({ ariaLabel, main, meta }: SummaryPanelProps): React.ReactElement {
  return (
    <ChipsBox as="section" className="settings-summary-panel" aria-label={ariaLabel}>
      <ChipsGrid
        className="settings-summary-panel__grid"
        minItemSize="220px"
        gap="var(--chips-layout-gap-md, 18px)"
      >
        <div className="settings-summary-panel__main">{main}</div>
        {meta ? <div className="settings-summary-panel__meta">{meta}</div> : null}
      </ChipsGrid>
    </ChipsBox>
  );
}

export function CardGrid({ minItemSize = "260px", children }: CardGridProps): React.ReactElement {
  return (
    <ChipsGrid
      className="settings-card-grid"
      minItemSize={minItemSize}
      gap="var(--chips-layout-gap-md, 16px)"
    >
      {children}
    </ChipsGrid>
  );
}

export function ShowcaseCardGrid({ children }: ShowcaseCardGridProps): React.ReactElement {
  return (
    <ChipsGrid
      className="settings-card-grid settings-card-grid--showcase"
      minItemSize="260px"
      gap="var(--chips-layout-gap-md, 16px)"
    >
      {children}
    </ChipsGrid>
  );
}

export function CardGridItem({ emphasis = "standard", children }: CardGridItemProps): React.ReactElement {
  return (
    <article className="settings-card-grid__item" data-grid-emphasis={emphasis}>
      {children}
    </article>
  );
}

export function CardDescription({ children }: CardDescriptionProps): React.ReactElement {
  return <ChipsText as="p" className="settings-card-description" text={children} tone="muted" />;
}

export function MetricCard({ label, value, detail }: MetricCardProps): React.ReactElement {
  return (
    <ChipsCardShell
      ariaLabel={label}
      title={<span className="settings-metric-card__label">{label}</span>}
      footer={<span className="settings-metric-card__detail">{detail}</span>}
    >
      <strong className="settings-metric-card__value">{value}</strong>
    </ChipsCardShell>
  );
}
