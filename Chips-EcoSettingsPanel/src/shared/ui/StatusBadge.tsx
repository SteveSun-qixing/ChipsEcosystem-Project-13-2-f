import React from "react";

interface StatusBadgeProps {
  tone: "neutral" | "positive" | "attention" | "danger";
  label: string;
}

export function StatusBadge({ tone, label }: StatusBadgeProps): React.ReactElement {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
