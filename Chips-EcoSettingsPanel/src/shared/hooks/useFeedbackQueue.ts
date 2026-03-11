import React from "react";
import type { FeedbackItem } from "../ui/NotificationStack";

let feedbackSequence = 0;

function createFeedbackId(): string {
  feedbackSequence += 1;
  return `feedback-${feedbackSequence}`;
}

export function useFeedbackQueue() {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);

  const push = React.useCallback((item: Omit<FeedbackItem, "id">) => {
    setItems((current) => [
      ...current,
      {
        ...item,
        id: createFeedbackId(),
      } as FeedbackItem,
    ]);
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    push,
    remove,
    clear,
  };
}
