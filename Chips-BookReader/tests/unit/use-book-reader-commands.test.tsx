// @vitest-environment jsdom

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockChipsClient, type MockChipsClient } from "chips-sdk";
import {
  BOOK_READER_COMMAND_IDS,
  bookReaderCommandDefinitions,
  type BookReaderCommandStatus,
} from "../../src/commands/book-reader-commands";
import { useBookReaderCommands, type UseBookReaderCommandsResult } from "../../src/commands/useBookReaderCommands";
import type { ReaderPreferences } from "../../src/utils/book-reader";

const COMMAND_PERMISSIONS = ["command.read", "command.write", "command.invoke", "file.read", "network.request", "config.read", "config.write"];

const runtimeState = {
  hasBook: true,
  activePanel: null,
  hasCurrentBookmark: false,
  readingMode: "paginated" as ReaderPreferences["readingMode"],
  isBusy: false,
  canPreviousSection: true,
  canNextSection: true,
};

async function flushReact(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("useBookReaderCommands", () => {
  let container: HTMLDivElement;
  let root: Root;
  const clients: MockChipsClient[] = [];

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await React.act(async () => {
      root.unmount();
      await flushReact();
    });
    container.remove();
    for (const client of clients.splice(0)) {
      client.restoreBridge();
    }
    vi.clearAllMocks();
  });

  function createClient(): MockChipsClient {
    const client = createMockChipsClient({
      permissions: COMMAND_PERMISSIONS,
    });
    clients.push(client);
    return client;
  }

  it("registers commands, invokes through Host registry, and dispatches local handler by handlerId", async () => {
    const client = createClient();
    const handler = vi.fn<(status: BookReaderCommandStatus) => void>();
    let latest: UseBookReaderCommandsResult | null = null;

    function Harness() {
      latest = useBookReaderCommands({
        client,
        invocationContext: {
          pluginId: "com.chips.book-reader",
          sceneId: "reader-scene",
          surfaceId: "reader-surface",
          documentId: "demo-book",
        },
        runtimeState,
      });

      React.useEffect(() => {
        return latest?.registerHandler("book-reader:source.open-url", handler);
      }, []);

      return null;
    }

    await React.act(async () => {
      root.render(<Harness />);
      await flushReact();
    });

    expect(latest?.phase).toBe("ready");
    expect(client.state.commands).toHaveLength(bookReaderCommandDefinitions.length);

    await React.act(async () => {
      await latest?.invokeCommand(BOOK_READER_COMMAND_IDS.openUrl, "palette", { url: "https://example.com/book.epub" });
      await flushReact();
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        commandId: BOOK_READER_COMMAND_IDS.openUrl,
        handlerId: "book-reader:source.open-url",
        source: "palette",
        payload: { url: "https://example.com/book.epub" },
        context: expect.objectContaining({
          pluginId: "com.chips.book-reader",
          sceneId: "reader-scene",
          surfaceId: "reader-surface",
          documentId: "demo-book",
        }),
      }),
    );
    expect(client.calls.map((call) => call.action)).toEqual(
      expect.arrayContaining(["command.register", "command.invoke", "command.setState"]),
    );
  });

  it("falls back to local dispatch when no Host client is available", async () => {
    const handler = vi.fn<(status: BookReaderCommandStatus) => void>();
    let latest: UseBookReaderCommandsResult | null = null;

    function Harness() {
      latest = useBookReaderCommands({
        runtimeState,
        invocationContext: { pluginId: "com.chips.book-reader" },
      });

      React.useEffect(() => {
        return latest?.registerHandler("book-reader:view.toggle-contents", handler);
      }, []);

      return null;
    }

    await React.act(async () => {
      root.render(<Harness />);
      await flushReact();
    });

    await React.act(async () => {
      await latest?.invokeCommand(BOOK_READER_COMMAND_IDS.toggleContents, "toolbar");
      await flushReact();
    });

    expect(latest?.phase).toBe("ready");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        commandId: BOOK_READER_COMMAND_IDS.toggleContents,
        handlerId: "book-reader:view.toggle-contents",
        source: "toolbar",
      }),
    );
  });
});
