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

function resolveColumnWidth(column: GovernanceListColumn): string {
  const width = column.width.trim();
  if (width !== "auto") {
    return width;
  }

  if (column.align === "end") {
    return "minmax(var(--settings-governance-action-column-min, 188px), var(--settings-governance-action-column-max, 260px))";
  }

  return "minmax(0, max-content)";
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
      "--settings-governance-columns": columns.map(resolveColumnWidth).join(" "),
    } as React.CSSProperties;
  }, [columns]);

  const rows = React.useMemo(() => {
    return React.Children.toArray(children).map((rowElement, rowIndex) => {
      const rowChildren = isGovernanceRow(rowElement) ? rowElement.props.children : rowElement;
      const cells = React.Children.toArray(rowChildren);
      const row: {
        id: string;
        cells: Array<{
          columnId: string;
          label: string;
          align?: "start" | "end";
          content: React.ReactNode;
        }>;
      } = {
        id: React.isValidElement(rowElement) && rowElement.key !== null ? String(rowElement.key) : String(rowIndex),
        cells: [],
      };

      columns.forEach((column, columnIndex) => {
        const cell = cells[columnIndex];
        const label = isGovernanceCell(cell) ? cell.props.label : column.label;
        const align = isGovernanceCell(cell) ? cell.props.align ?? column.align : column.align;
        const content = isGovernanceCell(cell) ? cell.props.children : cell;
        row.cells.push({
          columnId: column.id,
          label,
          align,
          content,
        });
      });

      return row;
    });
  }, [children, columns]);

  return (
    <ChipsDataGrid.Root
      className="settings-governance-list"
      ariaLabel={ariaLabel}
      selectedRowIds={[]}
      onSelectedRowIdsChange={() => undefined}
      style={style}
    >
      <ChipsDataGrid.Header key="header" className="settings-governance-list__header">
        {columns.map((column) => (
          <ChipsDataGrid.Cell key={column.id} columnKey={column.id} header sortable={false}>
            <span className="settings-governance-header-label">{column.label}</span>
          </ChipsDataGrid.Cell>
        ))}
      </ChipsDataGrid.Header>
      <div key="body" className="settings-governance-list__body" role="rowgroup">
        {rows.map((row) => (
          <ChipsDataGrid.Row key={row.id} rowId={row.id}>
            {row.cells.map((cell) => (
              <ChipsDataGrid.Cell key={`${row.id}:${cell.columnId}`} columnKey={cell.columnId}>
                <div
                  className={`settings-governance-cell-content${cell.align === "end" ? " settings-governance-cell-content--end" : ""}`}
                  data-label={cell.label}
                >
                  {cell.content}
                </div>
              </ChipsDataGrid.Cell>
            ))}
          </ChipsDataGrid.Row>
        ))}
      </div>
    </ChipsDataGrid.Root>
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
