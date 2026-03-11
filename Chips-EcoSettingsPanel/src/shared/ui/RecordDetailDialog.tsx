import React from "react";
import { ChipsDialog } from "@chips/component-library";
import { useI18n } from "../../app/providers/I18nProvider";

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface RecordDetailDialogProps {
  triggerLabel: string;
  title: string;
  description: string;
  fields: DetailField[];
}

export function RecordDetailDialog({
  triggerLabel,
  title,
  description,
  fields,
}: RecordDetailDialogProps): React.ReactElement {
  const { t } = useI18n();

  return (
    <ChipsDialog
      triggerContent={triggerLabel}
      title={title}
      description={description}
      closeButtonLabel={t("settingsPanel.common.close")}
    >
      <dl className="detail-field-list">
        {fields.map((field) => (
          <div key={field.label} className="detail-field-list__item">
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </ChipsDialog>
  );
}
