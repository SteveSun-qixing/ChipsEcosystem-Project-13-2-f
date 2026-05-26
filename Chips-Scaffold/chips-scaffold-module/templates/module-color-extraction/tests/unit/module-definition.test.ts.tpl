import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";

describe("module definition", () => {
  it("exposes the configured color extraction capability", async () => {
    expect(moduleDefinition.providers[0]?.capability).toBe("{{ MODULE_CAPABILITY }}");
    expect(moduleDefinition.providers[0]?.methods.pick).toBeTypeOf("function");
  });

  it("extracts stable colors from Host-provided bytes", async () => {
    const reportProgress = vi.fn().mockResolvedValue(undefined);
    const hostInvoke = vi.fn(async (action: string) => {
      if (action === "file.stat") {
        return { meta: { isFile: true, size: 8 } };
      }
      if (action === "file.read") {
        return { content: [16, 32, 48, 64, 80, 96, 128, 160] };
      }
      throw new Error(`unexpected action: ${action}`);
    });

    const output = await moduleDefinition.providers[0]?.methods.pick(
      {
        host: {
          invoke: hostInvoke as <T = unknown>(action: string, payload?: unknown) => Promise<T>,
        },
        job: {
          reportProgress,
        },
      },
      {
        imagePath: "/workspace/image.png",
        options: {
          sampleSize: 48,
        },
      }
    );

    expect(hostInvoke).toHaveBeenCalledWith("file.read", {
      path: "/workspace/image.png",
      options: {
        encoding: "binary",
      },
    });
    expect(output).toEqual({
      backgroundColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      accentColor: expect.stringMatching(/^#[0-9a-f]{6}$/),
      palette: [
        expect.objectContaining({
          color: expect.stringMatching(/^#[0-9a-f]{6}$/),
          role: "background",
        }),
        expect.objectContaining({
          color: expect.stringMatching(/^#[0-9a-f]{6}$/),
          role: "accent",
        }),
      ],
      metadata: expect.objectContaining({
        algorithm: "byte-sampling-template-v1",
        source: expect.objectContaining({
          imagePath: "/workspace/image.png",
        }),
        sample: expect.objectContaining({
          sampleSize: 48,
          clusterCount: 2,
        }),
      }),
    });
  });
});
