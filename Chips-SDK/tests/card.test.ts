import { describe, it, expect, vi } from "vitest";
import { createCardApi } from "../src/api/card";
import type { CoreClient } from "../src/types/client";
import { createError } from "../src/types/errors";

type MockIframeElement = HTMLIFrameElement & {
  attrs: Record<string, string>;
  trigger: (type: string) => void;
};

function createStubClient(invokeImpl: CoreClient["invoke"]): CoreClient {
  return {
    clientConfig: {},
    invoke: invokeImpl,
    events: {
      on: () => () => {},
      once: () => {},
      emit: async () => {},
    },
  };
}

function createMockIframe(overrides: Record<string, unknown> = {}): MockIframeElement {
  const listeners = new Map<string, Array<() => void>>();
  const frame: any = {
    tagName: "IFRAME",
    attrs: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
    isConnected: true,
    setAttribute(name: string, value: string) {
      this.attrs[name] = value;
    },
    addEventListener(type: string, listener: () => void) {
      const handlers = listeners.get(type) ?? [];
      handlers.push(listener);
      listeners.set(type, handlers);
    },
    removeEventListener(type: string, listener: () => void) {
      const handlers = listeners.get(type);
      if (!handlers) {
        return;
      }
      const index = handlers.indexOf(listener);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    },
    trigger(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) {
        listener();
      }
    },
  };

  return Object.assign(frame, overrides) as MockIframeElement;
}

describe("CardApi", () => {
  it("passes card pack options into card.pack and unwraps cardFile", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return { cardFile: "/tmp/output.card" } as any;
      }),
    );

    await expect(api.pack("/tmp/card-dir", "/tmp/output.card")).resolves.toBe("/tmp/output.card");
    expect(calls[0]?.action).toBe("card.pack");
    expect(calls[0]?.payload).toEqual({
      cardDir: "/tmp/card-dir",
      outputPath: "/tmp/output.card",
    });
  });

  it("passes card metadata requests into card.readMetadata and unwraps metadata", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          metadata: {
            name: "Demo Card",
          },
        } as any;
      }),
    );

    await expect(api.readMetadata("/tmp/demo.card")).resolves.toEqual({
      name: "Demo Card",
    });
    expect(calls[0]?.action).toBe("card.readMetadata");
    expect(calls[0]?.payload).toEqual({
      cardFile: "/tmp/demo.card",
    });
  });

  it("passes card info requests into card.readInfo and unwraps info", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          info: {
            cardFile: "/tmp/demo.card",
            info: {
              status: {
                state: "ready",
                exists: true,
                valid: true,
              },
            },
          },
        } as any;
      }),
    );

    await expect(api.readInfo("/tmp/demo.card", ["status"])).resolves.toEqual({
      cardFile: "/tmp/demo.card",
      info: {
        status: {
          state: "ready",
          exists: true,
          valid: true,
        },
      },
    });
    expect(calls[0]?.action).toBe("card.readInfo");
    expect(calls[0]?.payload).toEqual({
      cardFile: "/tmp/demo.card",
      fields: ["status"],
    });
  });

  it("passes card open requests into card.open and unwraps result", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          result: {
            mode: "card-window",
            windowId: "window-1",
          },
        } as any;
      }),
    );

    await expect(api.open("/tmp/demo.card")).resolves.toEqual({
      mode: "card-window",
      windowId: "window-1",
    });
    expect(calls[0]?.action).toBe("card.open");
    expect(calls[0]?.payload).toEqual({
      cardFile: "/tmp/demo.card",
    });
  });

  it("passes unpack requests into card.unpack", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return { outputDir: "/tmp/unpacked" } as any;
      }),
    );

    await expect(api.unpack("/tmp/demo.card", "/tmp/unpacked")).resolves.toBeUndefined();
    expect(calls[0]?.action).toBe("card.unpack");
    expect(calls[0]?.payload).toEqual({
      cardFile: "/tmp/demo.card",
      outputDir: "/tmp/unpacked",
    });
  });

  it("throws on empty cardFile for render", async () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    await expect(api.render("", {})).rejects.toMatchObject<ReturnType<typeof createError>>({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects invalid compositeWindow mode", async () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    // @ts-expect-error intentional invalid mode for runtime check
    await expect(api.compositeWindow.render({ cardFile: "/test.card", mode: "edit" })).rejects.toMatchObject<
      ReturnType<typeof createError>
    >({
      code: "INVALID_ARGUMENT",
    });
  });

  it("rejects invalid compositeWindow interactionPolicy", async () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    await expect(
      // @ts-expect-error intentional invalid interactionPolicy for runtime check
      api.compositeWindow.render({ cardFile: "/test.card", interactionPolicy: "invalid" }),
    ).rejects.toMatchObject<ReturnType<typeof createError>>({
      code: "INVALID_ARGUMENT",
    });
  });

  it("passes mode into card.render options for compositeWindow.render", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Test Card",
            documentUrl: "file:///workspace/render/index.html",
            sessionId: "session-1",
            contentFiles: [],
            target: "card-iframe",
            semanticHash: "hash",
          },
        } as any;
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;

    try {
      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      const created: MockIframeElement[] = [];
      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el = createMockIframe({ tagName: tag.toUpperCase() });
          created.push(el);
          return el;
        },
      };

      const result = await api.compositeWindow.render({ cardFile: "/test.card", mode: "preview" });

      expect(calls.length).toBe(1);
      expect(calls[0]?.action).toBe("card.render");
      const payload = calls[0]?.payload as { cardFile: string; options?: { mode?: string; target?: string } };
      expect(payload.cardFile).toBe("/test.card");
      expect(payload.options?.target).toBe("card-iframe");
      expect(payload.options?.mode).toBe("preview");
      expect(result.origin).toBe("null");
      expect(created[0]?.attrs.sandbox).toBe("allow-scripts allow-forms");
      expect(created[0]?.src).toBe("file:///workspace/render/index.html");
      expect(created[0]?.dataset.chipsOrigin).toBe("null");
      await result.dispose();
      expect(calls[1]).toEqual({
        action: "card.releaseRenderSession",
        payload: { sessionId: "session-1" },
      });
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("passes interactionPolicy into card.render options for compositeWindow.render", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Test Card",
            documentUrl: "file:///workspace/render/interaction.html",
            sessionId: "session-2",
            contentFiles: [],
            target: "card-iframe",
            semanticHash: "hash",
          },
        } as any;
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;

    try {
      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      (globalThis as any).document = {
        createElement: (tag: string) => createMockIframe({ tagName: tag.toUpperCase() }),
      };

      const result = await api.compositeWindow.render({
        cardFile: "/test.card",
        mode: "preview",
        interactionPolicy: "delegate",
      });

      const payload = calls[0]?.payload as {
        cardFile: string;
        options?: { mode?: string; target?: string; interactionPolicy?: string };
      };
      expect(payload.options?.interactionPolicy).toBe("delegate");
      expect(result.frame.src).toBe("file:///workspace/render/interaction.html");
      await result.dispose();
      expect(calls[1]).toEqual({
        action: "card.releaseRenderSession",
        payload: { sessionId: "session-2" },
      });
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("renders coverFrame using card.renderCover and returns a sandboxed iframe url", async () => {
    const calls: Array<{ action: string; payload: any }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Cover Title",
            coverUrl: "file:///workspace/.card/cover.html",
            ratio: "3:4",
          },
        } as any;
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;
    try {
      (globalThis as any).window = { location: { origin: "https://example.test" } };
      const created: MockIframeElement[] = [];
      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el = createMockIframe({ tagName: tag.toUpperCase() });
          created.push(el);
          return el;
        },
      };

      const result = await api.coverFrame.render({ cardFile: "/cover.card" });

      expect(calls.length).toBe(1);
      expect(calls[0]?.action).toBe("card.renderCover");
      const payload = calls[0]?.payload as { cardFile: string };
      expect(payload.cardFile).toBe("/cover.card");

      expect(result.origin).toBe("null");
      expect(created.length).toBe(1);
      const frame = created[0];
      expect(frame.tagName).toBe("IFRAME");
      expect(frame.attrs.sandbox).toBe("allow-scripts");
      expect(frame.attrs.loading).toBe("lazy");
      expect(frame.title).toBe("Cover Title");
      expect(frame.src).toBe("file:///workspace/.card/cover.html");
      expect(frame.srcdoc).toBeUndefined();
      expect(result.title).toBe("Cover Title");
      expect(result.ratio).toBe("3:4");
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("passes card editor options into card.renderEditor for editorPanel.render", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "RichTextCard Editor",
            documentUrl: "file:///workspace/editor/index.html",
            sessionId: "editor-session-1",
            cardType: "RichTextCard",
            pluginId: "chips.basecard.richtext",
            baseCardId: "base-1",
          },
        } as any;
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;
    try {
      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      const created: MockIframeElement[] = [];
      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el = createMockIframe({ tagName: tag.toUpperCase() });
          created.push(el);
          return el;
        },
      };

      const result = await api.editorPanel.render({
        cardType: "RichTextCard",
        baseCardId: "base-1",
        initialConfig: {
          title: "Hello",
          body: "<p>World</p>",
        },
      });

      expect(calls.length).toBe(1);
      expect(calls[0]?.action).toBe("card.renderEditor");
      expect(calls[0]?.payload).toEqual({
        cardType: "RichTextCard",
        baseCardId: "base-1",
        initialConfig: {
          title: "Hello",
          body: "<p>World</p>",
        },
      });
      expect(result.origin).toBe("null");
      expect(created[0]?.attrs.sandbox).toBe("allow-scripts allow-forms");
      expect(created[0]?.title).toBe("RichTextCard Editor");
      expect(created[0]?.src).toBe("file:///workspace/editor/index.html");
      expect(created[0]?.dataset.chipsOrigin).toBe("null");
      await result.dispose();
      expect(calls[1]).toEqual({
        action: "card.releaseRenderSession",
        payload: { sessionId: "editor-session-1" },
      });
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("keeps editor resource bridge out of the card.renderEditor route payload", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "ImageCard Editor",
            documentUrl: "file:///workspace/editor/image.html",
            sessionId: "editor-session-2",
            cardType: "ImageCard",
            pluginId: "chips.basecard.image",
            baseCardId: "image-1",
          },
        } as any;
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;
    try {
      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      (globalThis as any).document = {
        createElement: (tag: string) => createMockIframe({ tagName: tag.toUpperCase() }),
      };

      const resources = {
        rootPath: "/workspace/cards/demo",
        resolveResourceUrl: vi.fn(),
        importResource: vi.fn(),
        deleteResource: vi.fn(),
        releaseResourceUrl: vi.fn(),
      };

      await api.editorPanel.render({
        cardType: "ImageCard",
        baseCardId: "image-1",
        initialConfig: {
          src: "images/demo.png",
        },
        resources,
      });

      expect(calls).toHaveLength(1);
      expect(calls[0]?.action).toBe("card.renderEditor");
      expect(calls[0]?.payload).toEqual({
        cardType: "ImageCard",
        baseCardId: "image-1",
        initialConfig: {
          src: "images/demo.png",
        },
      });
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("bridges editor resource requests through the SDK resource handlers", async () => {
    const api = createCardApi(
      createStubClient(async () => ({
        view: {
          title: "ImageCard Editor",
          documentUrl: "file:///workspace/editor/resource-bridge.html",
          sessionId: "editor-session-3",
          cardType: "ImageCard",
          pluginId: "chips.basecard.image",
          baseCardId: "image-1",
        },
      }) as any),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;

    try {
      const listeners: Array<(event: MessageEvent) => void> = [];
      const postMessage = vi.fn();
      let createdFrame: HTMLIFrameElement | undefined;

      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type === "message") {
            listeners.push(listener);
          }
        },
        removeEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type !== "message") {
            return;
          }
          const index = listeners.indexOf(listener);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        },
      };

      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el = createMockIframe({
            tagName: tag.toUpperCase(),
            contentWindow: { postMessage },
            isConnected: true,
          });
          createdFrame = el as HTMLIFrameElement;
          return el;
        },
      };

      const resolveResourceUrl = vi.fn(async (resourcePath: string) => `blob:https://example.test/${resourcePath}`);
      const importResource = vi.fn(async ({ file, preferredPath }: { file: File; preferredPath?: string }) => ({
        path: preferredPath ?? file.name,
      }));
      const importArchiveBundle = vi.fn(async (
        {
          file,
          preferredRootDir,
          entryFile,
        }: {
          file: File;
          preferredRootDir?: string;
          entryFile?: string;
        },
      ) => ({
        rootDir: preferredRootDir ?? file.name,
        entryFile: entryFile ?? "index.html",
        resourcePaths: [`${preferredRootDir ?? file.name}/${entryFile ?? "index.html"}`],
      }));
      const deleteResource = vi.fn(async () => undefined);
      const convertTiffToPng = vi.fn(async (
        {
          resourcePath,
          outputPath,
          overwrite,
        }: {
          resourcePath: string;
          outputPath: string;
          overwrite?: boolean;
        },
      ) => ({
        path: outputPath,
        mimeType: "image/png" as const,
        sourceMimeType: "image/tiff" as const,
        width: overwrite ? 512 : undefined,
        height: overwrite ? 512 : undefined,
      }));
      const releaseResourceUrl = vi.fn();

      const result = await api.editorPanel.render({
        cardType: "ImageCard",
        baseCardId: "image-1",
        resources: {
          resolveResourceUrl,
          importResource,
          importArchiveBundle,
          deleteResource,
          convertTiffToPng,
          releaseResourceUrl,
        },
      });

      expect(createdFrame).toBeDefined();
      expect(listeners).toHaveLength(1);

      const dispatch = async (data: unknown, origin = "null") => {
        listeners[0]?.({
          source: createdFrame?.contentWindow,
          origin,
          data,
        } as MessageEvent);
        await Promise.resolve();
        await Promise.resolve();
      };

      await dispatch({
        type: "chips.card-editor:resource-request",
        payload: {
          requestId: "resolve-1",
          action: "resolve",
          resourcePath: "./images/demo.png",
        },
      });
      expect(resolveResourceUrl).toHaveBeenCalledWith("images/demo.png");
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "resolve-1",
            ok: true,
            result: "blob:https://example.test/images/demo.png",
          },
        },
        "*",
      );

      const file = new File(["image"], "cover.png", { type: "image/png" });
      await dispatch({
        type: "chips.card-editor:resource-request",
        payload: {
          requestId: "import-1",
          action: "import",
          preferredPath: "images/cover.png",
          file,
        },
      });
      expect(importResource).toHaveBeenCalledWith({
        file,
        preferredPath: "images/cover.png",
      });
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "import-1",
            ok: true,
            result: { path: "images/cover.png" },
          },
        },
        "*",
      );

      const archiveFile = new File(["zip"], "bundle.zip", { type: "application/zip" });
      await dispatch({
        type: "chips.card-editor:resource-request",
        payload: {
          requestId: "import-archive-1",
          action: "importArchiveBundle",
          preferredRootDir: "webpage-bundle",
          entryFile: "index.html",
          file: archiveFile,
        },
      });
      expect(importArchiveBundle).toHaveBeenCalledWith({
        file: archiveFile,
        preferredRootDir: "webpage-bundle",
        entryFile: "index.html",
      });
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "import-archive-1",
            ok: true,
            result: {
              rootDir: "webpage-bundle",
              entryFile: "index.html",
              resourcePaths: ["webpage-bundle/index.html"],
            },
          },
        },
        "*",
      );

      await dispatch({
        type: "chips.card-editor:resource-request",
        payload: {
          requestId: "delete-1",
          action: "delete",
          resourcePath: "./images/cover.png",
        },
      });
      expect(deleteResource).toHaveBeenCalledWith("images/cover.png");
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "delete-1",
            ok: true,
            result: null,
          },
        },
        "*",
      );

      await dispatch({
        type: "chips.card-editor:resource-request",
        payload: {
          requestId: "convert-tiff-1",
          action: "convertTiffToPng",
          resourcePath: "./images/cover-source.tiff",
          outputPath: "./images/cover.png",
          overwrite: true,
        },
      });
      expect(convertTiffToPng).toHaveBeenCalledWith({
        resourcePath: "images/cover-source.tiff",
        outputPath: "images/cover.png",
        overwrite: true,
      });
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "convert-tiff-1",
            ok: true,
            result: {
              path: "images/cover.png",
              mimeType: "image/png",
              sourceMimeType: "image/tiff",
              width: 512,
              height: 512,
            },
          },
        },
        "*",
      );

      await dispatch({
        type: "chips.card-editor:resource-release",
        payload: {
          resourcePath: "./images/cover.png",
        },
      });
      expect(releaseResourceUrl).toHaveBeenCalledWith("images/cover.png");
      await result.dispose();
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("uses rootPath as the fallback editor resource resolver and TIFF conversion target", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        if (action === "card.renderEditor") {
          return {
            view: {
              title: "ImageCard Editor",
              documentUrl: "file:///workspace/editor/root-path.html",
              sessionId: "editor-session-4",
              cardType: "ImageCard",
              pluginId: "chips.basecard.image",
              baseCardId: "image-1",
            },
          } as any;
        }

        if (action === "resource.convertTiffToPng") {
          return {
            outputFile: "/workspace/card-root/images/cover.png",
            mimeType: "image/png",
            sourceMimeType: "image/tiff",
            width: 256,
            height: 256,
          } as any;
        }

        throw new Error(`unexpected action: ${action}`);
      }),
    );

    const previousWindow = (globalThis as any).window;
    const previousDocument = (globalThis as any).document;

    try {
      const listeners: Array<(event: MessageEvent) => void> = [];
      const postMessage = vi.fn();
      let createdFrame: HTMLIFrameElement | undefined;

      (globalThis as any).window = {
        location: { origin: "https://example.test", href: "https://example.test/app" },
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type === "message") {
            listeners.push(listener);
          }
        },
        removeEventListener: () => {},
      };

      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el = createMockIframe({
            tagName: tag.toUpperCase(),
            contentWindow: { postMessage },
            isConnected: true,
          });
          createdFrame = el as HTMLIFrameElement;
          return el;
        },
      };

      await api.editorPanel.render({
        cardType: "ImageCard",
        resources: {
          rootPath: "/workspace/card-root",
        },
      });

      listeners[0]?.({
        source: createdFrame?.contentWindow,
        origin: "null",
        data: {
          type: "chips.card-editor:resource-request",
          payload: {
            requestId: "resolve-root",
            action: "resolve",
            resourcePath: "images/cover photo.png",
          },
        },
      } as MessageEvent);

      await Promise.resolve();
      await Promise.resolve();

      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "resolve-root",
            ok: true,
            result: "file:///workspace/card-root/images/cover%20photo.png",
          },
        },
        "*",
      );

      listeners[0]?.({
        source: createdFrame?.contentWindow,
        origin: "null",
        data: {
          type: "chips.card-editor:resource-request",
          payload: {
            requestId: "convert-root",
            action: "convertTiffToPng",
            resourcePath: "images/cover-source.tiff",
            outputPath: "images/cover.png",
            overwrite: true,
          },
        },
      } as MessageEvent);

      await Promise.resolve();
      await Promise.resolve();

      expect(calls).toContainEqual({
        action: "resource.convertTiffToPng",
        payload: {
          resourceId: "/workspace/card-root/images/cover-source.tiff",
          outputFile: "/workspace/card-root/images/cover.png",
          overwrite: true,
        },
      });
      expect(postMessage).toHaveBeenCalledWith(
        {
          type: "chips.card-editor:resource-response",
          payload: {
            requestId: "convert-root",
            ok: true,
            result: {
              path: "images/cover.png",
              mimeType: "image/png",
              sourceMimeType: "image/tiff",
              width: 256,
              height: 256,
            },
          },
        },
        "*",
      );
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("compositeWindow events respect origin and type filters", async () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    const previousWindow = (globalThis as any).window;

    try {
      const listeners: Array<(event: MessageEvent) => void> = [];
      const contentWindow = {};

      (globalThis as any).window = {
        location: { origin: "https://example.test" },
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type === "message") {
            listeners.push(listener);
          }
        },
        removeEventListener: () => {},
      };

      const frame = { contentWindow } as unknown as HTMLIFrameElement;

      let readyCount = 0;
      let resizePayload: unknown = null;
      let interactionPayload: unknown = null;
      let nodeSelectPayload: unknown = null;
      let nodeErrorPayload: unknown = null;
      let fatalErrorPayload: unknown = null;

      api.compositeWindow.onReady(frame, () => {
        readyCount += 1;
      });

      api.compositeWindow.onResize(frame, (payload) => {
        resizePayload = payload;
      });

      api.compositeWindow.onInteraction(frame, (payload) => {
        interactionPayload = payload;
      });

      api.compositeWindow.onNodeError(frame, (payload) => {
        nodeErrorPayload = payload;
      });

      api.compositeWindow.onNodeSelect(frame, (payload) => {
        nodeSelectPayload = payload;
      });

      api.compositeWindow.onFatalError(frame, (error) => {
        fatalErrorPayload = error;
      });

      expect(listeners.length).toBeGreaterThan(0);
      const dispatch = (data: any, origin = "https://example.test") => {
        for (const listener of listeners) {
          listener({
            source: contentWindow,
            origin,
            data,
          } as unknown as MessageEvent);
        }
      };

      // wrong origin -> ignored
      dispatch({ type: "chips.composite:ready" }, "https://evil.test");
      expect(readyCount).toBe(0);

      // wrong type -> ignored
      dispatch({ type: "other" });
      expect(readyCount).toBe(0);

      // correct ready event
      dispatch({ type: "chips.composite:ready" });
      expect(readyCount).toBe(1);

      const resize = {
        type: "chips.composite:resize",
        payload: {
          height: 720,
          nodeCount: 2,
          reason: "node-height",
        },
      };
      dispatch(resize);
      expect(resizePayload).toEqual(resize.payload);

      const interaction = {
        type: "chips.composite:interaction",
        payload: {
          cardId: "card-1",
          nodeId: "n1",
          cardType: "RichTextCard",
          source: "basecard-frame",
          device: "wheel",
          intent: "scroll",
          deltaX: 10,
          deltaY: 24,
          clientX: 160,
          clientY: 240,
          pointerCount: 1,
        },
      };
      dispatch(interaction);
      expect(interactionPayload).toEqual(interaction.payload);

      const nodeSelect = {
        type: "chips.composite:node-select",
        payload: {
          nodeId: "n1",
          cardType: "RichTextCard",
          pluginId: "chips.basecard.richtext",
          state: "ready",
          source: "pointer",
        },
      };
      dispatch(nodeSelect);
      expect(nodeSelectPayload).toEqual(nodeSelect.payload);

      // node-error payload
      const nodeError = { type: "chips.composite:node-error", payload: { nodeId: "n1", code: "E", message: "m" } };
      dispatch(nodeError);
      expect(nodeErrorPayload).toEqual(nodeError.payload);

      // sandboxed card documents use opaque origin and must still be accepted
      const nullOriginNodeSelect = {
        type: "chips.composite:node-select",
        payload: {
          nodeId: "n2",
          cardType: "RichTextCard",
          source: "basecard",
        },
      };
      dispatch(nullOriginNodeSelect, "null");
      expect(nodeSelectPayload).toEqual(nullOriginNodeSelect.payload);

      const nullOriginNodeError = { type: "chips.composite:node-error", payload: { nodeId: "n2", code: "NULL", message: "opaque origin" } };
      dispatch(nullOriginNodeError, "null");
      expect(nodeErrorPayload).toEqual(nullOriginNodeError.payload);

      // fatal-error payload normalized to StandardError
      const rawFatal = { type: "chips.composite:fatal-error", payload: { code: "X", message: "boom" } };
      dispatch(rawFatal);
      expect((fatalErrorPayload as any).code).toBe("X");
      expect((fatalErrorPayload as any).message).toBe("boom");
      expect((fatalErrorPayload as any).retryable).toBe(false);
    } finally {
      (globalThis as any).window = previousWindow;
    }
  });

  it("compositeWindow onReady falls back to iframe load event", async () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    const previousWindow = (globalThis as any).window;

    try {
      const listeners: Array<(event: MessageEvent) => void> = [];
      const loadListeners: Array<() => void> = [];
      const frame = {
        contentWindow: {},
        contentDocument: {
          readyState: "loading",
        },
        addEventListener: (type: string, listener: () => void) => {
          if (type === "load") {
            loadListeners.push(listener);
          }
        },
        removeEventListener: () => {},
      } as unknown as HTMLIFrameElement;

      (globalThis as any).window = {
        location: { origin: "https://example.test" },
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type === "message") {
            listeners.push(listener);
          }
        },
        removeEventListener: () => {},
      };

      let readyCount = 0;
      api.compositeWindow.onReady(frame, () => {
        readyCount += 1;
      });

      expect(loadListeners).toHaveLength(1);
      loadListeners[0]!();
      loadListeners[0]!();
      expect(readyCount).toBe(1);
      expect(listeners.length).toBeGreaterThan(0);
    } finally {
      (globalThis as any).window = previousWindow;
    }
  });

  it("editorPanel events respect origin and type filters", () => {
    const api = createCardApi(
      createStubClient(async () => {
        throw new Error("should not be called");
      }),
    );

    const previousWindow = (globalThis as any).window;

    try {
      const listeners: Array<(event: MessageEvent) => void> = [];
      const contentWindow = {};

      (globalThis as any).window = {
        location: { origin: "https://example.test" },
        addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
          if (type === "message") {
            listeners.push(listener);
          }
        },
        removeEventListener: () => {},
      };

      const frame = { contentWindow } as unknown as HTMLIFrameElement;
      let readyCount = 0;
      let changePayload: unknown = null;
      let errorPayload: unknown = null;

      api.editorPanel.onReady(frame, () => {
        readyCount += 1;
      });
      api.editorPanel.onChange(frame, (payload) => {
        changePayload = payload;
      });
      api.editorPanel.onError(frame, (payload) => {
        errorPayload = payload;
      });

      const dispatch = (data: any, origin = "https://example.test", source: unknown = contentWindow) => {
        for (const listener of listeners) {
          listener({
            source,
            origin,
            data,
          } as MessageEvent);
        }
      };

      dispatch({ type: "chips.card-editor:ready" }, "https://ignored.test");
      dispatch({ type: "chips.card-editor:change", payload: { ignored: true } }, "https://example.test", {});
      dispatch({ type: "chips.card-editor:unknown", payload: { ignored: true } });

      dispatch({ type: "chips.card-editor:ready", payload: { pluginId: "chips.basecard.richtext" } });
      dispatch({
        type: "chips.card-editor:change",
        payload: {
          cardType: "RichTextCard",
          pluginId: "chips.basecard.richtext",
          baseCardId: "base-1",
          config: { title: "Updated" },
        },
      });
      dispatch({
        type: "chips.card-editor:error",
        payload: {
          cardType: "RichTextCard",
          pluginId: "chips.basecard.richtext",
          baseCardId: "base-1",
          code: "CARD_EDITOR_RENDER_FAILED",
          message: "failed",
        },
      });
      dispatch({ type: "chips.card-editor:ready", payload: { pluginId: "chips.basecard.richtext" } }, "null");

      expect(readyCount).toBe(2);
      expect(changePayload).toEqual({
        cardType: "RichTextCard",
        pluginId: "chips.basecard.richtext",
        baseCardId: "base-1",
        config: { title: "Updated" },
      });
      expect(errorPayload).toEqual({
        cardType: "RichTextCard",
        pluginId: "chips.basecard.richtext",
        baseCardId: "base-1",
        code: "CARD_EDITOR_RENDER_FAILED",
        message: "failed",
      });
    } finally {
      (globalThis as any).window = previousWindow;
    }
  });
});
