import { describe, expect, it } from "vitest";
import { normalizeIconMakerCliPayload, runIconMakerCliCommand } from "../../src/icon-workbench/cli-runner";

describe("icon maker CLI runner contract", () => {
  it("normalizes explicit CLI payload", () => {
    expect(
      normalizeIconMakerCliPayload({
        inputPath: "/tmp/source.png",
        outputDir: "/tmp/icons",
        formats: ["png", "ico"],
        size: 512,
      }),
    ).toEqual({
      inputPath: "/tmp/source.png",
      outputDir: "/tmp/icons",
      formats: ["png", "ico"],
      size: 512,
    });
  });

  it("accepts comma separated formats and launch payload fallback", () => {
    expect(
      normalizeIconMakerCliPayload(undefined, {
        cli: {
          payload: {
            inputPath: "/tmp/source.svg",
            outputDir: "/tmp/out",
            formats: "png,icns",
            size: "256",
          },
        },
      }),
    ).toEqual({
      inputPath: "/tmp/source.svg",
      outputDir: "/tmp/out",
      formats: ["png", "icns"],
      size: 256,
    });
  });

  it("rejects invalid sizes", () => {
    expect(() =>
      normalizeIconMakerCliPayload({
        inputPath: "/tmp/source.png",
        outputDir: "/tmp/icons",
        size: 2048,
      }),
    ).toThrow("ICONMAKER_CLI_SIZE_INVALID");
  });

  it("creates the output directory recursively before writing generated files", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const client = {
      file: {
        async read() {
          return new Uint8Array([1, 2, 3]);
        },
        async mkdir(path: string, options?: { recursive?: boolean }) {
          calls.push({ action: "file.mkdir", payload: { path, options } });
        },
        async write(path: string) {
          calls.push({ action: "file.write", payload: { path } });
        },
      },
      cliTask: {
        async progress() {},
        async complete() {},
        async fail() {},
      },
      log: {
        async write() {},
      },
    };
    const originalFile = globalThis.File;
    const originalUrlCreate = URL.createObjectURL;
    const originalUrlRevoke = URL.revokeObjectURL;
    const originalImage = globalThis.Image;
    const originalDocument = globalThis.document;

    class TestFile {
      public readonly name: string;
      public readonly type: string;
      public constructor(_parts: unknown[], name: string, options?: { type?: string }) {
        this.name = name;
        this.type = options?.type ?? "";
      }
    }

    Object.defineProperty(globalThis, "File", {
      configurable: true,
      value: TestFile,
    });
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: class {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        public width = 32;
        public height = 32;
        public set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    });
    URL.createObjectURL = () => "blob:test-icon";
    URL.revokeObjectURL = () => undefined;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement() {
          return {
            width: 0,
            height: 0,
            getContext() {
              return {
                clearRect() {},
                fillRect() {},
                drawImage() {},
                save() {},
                restore() {},
                beginPath() {},
                arc() {},
                closePath() {},
                clip() {},
              };
            },
            toBlob(callback: (blob: Blob | null) => void) {
              callback(new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }));
            },
          };
        },
      },
    });

    try {
      await runIconMakerCliCommand({
        client: client as never,
        payload: {
          inputPath: "/tmp/source.png",
          outputDir: "/tmp/icons",
          formats: ["png"],
          size: 32,
        },
      });
    } finally {
      Object.defineProperty(globalThis, "File", {
        configurable: true,
        value: originalFile,
      });
      Object.defineProperty(globalThis, "Image", {
        configurable: true,
        value: originalImage,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
      URL.createObjectURL = originalUrlCreate;
      URL.revokeObjectURL = originalUrlRevoke;
    }

    expect(calls[0]).toEqual({
      action: "file.mkdir",
      payload: {
        path: "/tmp/icons",
        options: { recursive: true },
      },
    });
    expect(calls.some((call) => call.action === "file.write")).toBe(true);
  });
});
