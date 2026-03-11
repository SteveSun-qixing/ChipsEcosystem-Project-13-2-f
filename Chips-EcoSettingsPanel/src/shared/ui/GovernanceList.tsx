import React from "react";

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

export function GovernanceList({ ariaLabel, columns, children }: GovernanceListProps): React.ReactElement {
  const style = React.useMemo(() => {
    return {
      "--governance-list-columns": columns.map((column) => column.width).join(" "),
    } as React.CSSProperties;
  }, [columns]);

  return (
    <section className="governance-list" aria-label={ariaLabel} style={style}>
      <div className="governance-list__header" role="presentation">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`governance-list__header-cell${column.align === "end" ? " governance-list__header-cell--end" : ""}`}
          >
            {column.label}
          </div>
        ))}
      </div>
      <div className="governance-list__body">{children}</div>
    </section>
  );
}

export function GovernanceListRow({ children }: GovernanceListRowProps): React.ReactElement {
  return <div className="governance-list__row">{children}</div>;
}

export function GovernanceListCell({ label, align = "start", children }: GovernanceListCellProps): React.ReactElement {
  return (
    <div className={`governance-list__cell${align === "end" ? " governance-list__cell--end" : ""}`} data-label={label}>
      {children}
    </div>
  );
}
