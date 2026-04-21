import React, { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";

export interface SourcePanelProps {
  initialUrl: string;
  onOpenFile: () => void | Promise<void>;
  onOpenUrl: (url: string) => void | Promise<void>;
  onClose: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function SourcePanel(props: SourcePanelProps): React.ReactElement {
  const { initialUrl, onOpenFile, onOpenUrl, onClose, t } = props;
  const [value, setValue] = useState(initialUrl);

  useEffect(() => {
    setValue(initialUrl);
  }, [initialUrl]);

  return (
    <PanelShell
      title={t("book-reader.labels.importBook")}
      eyebrow={t("book-reader.labels.appName")}
      onClose={onClose}
      className="book-reader-panel--source"
      variant="dialog"
      t={t}
    >
      <div className="book-reader-source">
        <p className="book-reader-source__copy">{t("book-reader.empty.description")}</p>
        <button type="button" className="book-reader-primaryButton" onClick={() => void onOpenFile()}>
          {t("book-reader.actions.openFile")}
        </button>
        <form
          className="book-reader-sourceForm"
          onSubmit={(event) => {
            event.preventDefault();
            void onOpenUrl(value.trim());
          }}
        >
          <label className="book-reader-sourceForm__label" htmlFor="book-reader-source-url">
            {t("book-reader.actions.openUrl")}
          </label>
          <input
            id="book-reader-source-url"
            type="url"
            value={value}
            placeholder={t("book-reader.placeholders.remoteUrl")}
            onChange={(event) => setValue(event.target.value)}
          />
          <button type="submit" className="book-reader-secondaryButton">
            {t("book-reader.actions.openUrl")}
          </button>
        </form>
        <p className="book-reader-source__supported">{t("book-reader.empty.supportedFormat")}</p>
      </div>
    </PanelShell>
  );
}
