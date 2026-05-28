import React from "react";

interface WindowFileDropOptions {
  onDropFiles: (files: File[]) => void | Promise<void>;
}

export function useWindowFileDrop({ onDropFiles }: WindowFileDropOptions): boolean {
  const [active, setActive] = React.useState(false);
  const dragDepthRef = React.useRef(0);

  React.useEffect(() => {
    function hasFiles(event: DragEvent): boolean {
      return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    function handleDragEnter(event: DragEvent): void {
      if (!hasFiles(event)) {
        return;
      }
      dragDepthRef.current += 1;
      setActive(true);
    }

    function handleDragOver(event: DragEvent): void {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }

    function handleDragLeave(event: DragEvent): void {
      if (!hasFiles(event)) {
        return;
      }
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setActive(false);
      }
    }

    function handleDrop(event: DragEvent): void {
      if (!hasFiles(event)) {
        return;
      }
      event.preventDefault();
      dragDepthRef.current = 0;
      setActive(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length > 0) {
        void onDropFiles(files);
      }
    }

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [onDropFiles]);

  return active;
}
