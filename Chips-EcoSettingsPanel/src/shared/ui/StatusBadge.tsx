import React from "react";
import { ChipsBadge } from "@chips/component-library";

interface StatusBadgeProps {
  tone: "neutral" | "positive" | "attention" | "danger";
  label: string;
}

const BADGE_TONE_MAP = {
  neutral: "neutral",
  positive: "success",
  attention: "warning",
  danger: "error",
} as const;

export function StatusBadge({ tone, label }: StatusBadgeProps): React.ReactElement {
  return (
    <ChipsBadge
      className="settings-status-badge"
      tone={BADGE_TONE_MAP[tone]}
      label={label}
    />
  );
}
