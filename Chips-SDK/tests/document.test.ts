import { describe, expect, it } from "vitest";
import { createDocumentApi } from "../src/api/document";
import type { CoreClient } from "../src/types/client";

function createStubClient(invokeImpl: CoreClient["invoke"]): CoreClient {
  return {
    clientConfig: {},
    invoke: invokeImpl,
    events: {
      on: () => () => undefined,
      once: () => undefined,
      emit: async () => undefined,
    },
  };
}

describe("DocumentApi", () => {
  it("normalizes card and box resize events into document window resize payloads", () => {
    const api = createDocumentApi(createStubClient(async () => ({})));
    const listeners: Array<(event: MessageEvent) => void> = [];
    const contentWindow = {};

    (globalThis as any).window = {
      location: { origin: "https://example.test" },
      addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
        if (type === "message") {
          listeners.push(listener);
        }
      },
      removeEventListener: () => undefined,
    };

    const frame = {
      contentWindow,
      dataset: {
        chipsOrigin: "https://example.test",
      },
    } as unknown as HTMLIFrameElement;

    const payloads: unknown[] = [];
    api.window.onResize(frame, (payload) => {
      payloads.push(payload);
    });

    const dispatch = (data: unknown, origin = "https://example.test") => {
      for (const listener of listeners) {
        listener({
          source: contentWindow,
          origin,
          data,
        } as unknown as MessageEvent);
      }
    };

    dispatch({
      type: "chips.composite:resize",
      payload: {
        height: 720.4,
        nodeCount: 2,
        reason: "node-height",
      },
    });
    dispatch({
      type: "chips.box-layout:resize",
      payload: {
        height: 1080.2,
        reason: "content-resize",
        sessionId: "box-session-1",
        layoutType: "chips.layout.grid",
        pluginId: "chips.layout.grid",
      },
    });

    expect(payloads).toEqual([
      {
        documentType: "card",
        height: 721,
        nodeCount: 2,
        reason: "node-height",
      },
      {
        documentType: "box",
        height: 1081,
        reason: "content-resize",
        sessionId: "box-session-1",
        layoutType: "chips.layout.grid",
        pluginId: "chips.layout.grid",
      },
    ]);
  });
});
