import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createKeyboardMap,
  createRovingTabIndex,
  getKeyboardAction,
  getRovingTabIndexProps,
} from "@chips/a11y";
import type { EpubNavigationItem } from "../domain/epub/types";

export interface NavigationTreeProps {
  items: EpubNavigationItem[];
  currentSectionIndex: number;
  onSelectSection: (sectionIndex: number, fragment?: string) => void;
}

interface NavigationRow {
  id: string;
  item: EpubNavigationItem;
  level: number;
  disabled: boolean;
}

const NAVIGATION_TREE_KEYBOARD_MAP = createKeyboardMap({
  activate: ["Enter", " "],
  next: "ArrowDown",
  previous: "ArrowUp",
  first: "Home",
  last: "End",
});

function flattenNavigationItems(items: EpubNavigationItem[], level = 1): NavigationRow[] {
  return items.flatMap((item) => [
    {
      id: item.id,
      item,
      level,
      disabled: typeof item.sectionIndex !== "number",
    },
    ...flattenNavigationItems(item.children, level + 1),
  ]);
}

function createNavigationDomId(id: string): string {
  return `book-reader-nav-item-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function NavigationTree(props: NavigationTreeProps): React.ReactElement {
  const { items, currentSectionIndex, onSelectSection } = props;
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const rows = useMemo(() => flattenNavigationItems(items), [items]);
  const selectedRow = rows.find((row) => row.item.sectionIndex === currentSectionIndex && !row.disabled) ?? null;
  const [activeId, setActiveId] = useState<string | null>(selectedRow?.id ?? null);
  const roving = useMemo(
    () => createRovingTabIndex(rows, {
      activeId: activeId ?? selectedRow?.id,
      selectedId: selectedRow?.id,
      orientation: "vertical",
      loop: false,
    }),
    [activeId, rows, selectedRow?.id],
  );

  useEffect(() => {
    setActiveId(selectedRow?.id ?? null);
  }, [selectedRow?.id]);

  function focusRow(rowId: string): void {
    buttonRefs.current.get(rowId)?.focus();
  }

  if (rows.length === 0) {
    return <div role="tree" className="book-reader-nav__tree" />;
  }

  return (
    <div role="tree" className="book-reader-nav__tree">
      {roving.items.map((rovingItem) => {
        const row = rovingItem.item;
        const { item } = row;
        const isSelected = item.sectionIndex === currentSectionIndex;
        const hasChildren = item.children.length > 0;
        const tabIndexProps = getRovingTabIndexProps(rovingItem);

        return (
          <div
            key={item.id}
            className="book-reader-nav__branch"
            style={{ marginLeft: `${(row.level - 1) * 14}px` }}
          >
            <button
              ref={(element) => {
                if (element) {
                  buttonRefs.current.set(row.id, element);
                } else {
                  buttonRefs.current.delete(row.id);
                }
              }}
              id={createNavigationDomId(row.id)}
              type="button"
              role="treeitem"
              aria-level={row.level}
              aria-selected={isSelected}
              aria-current={isSelected ? "true" : undefined}
              aria-expanded={hasChildren ? true : undefined}
              aria-disabled={row.disabled ? "true" : undefined}
              className={`book-reader-nav__item${isSelected ? " book-reader-nav__item--active" : ""}`}
              disabled={row.disabled}
              tabIndex={tabIndexProps.tabIndex}
              data-active={tabIndexProps["data-active"]}
              onClick={() => {
                if (typeof item.sectionIndex === "number") {
                  onSelectSection(item.sectionIndex, item.fragment);
                }
              }}
              onKeyDown={(event) => {
                const nextIndex = roving.getIndexByKey(event.nativeEvent, {
                  keyboardMap: NAVIGATION_TREE_KEYBOARD_MAP,
                  orientation: "vertical",
                  loop: false,
                });
                if (nextIndex >= 0) {
                  event.preventDefault();
                  const nextRow = roving.items[nextIndex]?.item;
                  if (nextRow) {
                    setActiveId(nextRow.id);
                    focusRow(nextRow.id);
                  }
                  return;
                }

                if (getKeyboardAction(event.nativeEvent, NAVIGATION_TREE_KEYBOARD_MAP) === "activate") {
                  event.preventDefault();
                  if (typeof item.sectionIndex === "number") {
                    onSelectSection(item.sectionIndex, item.fragment);
                  }
                }
              }}
            >
              <span>{item.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
