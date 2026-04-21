import React from "react";
import type { IconDescriptor } from "chips-sdk";
import { ControlButton } from "./ControlButton";

const CLOSE_ICON = { name: "close", decorative: true } satisfies IconDescriptor;

export interface PanelShellProps {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "drawer" | "dialog";
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function PanelShell(props: PanelShellProps): React.ReactElement {
  const {
    title,
    eyebrow,
    onClose,
    children,
    className,
    variant = "drawer",
    t,
  } = props;

  return (
    <div className="book-reader-panelLayer" data-state="open" onClick={onClose}>
      <section
        className={[
          "book-reader-panel",
          variant === "drawer" ? "book-reader-panel--drawer" : "book-reader-panel--dialog",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="book-reader-panel__header">
          <div className="book-reader-panel__copy">
            {eyebrow ? <p className="book-reader-panel__eyebrow">{eyebrow}</p> : null}
            <h2>{title}</h2>
          </div>
          <ControlButton
            label={t("book-reader.actions.closePanel")}
            icon={CLOSE_ICON}
            onClick={onClose}
            variant="close"
          />
        </header>
        <div className="book-reader-panel__body">{children}</div>
      </section>
    </div>
  );
}
