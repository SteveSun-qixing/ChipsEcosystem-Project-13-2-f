import { describe, it, expect } from "vitest";
import { createCardApi } from "../src/api/card";
import type { CoreClient } from "../src/types/client";
import { createError } from "../src/types/errors";

function createStubClient(invokeImpl: CoreClient["invoke"]): CoreClient {
  return {
    config: {},
    invoke: invokeImpl,
    events: {
      on: () => () => {},
      once: () => {},
      emit: async () => {},
    },
  };
}

describe("CardApi", () => {
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

  it("passes mode into card.render options for compositeWindow.render", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Test Card",
            body: "<div>content</div>",
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
      (globalThis as any).window = { location: { origin: "https://example.test" }, addEventListener: () => {}, removeEventListener: () => {} };
      (globalThis as any).document = {
        createElement: (tag: string) => ({
          tagName: tag.toUpperCase(),
          attrs: {} as Record<string, string>,
          setAttribute(name: string, value: string) {
            this.attrs[name] = value;
          },
        }),
      };

      await api.compositeWindow.render({ cardFile: "/test.card", mode: "preview" });

      expect(calls.length).toBe(1);
      expect(calls[0]?.action).toBe("card.render");
      const payload = calls[0]?.payload as { cardFile: string; options?: { mode?: string; target?: string } };
      expect(payload.cardFile).toBe("/test.card");
      expect(payload.options?.target).toBe("card-iframe");
      expect(payload.options?.mode).toBe("preview");
    } finally {
      (globalThis as any).window = previousWindow;
      (globalThis as any).document = previousDocument;
    }
  });

  it("renders coverFrame using card.render and returns FrameRenderResult with origin", async () => {
    const calls: Array<{ action: string; payload: any }> = [];

    const api = createCardApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          view: {
            title: "Cover Title",
            body: "<div>cover</div>",
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
      (globalThis as any).window = { location: { origin: "https://example.test" } };
      const created: any[] = [];
      (globalThis as any).document = {
        createElement: (tag: string) => {
          const el: any = {
            tagName: tag.toUpperCase(),
            attrs: {} as Record<string, string>,
            setAttribute(name: string, value: string) {
              this.attrs[name] = value;
            },
          };
          created.push(el);
          return el;
        },
      };

      const result = await api.coverFrame.render({ cardFile: "/cover.card", cardName: "My Card" });

      expect(calls.length).toBe(1);
      expect(calls[0]?.action).toBe("card.render");
      const payload = calls[0]?.payload as { cardFile: string; options?: { target?: string } };
      expect(payload.cardFile).toBe("/cover.card");
      expect(payload.options?.target).toBe("card-iframe");

      expect(result.origin).toBe("https://example.test");
      expect(created.length).toBe(1);
      const frame = created[0];
      expect(frame.tagName).toBe("IFRAME");
      expect(frame.attrs.sandbox).toBe("allow-same-origin allow-scripts allow-forms");
      expect(frame.attrs.loading).toBe("lazy");
      expect(frame.title).toBe("My Card");
      expect(frame.srcdoc).toBe("<div>cover</div>");
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
      let nodeErrorPayload: unknown = null;
      let fatalErrorPayload: unknown = null;

      api.compositeWindow.onReady(frame, () => {
        readyCount += 1;
      });

      api.compositeWindow.onNodeError(frame, (payload) => {
        nodeErrorPayload = payload;
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

      // node-error payload
      const nodeError = { type: "chips.composite:node-error", payload: { nodeId: "n1", code: "E", message: "m" } };
      dispatch(nodeError);
      expect(nodeErrorPayload).toEqual(nodeError.payload);

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
});
