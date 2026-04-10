import React, { useEffect, useId, useRef } from "react";
import { ChipsIcon } from "@chips/component-library";

export interface InfoDialogSection {
  id: string;
  title: string;
  fields: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}

interface InfoDialogProps {
  open: boolean;
  title: string;
  description: string;
  closeLabel: string;
  sections: InfoDialogSection[];
  onClose: () => void;
}

export function InfoDialog({
  open,
  title,
  description,
  closeLabel,
  sections,
  onClose,
}: InfoDialogProps): React.ReactElement | null {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="rte-info-dialog__backdrop" onClick={onClose}>
      <section
        className="rte-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rte-info-dialog__header">
          <div>
            <h2 id={titleId} className="rte-info-dialog__title">{title}</h2>
            <p id={descriptionId} className="rte-info-dialog__description">{description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="rte-info-dialog__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <span className="rte-sr-only">{closeLabel}</span>
            <ChipsIcon descriptor={{ name: "close", decorative: true }} size={20} />
          </button>
        </header>

        <div className="rte-info-dialog__body">
          {sections.map((section) => (
            <section key={section.id} className="rte-info-dialog__section">
              <h3 className="rte-info-dialog__section-title">{section.title}</h3>
              <dl className="rte-info-dialog__list">
                {section.fields.map((field) => (
                  <React.Fragment key={`${section.id}-${field.label}`}>
                    <dt className="rte-info-dialog__term">{field.label}</dt>
                    <dd className="rte-info-dialog__description-value">{field.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
