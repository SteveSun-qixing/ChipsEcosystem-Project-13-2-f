import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  BOOK_READER_COMMAND_IDS,
  bookReaderCommandDefinitions,
  createBookReaderCommandViews,
} from "../../src/commands/book-reader-commands";
import { formatMessage } from "../../src/i18n/messages";

const FORBIDDEN_RAW_TEXT_FIELDS = ["title", "description", "label", "ariaLabel"] as const;

function readManifest(): { permissions?: string[] } {
  return parse(readFileSync(resolve(__dirname, "../../manifest.yaml"), "utf-8")) as {
    permissions?: string[];
  };
}

describe("BookReader commands", () => {
  it("defines serializable command metadata without raw display text", () => {
    expect(bookReaderCommandDefinitions.length).toBeGreaterThan(12);

    for (const definition of bookReaderCommandDefinitions) {
      expect(definition.commandId).toMatch(/^com\.chips\.book-reader\./);
      expect(definition.titleKey).toMatch(/^book-reader\.commands\./);
      expect(definition.handlerId).toBeTypeOf("string");
      expect(definition.scope).toEqual({ kind: "app", appId: "com.chips.book-reader" });

      for (const field of FORBIDDEN_RAW_TEXT_FIELDS) {
        expect(definition).not.toHaveProperty(field);
      }
    }
  });

  it("declares the Host command permissions required by registration and invocation", () => {
    const manifest = readManifest();

    expect(manifest.permissions).toEqual(
      expect.arrayContaining(["command.read", "command.write", "command.invoke"]),
    );
  });

  it("resolves dynamic state for panels, bookmarks, sections and reading mode", () => {
    const views = createBookReaderCommandViews({
      hasBook: true,
      activePanel: "contents",
      hasCurrentBookmark: true,
      readingMode: "scroll",
      isBusy: false,
      canPreviousSection: false,
      canNextSection: true,
    });
    const byId = new Map(views.map((view) => [view.commandId, view]));

    expect(byId.get(BOOK_READER_COMMAND_IDS.toggleContents)?.state?.checked).toBe(true);
    expect(byId.get(BOOK_READER_COMMAND_IDS.toggleBookmark)?.state?.checked).toBe(true);
    expect(byId.get(BOOK_READER_COMMAND_IDS.previousSection)?.state?.enabled).toBe(false);
    expect(byId.get(BOOK_READER_COMMAND_IDS.nextSection)?.state?.enabled).toBe(true);
    expect(byId.get(BOOK_READER_COMMAND_IDS.readingModeScroll)?.state?.checked).toBe(true);
    expect(byId.get(BOOK_READER_COMMAND_IDS.readingModePaginated)?.state?.checked).toBe(false);
  });

  it("has local i18n text for every command key", () => {
    for (const definition of bookReaderCommandDefinitions) {
      expect(formatMessage("zh-CN", definition.titleKey)).not.toBe(`[[${definition.titleKey}]]`);
      expect(formatMessage("en-US", definition.titleKey)).not.toBe(`[[${definition.titleKey}]]`);
      if (definition.descriptionKey) {
        expect(formatMessage("zh-CN", definition.descriptionKey)).not.toBe(`[[${definition.descriptionKey}]]`);
        expect(formatMessage("en-US", definition.descriptionKey)).not.toBe(`[[${definition.descriptionKey}]]`);
      }
      if (definition.ariaLabelKey) {
        expect(formatMessage("zh-CN", definition.ariaLabelKey)).not.toBe(`[[${definition.ariaLabelKey}]]`);
        expect(formatMessage("en-US", definition.ariaLabelKey)).not.toBe(`[[${definition.ariaLabelKey}]]`);
      }
    }
  });
});
