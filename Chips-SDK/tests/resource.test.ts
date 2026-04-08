import { describe, expect, it } from "vitest";
import { createResourceApi } from "../src/api/resource";
import type { CoreClient } from "../src/types/client";

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

describe("ResourceApi", () => {
  it("passes resource.open requests through the official route and unwraps the result", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const api = createResourceApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          result: {
            mode: "plugin",
            pluginId: "com.chips.photo-viewer",
            matchedCapability: "resource-handler:view:image/*",
            resolved: {
              resourceId: "/tmp/demo.png",
              filePath: "/tmp/demo.png",
              mimeType: "image/png",
            },
          },
        } as never;
      }),
    );

    await expect(
      api.open({
        resource: {
          resourceId: "/tmp/demo.png",
          mimeType: "image/png",
          title: "Demo",
        },
      }),
    ).resolves.toEqual({
      mode: "plugin",
      pluginId: "com.chips.photo-viewer",
      matchedCapability: "resource-handler:view:image/*",
      resolved: {
        resourceId: "/tmp/demo.png",
        filePath: "/tmp/demo.png",
        mimeType: "image/png",
      },
    });

    expect(calls[0]).toEqual({
      action: "resource.open",
      payload: {
        resource: {
          resourceId: "/tmp/demo.png",
          mimeType: "image/png",
          title: "Demo",
        },
      },
    });
  });

  it("omits empty optional strings before invoking the official route", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const api = createResourceApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          result: {
            mode: "plugin",
            pluginId: "com.chips.photo-viewer",
            resolved: {
              resourceId: "/tmp/demo.png",
            },
          },
        } as never;
      }),
    );

    await api.open({
      intent: "   ",
      resource: {
        resourceId: "  /tmp/demo.png  ",
        mimeType: "  image/png ",
        title: "   ",
        fileName: "",
      },
    });

    expect(calls[0]).toEqual({
      action: "resource.open",
      payload: {
        resource: {
          resourceId: "/tmp/demo.png",
          mimeType: "image/png",
        },
      },
    });
  });
});
