import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { CommunityCardPublishContext } from "../../src/types";

const textEncoder = new TextEncoder();

const bytes = (value: string): number[] => Array.from(textEncoder.encode(value));

const createContext = (
  invokeImpl: (action: string, payload?: Record<string, unknown>) => Promise<unknown>,
): CommunityCardPublishContext => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  host: {
    invoke: vi.fn(invokeImpl),
  },
  job: {
    id: "job-1",
    signal: new AbortController().signal,
    reportProgress: vi.fn().mockResolvedValue(undefined),
    isCancelled: vi.fn().mockReturnValue(false),
  },
});

describe("community uploader module", () => {
  it("exports the formal community.card.publish capability", () => {
    expect(moduleDefinition.providers[0]?.capability).toBe("community.card.publish");
    expect(typeof moduleDefinition.providers[0]?.methods.publish).toBe("function");
  });

  it("uploads resources, rewrites the card and submits the processed card", async () => {
    const cardFile = path.resolve("/tmp/source.card");
    const workspace = path.resolve("/tmp/community-upload-work");
    const unpackedDir = path.join(workspace, "unpacked.card");
    const processedCardPath = path.join(workspace, "source.processed.card");
    const writtenFiles = new Map<string, unknown>();
    const deletedPaths: string[] = [];
    const storageUploads: Array<{ url: string; headers: Record<string, string>; body: ArrayBuffer }> = [];
    const submittedForms: FormData[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/upload-sessions")) {
        expect(init?.method).toBe("POST");
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer token-1");
        return new Response(
          JSON.stringify({
            data: {
              uploadId: "upload-1",
              resourcePrefix: "users/user-1/uploads/upload-1/resources",
              expiresAt: "2026-05-24T00:00:00.000Z",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/upload-sessions/upload-1/resources/presign")) {
        const body = JSON.parse(String(init?.body)) as { resources: Array<{ relativePath: string; sha256: string }> };
        expect(body.resources.map((item) => item.relativePath)).toEqual([".card/cardcover/cover.png", "hero.png"]);
        return new Response(
          JSON.stringify({
            data: {
              resources: body.resources.map((resource) => ({
                relativePath: resource.relativePath,
                publicUrl: `https://file.example/chips-card-resources/${resource.relativePath}`,
                uploadUrl: `https://s3.example/${resource.relativePath}`,
                method: "PUT",
                headers: {
                  "content-type": "image/png",
                  "x-amz-meta-chips-sha256": resource.sha256,
                  "x-amz-meta-chips-upload-session": "upload-1",
                },
                expiresAt: "2026-05-24T00:00:00.000Z",
              })),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.startsWith("https://s3.example/")) {
        storageUploads.push({
          url,
          headers: init?.headers as Record<string, string>,
          body: init?.body as ArrayBuffer,
        });
        return new Response("", { status: 200 });
      }

      if (url.endsWith("/api/v1/upload-sessions/upload-1/card")) {
        submittedForms.push(init?.body as FormData);
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-1",
              status: "ready",
              renderStatus: "queued",
              renderStatusUrl: "/api/v1/cards/card-1/render-status",
              communityUrl: "https://community.example/cards/card-1",
            },
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === cardFile) {
          return { meta: { isFile: true, isDirectory: false, size: 4096 } };
        }
        return { meta: { isFile: true, isDirectory: false } };
      }

      if (action === "card.readInfo") {
        return { info: { metadata: { name: "Demo Card" } } };
      }

      if (action === "file.mkdir") {
        return { ack: true };
      }

      if (action === "card.unpack") {
        expect(payload).toEqual({ cardFile, outputDir: unpackedDir });
        return { outputDir: unpackedDir };
      }

      if (action === "file.list") {
        expect(payload?.dir).toBe(unpackedDir);
        return {
          entries: [
            { path: path.join(unpackedDir, ".card", "metadata.yaml"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, ".card", "structure.yaml"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, ".card", "cover.html"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, ".card", "cardcover", "cover.png"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "content", "node-1.yaml"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "content", "node-2.yaml"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "hero.png"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "story.md"), isFile: true, isDirectory: false },
          ],
        };
      }

      if (action === "file.read") {
        if (payload?.path === path.join(unpackedDir, "hero.png")) {
          return { content: { type: "Buffer", data: bytes("hero-bytes") } };
        }
        if (payload?.path === path.join(unpackedDir, ".card", "cardcover", "cover.png")) {
          return { content: { type: "Buffer", data: bytes("cover-bytes") } };
        }
        if (payload?.path === path.join(unpackedDir, "content", "node-1.yaml")) {
          return {
            content: [
              "card_type: ImageCard",
              "images:",
              "  - id: image-1",
              "    source: file",
              "    file_path: hero.png",
            ].join("\n"),
          };
        }
        if (payload?.path === path.join(unpackedDir, "content", "node-2.yaml")) {
          return {
            content: [
              "card_type: RichTextCard",
              "content_format: markdown",
              "content_source: file",
              "content_file: story.md",
            ].join("\n"),
          };
        }
        if (payload?.path === path.join(unpackedDir, "story.md")) {
          return { content: "# Story\n\nLocal markdown should be inlined." };
        }
        if (payload?.path === path.join(unpackedDir, ".card", "cover.html")) {
          return { content: "<img src=\"./cardcover/cover.png\">" };
        }
        if (payload?.path === processedCardPath) {
          return { content: { type: "Buffer", data: bytes("processed-card") } };
        }
      }

      if (action === "file.write") {
        writtenFiles.set(String(payload?.path), payload?.content);
        return { ack: true };
      }

      if (action === "file.delete") {
        deletedPaths.push(String(payload?.path));
        return { ack: true };
      }

      if (action === "card.pack") {
        expect(payload).toEqual({ cardDir: unpackedDir, outputPath: processedCardPath });
        return { cardFile: processedCardPath };
      }

      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.publish(ctx, {
      cardFile,
      server: {
        baseUrl: "https://community.example",
        accessToken: "token-1",
      },
      publish: {
        visibility: "public",
        idempotencyKey: "idem-1",
      },
      workspace: {
        tempDir: workspace,
      },
    });

    expect(result.cardId).toBe("card-1");
    expect(result.uploadedResources).toHaveLength(2);
    expect(storageUploads).toHaveLength(2);
    expect(submittedForms).toHaveLength(1);
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("source: url");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("https://file.example/chips-card-resources/hero.png");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-2.yaml"))).toContain("content_source: inline");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-2.yaml"))).toContain("Local markdown should be inlined.");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-2.yaml"))).not.toContain("content_file");
    expect(writtenFiles.get(path.join(unpackedDir, ".card", "cover.html"))).toBe(
      "<img src=\"https://file.example/chips-card-resources/.card/cardcover/cover.png\">",
    );
    expect(deletedPaths).toContain(path.join(unpackedDir, "hero.png"));
    expect(deletedPaths).toContain(path.join(unpackedDir, "story.md"));
    expect(deletedPaths).toContain(path.join(unpackedDir, ".card", "cardcover", "cover.png"));
    expect(deletedPaths).toContain(processedCardPath);
  });
});
