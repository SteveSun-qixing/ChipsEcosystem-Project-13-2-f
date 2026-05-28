import React from "react";
import { ChipsButton, ChipsIcon } from "@chips/component-library";

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

export interface DetailFieldGroup {
  title: string;
  description?: string;
  fields: DetailField[];
}

interface SettingsDetailPageProps {
  title: string;
  description?: string;
  titleBadge?: React.ReactNode;
  backLabel: string;
  onBack: () => void;
  hero?: React.ReactNode;
  status?: React.ReactNode;
  primaryActions?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  fields?: DetailField[];
  fieldGroups?: DetailFieldGroup[];
  children?: React.ReactNode;
}

export function SettingsDetailPage({
  title,
  description,
  titleBadge,
  backLabel,
  onBack,
  hero,
  status,
  primaryActions,
  secondaryActions,
  fields = [],
  fieldGroups,
  children,
}: SettingsDetailPageProps): React.ReactElement {
  const resolvedFieldGroups = fieldGroups ?? (fields.length > 0 ? [{ title: "", fields }] : []);

  return (
    <section className="settings-detail-page" aria-label={title}>
      <div className="settings-detail-page__toolbar">
        <ChipsButton className="settings-detail-page__back" onPress={onBack}>
          <span className="settings-detail-page__back-icon" aria-hidden="true">
            <ChipsIcon descriptor={{ name: "chevron_left", style: "rounded", decorative: true }} size={18} />
          </span>
          <span>{backLabel}</span>
        </ChipsButton>
      </div>
      <article className="settings-detail-card">
        <div className="settings-detail-card__header">
          {hero ? <div className="settings-detail-card__hero" aria-hidden="true">{hero}</div> : null}
          <div className="settings-detail-card__heading">
            <h2>
              <span className="settings-detail-card__title">
                <span>{title}</span>
                {titleBadge ? <span className="settings-detail-card__title-badge">{titleBadge}</span> : null}
              </span>
            </h2>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {status || primaryActions ? (
          <div className="settings-detail-card__summary">
            {status ? <div className="settings-detail-card__status">{status}</div> : null}
            {primaryActions ? <div className="settings-detail-card__actions">{primaryActions}</div> : null}
          </div>
        ) : null}
        {resolvedFieldGroups.length > 0 ? (
          <div className="settings-detail-groups">
            {resolvedFieldGroups.map((group) => (
              <section className="settings-detail-group" key={group.title || "default"}>
                {group.title || group.description ? (
                  <header className="settings-detail-group__header">
                    {group.title ? <h3>{group.title}</h3> : null}
                    {group.description ? <p>{group.description}</p> : null}
                  </header>
                ) : null}
                <dl className="settings-detail-field-list">
                  {group.fields.map((field) => (
                    <div key={field.label} className="settings-detail-field-list__item">
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        ) : null}
        {children ? (
          <div className="settings-detail-card__body">
            {children}
          </div>
        ) : null}
        {secondaryActions ? (
          <section className="settings-detail-card__secondary-actions">
            {secondaryActions}
          </section>
        ) : null}
      </article>
    </section>
  );
}
