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
          payload: {
            kind: "chips.music-card",
            version: "1.0.0",
          },
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
          payload: {
            kind: "chips.music-card",
            version: "1.0.0",
          },
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

  it("unwraps wrapped binary payloads returned by the official resource.readBinary route", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const api = createResourceApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          data: Uint8Array.from([0x49, 0x44, 0x33]),
        } as never;
      }),
    );

    const binary = await api.readBinary("/tmp/demo.mp3");

    expect(Array.from(new Uint8Array(binary))).toEqual([0x49, 0x44, 0x33]);
    expect(calls[0]).toEqual({
      action: "resource.readBinary",
      payload: {
        resourceId: "/tmp/demo.mp3",
      },
    });
  });

  it("unwraps nested Buffer-json payloads returned across the bridge serialization boundary", async () => {
    const api = createResourceApi(
      createStubClient(async () => {
        return {
          data: {
            type: "Buffer",
            data: [0x49, 0x44, 0x33],
          },
        } as never;
      }),
    );

    const binary = await api.readBinary("/tmp/demo.mp3");

    expect(Array.from(new Uint8Array(binary))).toEqual([0x49, 0x44, 0x33]);
  });

  it("rejects invalid resource.readBinary responses before exposing them to callers", async () => {
    const api = createResourceApi(
      createStubClient(async () => {
        return {
          ok: true,
        } as never;
      }),
    );

    await expect(api.readBinary("/tmp/demo.mp3")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("passes resource.convertTiffToPng through the official route", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const api = createResourceApi(
      createStubClient(async (action, payload) => {
        calls.push({ action, payload });
        return {
          outputFile: "/tmp/cover.png",
          mimeType: "image/png",
          sourceMimeType: "image/tiff",
          width: 512,
          height: 512,
        } as never;
      }),
    );

    await expect(
      api.convertTiffToPng({
        resourceId: "  /tmp/cover.tiff ",
        outputFile: " /tmp/cover.png ",
        overwrite: true,
      }),
    ).resolves.toEqual({
      outputFile: "/tmp/cover.png",
      mimeType: "image/png",
      sourceMimeType: "image/tiff",
      width: 512,
      height: 512,
    });

    expect(calls[0]).toEqual({
      action: "resource.convertTiffToPng",
      payload: {
        resourceId: "/tmp/cover.tiff",
        outputFile: "/tmp/cover.png",
        overwrite: true,
      },
    });
  });

  it("rejects invalid resource.convertTiffToPng payloads before invoking the route", async () => {
    const api = createResourceApi(
      createStubClient(async () => {
        throw new Error("should not invoke route");
      }),
    );

    await expect(
      api.convertTiffToPng({
        resourceId: "",
        outputFile: "/tmp/cover.png",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ARGUMENT",
    });
  });
});
