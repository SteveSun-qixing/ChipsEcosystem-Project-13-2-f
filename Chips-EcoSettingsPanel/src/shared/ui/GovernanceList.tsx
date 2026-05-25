import React from "react";
import { ChipsDataGrid } from "@chips/component-library";

interface GovernanceListColumn {
  id: string;
  label: string;
  width: string;
  align?: "start" | "end";
}

interface GovernanceListProps {
  ariaLabel: string;
  columns: GovernanceListColumn[];
  children: React.ReactNode;
}

interface GovernanceListRowProps {
  children: React.ReactNode;
}

interface GovernanceListCellProps {
  label: string;
  align?: "start" | "end";
  children: React.ReactNode;
}

function isGovernanceRow(element: React.ReactNode): element is React.ReactElement<GovernanceListRowProps> {
  return React.isValidElement(element) && element.type === GovernanceListRow;
}

function isGovernanceCell(element: React.ReactNode): element is React.ReactElement<GovernanceListCellProps> {
  return React.isValidElement(element) && element.type === GovernanceListCell;
}

export function GovernanceList({ ariaLabel, columns, children }: GovernanceListProps): React.ReactElement {
  const style = React.useMemo(() => {
    return {
      "--settings-governance-columns": columns.map((column) => column.width).join(" "),
    } as React.CSSProperties;
  }, [columns]);

  const dataGridColumns = React.useMemo(() => {
    return columns.map((column) => ({
      key: column.id,
      label: column.label,
      sortable: false,
    }));
  }, [columns]);

  const rows = React.useMemo(() => {
    return React.Children.toArray(children).map((rowElement, rowIndex) => {
      const rowChildren = isGovernanceRow(rowElement) ? rowElement.props.children : rowElement;
      const cells = React.Children.toArray(rowChildren);
      const row: Record<string, React.ReactNode> = {
        id: React.isValidElement(rowElement) && rowElement.key !== null ? String(rowElement.key) : String(rowIndex),
      };

      columns.forEach((column, columnIndex) => {
        const cell = cells[columnIndex];
        const label = isGovernanceCell(cell) ? cell.props.label : column.label;
        const align = isGovernanceCell(cell) ? cell.props.align ?? column.align : column.align;
        const content = isGovernanceCell(cell) ? cell.props.children : cell;
        row[column.id] = (
          <div
            className={`settings-governance-cell-content${align === "end" ? " settings-governance-cell-content--end" : ""}`}
            data-label={label}
          >
            {content}
          </div>
        );
      });

      return row;
    });
  }, [children, columns]);

  return (
    <ChipsDataGrid.Root
      className="settings-governance-list"
      ariaLabel={ariaLabel}
      columns={dataGridColumns}
      rows={rows}
      selectedRowIds={[]}
      onSelectedRowIdsChange={() => undefined}
      style={style}
    />
  );
}

export function GovernanceListRow({ children }: GovernanceListRowProps): React.ReactElement {
  return <>{children}</>;
}

export function GovernanceListCell({ label, align = "start", children }: GovernanceListCellProps): React.ReactElement {
  void label;
  void align;
  return <>{children}</>;
}
