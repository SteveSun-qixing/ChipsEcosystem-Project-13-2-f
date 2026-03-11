import React from "react";
import { ChipsNotification } from "@chips/component-library";

export interface FeedbackItem {
  id: string;
  tone: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  durationMs?: number;
  [key: string]: unknown;
}

interface NotificationStackProps {
  ariaLabel: string;
  items: FeedbackItem[];
  onDismiss?: (item: FeedbackItem) => void;
}

export function NotificationStack({ ariaLabel, items, onDismiss }: NotificationStackProps): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <ChipsNotification
      ariaLabel={ariaLabel}
      items={items}
      onDismiss={(item) => {
        onDismiss?.(item as FeedbackItem);
      }}
    />
  );
}
