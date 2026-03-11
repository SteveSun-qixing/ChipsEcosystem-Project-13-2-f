import React from "react";

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
    <div
      className={`drop-zone${active ? " drop-zone--active" : ""}${disabled ? " drop-zone--disabled" : ""}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="drop-zone__title">{title}</div>
      <div className="drop-zone__description">{description}</div>
    </div>
  );
}
