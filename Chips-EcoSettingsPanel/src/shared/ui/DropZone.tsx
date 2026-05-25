import React from "react";
import { ChipsBox, ChipsStack, ChipsText } from "@chips/component-library";

interface DropZoneProps {
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onDropFiles: (files: File[]) => void;
}

export function DropZone({ title, description, active, disabled = false, onDropFiles }: DropZoneProps): React.ReactElement {
  const handleDragOver = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
  }, [disabled]);

  const handleDrop = React.useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      onDropFiles(files);
    }
  }, [disabled, onDropFiles]);

  return (
    <ChipsBox
      className="settings-drop-zone"
      active={active}
      disabled={disabled}
      padding="var(--chips-layout-gap-md, 18px)"
      radius="var(--chips-sys-radius-container, 16px)"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ChipsStack gap="var(--chips-layout-gap-xs, 8px)" align="stretch">
        <ChipsText as="strong" text={title} emphasis="strong" />
        <ChipsText as="span" text={description} tone="muted" />
      </ChipsStack>
    </ChipsBox>
  );
}
