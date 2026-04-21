// @vitest-environment jsdom

import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useBookmarks, type Bookmark, type UseBookmarksReturn } from "../../src/hooks/useBookmarks";

describe("useBookmarks", () => {
  let container: HTMLDivElement;
  let root: Root;
  let hookValue: UseBookmarksReturn | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    hookValue = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("会读取持久化书签，并在增删后写回 config 服务", async () => {
    const stored: Bookmark[] = [
      {
        id: "bookmark-existing",
        sectionIndex: 0,
        sectionTitle: "第一章",
        spreadIndex: 1,
        scrollFraction: 0.33,
        readingMode: "paginated",
        createdAt: 1,
      },
    ];
    const get = vi.fn(async (_key: string) => stored);
    const set = vi.fn(async (_key: string, _value: unknown) => undefined);

    function Harness(): React.ReactElement | null {
      hookValue = useBookmarks({
        bookSourceId: "book-1",
        configClient: {
          get: async <T = unknown>(key: string) => (await get(key)) as T,
          set: async <T = unknown>(key: string, value: T) => {
            await set(key, value);
          },
        },
      });
      return null;
    }

    await act(async () => {
      root.render(<Harness />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(hookValue?.bookmarks).toHaveLength(1);

    await act(async () => {
      hookValue?.addBookmark({
        sectionIndex: 1,
        sectionTitle: "第二章",
        spreadIndex: 0,
        scrollFraction: 0.5,
        readingMode: "scroll",
      });
    });

    expect(hookValue?.bookmarks).toHaveLength(2);
    expect(set).toHaveBeenCalledTimes(1);
    expect(
      hookValue?.hasBookmarkAtPosition({
        sectionIndex: 1,
        readingMode: "scroll",
        spreadIndex: 0,
        scrollFraction: 0.5,
      }),
    ).toBe(true);

    const addedBookmark = hookValue?.bookmarks.find((bookmark) => bookmark.sectionIndex === 1);
    expect(addedBookmark).toBeTruthy();

    await act(async () => {
      hookValue?.removeBookmark(addedBookmark!.id);
    });

    expect(hookValue?.bookmarks).toHaveLength(1);
    expect(set).toHaveBeenCalledTimes(2);
  });
});
