import React from "react";

export interface ViewerStageProps {
  iframeRef: React.Ref<HTMLIFrameElement>;
  title: string;
  isLoading: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ViewerStage(props: ViewerStageProps): React.ReactElement {
  const { iframeRef, title, isLoading, onClick, children, t } = props;

  return (
    <div className="book-reader-viewer">
      <div className="book-reader-frameHost" onClick={onClick}>
        <iframe ref={iframeRef} title={title} className="book-reader-frame" />
      </div>
      {isLoading ? (
        <div className="book-reader-overlay" aria-live="polite">
          <div className="book-reader-overlay__badge">{t("book-reader.status.loading")}</div>
        </div>
      ) : null}
      {children}
    </div>
  );
}
