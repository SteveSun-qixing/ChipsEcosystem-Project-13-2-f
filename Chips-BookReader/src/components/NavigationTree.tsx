import React from "react";
import type { EpubNavigationItem } from "../domain/epub/types";

export interface NavigationTreeProps {
  items: EpubNavigationItem[];
  currentSectionIndex: number;
  onSelectSection: (sectionIndex: number, fragment?: string) => void;
}

export function NavigationTree(props: NavigationTreeProps): React.ReactElement {
  const { items, currentSectionIndex, onSelectSection } = props;

  return (
    <>
      {items.map((item) => {
        const isActive = item.sectionIndex === currentSectionIndex;
        const isSelectable = typeof item.sectionIndex === "number";

        return (
          <div key={item.id} className="book-reader-nav__branch">
            <button
              type="button"
              className={`book-reader-nav__item${isActive ? " book-reader-nav__item--active" : ""}`}
              disabled={!isSelectable}
              onClick={() => {
                if (typeof item.sectionIndex === "number") {
                  onSelectSection(item.sectionIndex, item.fragment);
                }
              }}
            >
              <span>{item.label}</span>
            </button>
            {item.children.length > 0 ? (
              <div className="book-reader-nav__children">
                <NavigationTree
                  items={item.children}
                  currentSectionIndex={currentSectionIndex}
                  onSelectSection={onSelectSection}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
