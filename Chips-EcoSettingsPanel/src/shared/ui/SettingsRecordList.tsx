import React from "react";
import { ChipsButton, ChipsDataGrid } from "@chips/component-library";

interface SettingsRecordListProps {
  ariaLabel: string;
  children: React.ReactNode;
}

interface SettingsRecordItemProps {
  id: string;
  icon?: React.ReactNode;
  title: React.ReactNode;
  summary?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  detailLabel: string;
  onOpenDetail: () => void;
}

export function SettingsRecordList({ ariaLabel, children }: SettingsRecordListProps): React.ReactElement {
  return (
    <ChipsDataGrid.Root
      className="settings-record-list settings-governance-list"
      ariaLabel={ariaLabel}
      selectedRowIds={[]}
      onSelectedRowIdsChange={() => undefined}
    >
      <div className="settings-record-list__body" role="rowgroup">
        {children}
      </div>
    </ChipsDataGrid.Root>
  );
}

export function SettingsRecordItem({
  id,
  icon,
  title,
  summary,
  meta,
  status,
  actions,
  detailLabel,
  onOpenDetail,
}: SettingsRecordItemProps): React.ReactElement {
  return (
    <ChipsDataGrid.Row className="settings-record-row" rowId={id}>
      <ChipsDataGrid.Cell columnKey="record">
        <div className="settings-record-main">
          {icon ? <div className="settings-record-main__icon" aria-hidden="true">{icon}</div> : null}
          <div className="settings-record-main__content">
            <div className="settings-record-main__title">{title}</div>
            {summary ? <div className="settings-record-main__summary">{summary}</div> : null}
          </div>
        </div>
      </ChipsDataGrid.Cell>
      <ChipsDataGrid.Cell columnKey="status">
        <div className="settings-record-status">{status}</div>
      </ChipsDataGrid.Cell>
      <ChipsDataGrid.Cell columnKey="meta">
        <div className="settings-record-meta">{meta}</div>
      </ChipsDataGrid.Cell>
      <ChipsDataGrid.Cell columnKey="actions">
        <div className="settings-record-actions">
          {actions}
          <ChipsButton onPress={onOpenDetail}>{detailLabel}</ChipsButton>
        </div>
      </ChipsDataGrid.Cell>
    </ChipsDataGrid.Row>
  );
}
