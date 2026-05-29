import React from "react";
import { ChipsToast } from "@chips/component-library";

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
  closeButtonLabel?: string;
  onDismiss?: (item: FeedbackItem) => void;
}

export function NotificationStack({ ariaLabel, closeButtonLabel, items, onDismiss }: NotificationStackProps): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="settings-feedback-toast">
      <ChipsToast
        ariaLabel={ariaLabel}
        closeButtonLabel={closeButtonLabel}
        entries={items}
        placement="top-center"
        onDismiss={(item) => {
          onDismiss?.(item as FeedbackItem);
        }}
      />
    </div>
  );
}
