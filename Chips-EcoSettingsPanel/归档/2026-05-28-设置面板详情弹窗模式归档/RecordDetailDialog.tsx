import React from "react";
import { ChipsBox, ChipsDialog } from "@chips/component-library";
import { useI18n } from "../../src/app/providers/I18nProvider";

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
      <ChipsBox
        as="dl"
        className="settings-detail-field-list"
      >
        {fields.map((field) => (
          <div key={field.label} className="settings-detail-field-list__item">
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </ChipsBox>
    </ChipsDialog>
  );
}
