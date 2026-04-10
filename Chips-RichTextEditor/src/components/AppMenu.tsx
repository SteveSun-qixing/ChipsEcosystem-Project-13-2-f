import React from "react";
import { ChipsIcon } from "@chips/component-library";

export type AppMenuAction = "new" | "open" | "save" | "save-as" | "info";

export interface AppMenuSection {
  id: string;
  title: string;
  items: Array<{
    action: AppMenuAction;
    label: string;
    iconName: string;
    disabled?: boolean;
  }>;
}

interface AppMenuProps {
  open: boolean;
  buttonLabel: string;
  sections: AppMenuSection[];
  onToggle: () => void;
  onAction: (action: AppMenuAction) => void;
}

export const AppMenu = React.forwardRef<HTMLDivElement, AppMenuProps>(function AppMenu(
  {
    open,
    buttonLabel,
    sections,
    onToggle,
    onAction,
  },
  ref,
): React.ReactElement {
  return (
    <div ref={ref} className="rte-app-menu">
      <button
        type="button"
        className="rte-app-menu__button"
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="rte-sr-only">{buttonLabel}</span>
        <ChipsIcon descriptor={{ name: "menu", decorative: true }} size={20} />
      </button>

      {open ? (
        <div className="rte-app-menu__panel" role="menu" aria-label={buttonLabel}>
          {sections.map((section) => (
            <section key={section.id} className="rte-app-menu__section">
              <h2 className="rte-app-menu__title">{section.title}</h2>
              <div className="rte-app-menu__items">
                {section.items.map((item) => (
                  <button
                    key={item.action}
                    type="button"
                    role="menuitem"
                    className="rte-app-menu__item"
                    disabled={item.disabled}
                    onClick={() => onAction(item.action)}
                  >
                    <span className="rte-app-menu__item-icon" aria-hidden="true">
                      <ChipsIcon descriptor={{ name: item.iconName, decorative: true }} size={18} />
                    </span>
                    <span className="rte-app-menu__item-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
});
