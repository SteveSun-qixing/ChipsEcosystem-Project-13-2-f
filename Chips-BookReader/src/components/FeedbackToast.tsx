import React from "react";
import type { ReaderFeedback } from "../utils/book-reader";

export interface FeedbackToastProps {
  feedback: ReaderFeedback | null;
}

export function FeedbackToast(props: FeedbackToastProps): React.ReactElement | null {
  const { feedback } = props;

  if (!feedback) {
    return null;
  }

  return (
    <div className={`book-reader-feedback book-reader-feedback--${feedback.tone}`} role="status" aria-live="polite">
      <span>{feedback.message}</span>
    </div>
  );
}
