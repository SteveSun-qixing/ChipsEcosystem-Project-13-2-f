import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import moduleDefinition from "../../src";
import type { CommunityCardPublishContext } from "../../src/types";

const textEncoder = new TextEncoder();

const bytes = (value: string): number[] => Array.from(textEncoder.encode(value));
const arrayBuffer = (value: string): ArrayBuffer => textEncoder.encode(value).buffer.slice(0);

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
    invoke: vi.fn(async (action: string, payload?: Record<string, unknown>) => {
      return await invokeImpl(action, payload) as never;
    }) as unknown as CommunityCardPublishContext["host"]["invoke"],
  },
  job: {
    id: "job-1",
    signal: new AbortController().signal,
    reportProgress: vi.fn().mockResolvedValue(undefined),
    isCancelled: vi.fn().mockReturnValue(false),
  },
});

describe("community uploader transfer module", () => {
  it("exports the formal community.card.transfer capability", () => {
    const provider = moduleDefinition.providers[0];

    expect(provider?.capability).toBe("community.card.transfer");
    expect(typeof provider?.methods.upload).toBe("function");
    expect(typeof provider?.methods.download).toBe("function");
    expect(typeof provider?.methods.openRemote).toBe("function");
    expect(typeof provider?.methods.openRemoteBox).toBe("function");
    expect(provider?.methods).not.toHaveProperty("publish");
  });

  it("uploads resources, writes a network resource card, and completes the transfer session", async () => {
    const cardFile = path.resolve("/tmp/source.card");
    const workspace = path.resolve("/tmp/community-transfer-work");
    const unpackedDir = path.join(workspace, "unpacked.card");
    const networkCardPath = path.join(workspace, "source.network.card");
    const writtenFiles = new Map<string, unknown>();
    const deletedPaths: string[] = [];
    const storageUploads: Array<{ url: string; headers: Record<string, string>; body: ArrayBuffer }> = [];
    const completedUploads: Array<Record<string, unknown>> = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        expect(init?.method).toBe("POST");
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer token-1");
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body.fileName).toBe("source.card");
        expect(body.roomId).toBe("room-1");
        return new Response(
          JSON.stringify({
            data: {
              uploadId: "upload-1",
              cardId: "card-1",
              versionId: "version-1",
              resourcePrefix: "cards/card-1/versions/version-1/resources",
              expiresAt: "2026-05-24T00:00:00.000Z",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-1/objects:presign")) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body)) as {
          objects: Array<{ role: "network-card" | "resource"; relativePath?: string; mimeType: string; sizeBytes: number }>;
        };
        return new Response(
          JSON.stringify({
            data: {
              objects: body.objects.map((object) => {
                const objectName = object.role === "network-card"
                  ? "network-card/card.card"
                  : `resources/${object.relativePath}`;
                return {
                  role: object.role,
                  relativePath: object.relativePath ?? null,
                  bucket: "card-resources",
                  objectKey: `cards/card-1/versions/version-1/${objectName}`,
                  publicUrl: `https://cdn.example/cards/card-1/versions/version-1/${objectName}`,
                  uploadUrl: `https://s3.example/cards/card-1/versions/version-1/${objectName}`,
                  method: "PUT",
                  headers: {
                    "content-type": object.mimeType,
                    "x-amz-meta-chips-upload-session": "upload-1",
                  },
                  expiresAt: "2026-05-24T00:00:00.000Z",
                };
              }),
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

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-1/complete")) {
        expect(init?.method).toBe("POST");
        completedUploads.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-1",
              versionId: "version-1",
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
        return { info: { metadata: { card_id: "cardfile01", name: "Demo Card", cover_ratio: "3:4" } } };
      }

      if (action === "zip.list") {
        return {
          entries: [
            { path: ".card/metadata.yaml", isDirectory: false, size: 80, compressedSize: 80, crc32: 1, offset: 0, compressionMethod: 0, modifiedTime: 1000 },
            { path: "content/node-1.yaml", isDirectory: false, size: 120, compressedSize: 120, crc32: 2, offset: 80, compressionMethod: 0, modifiedTime: 1001 },
            { path: "hero.png", isDirectory: false, size: 10, compressedSize: 10, crc32: 3, offset: 200, compressionMethod: 0, modifiedTime: 1002 },
            { path: ".card/cardcover/cover.png", isDirectory: false, size: 11, compressedSize: 11, crc32: 4, offset: 210, compressionMethod: 0, modifiedTime: 1003 },
          ],
        };
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
            { path: path.join(unpackedDir, "hero.png"), isFile: true, isDirectory: false },
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
              "card_type: base.image",
              "images:",
              "  - id: image-1",
              "    source: file",
              "    file_path: hero.png",
            ].join("\n"),
          };
        }
        if (payload?.path === path.join(unpackedDir, ".card", "cover.html")) {
          return { content: "<img src=\"./cardcover/cover.png\">" };
        }
        if (payload?.path === networkCardPath) {
          return { content: { type: "Buffer", data: bytes("network-card") } };
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
        expect(payload).toEqual({ cardDir: unpackedDir, outputPath: networkCardPath });
        return { cardFile: networkCardPath };
      }

      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.upload(ctx, {
      cardFile,
      server: {
        baseUrl: "https://community.example",
        accessToken: "token-1",
      },
      publish: {
        roomId: "room-1",
        idempotencyKey: "idem-1",
      },
      workspace: {
        tempDir: workspace,
      },
    });

    expect(result.cardId).toBe("card-1");
    expect(result.versionId).toBe("version-1");
    expect(result.uploadedResources).toHaveLength(2);
    expect(storageUploads).toHaveLength(3);
    expect(storageUploads.map((item) => item.url)).toContain("https://s3.example/cards/card-1/versions/version-1/network-card/card.card");
    expect(completedUploads).toHaveLength(1);
    expect((completedUploads[0]?.networkCard as Record<string, unknown>).objectKey).toBe("cards/card-1/versions/version-1/network-card/card.card");
    expect(completedUploads[0]?.restoreManifest).toMatchObject({
      schemaVersion: "1.0.0",
      originalFileName: "source.card",
      cardId: "card-1",
      versionId: "version-1",
    });
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("source: url");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("https://cdn.example/cards/card-1/versions/version-1/resources/hero.png");
    expect(writtenFiles.get(path.join(unpackedDir, ".card", "cover.html"))).toBe(
      "<img src=\"https://cdn.example/cards/card-1/versions/version-1/resources/.card/cardcover/cover.png\">",
    );
    expect(deletedPaths).toContain(path.join(unpackedDir, "hero.png"));
    expect(deletedPaths).toContain(path.join(unpackedDir, ".card", "cardcover", "cover.png"));
    expect(deletedPaths).toContain(networkCardPath);
  });

  it("downloads a network resource card and restores relative resource paths before packing", async () => {
    const outputPath = path.resolve("/tmp/restored.card");
    const workspace = path.resolve("/tmp/community-download-work");
    const networkCardPath = path.join(workspace, "network.card");
    const unpackedDir = path.join(workspace, "restored.card");
    const writtenFiles = new Map<string, unknown>();
    const deletedPaths: string[] = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/card-transfer/download-sessions")) {
        expect(init?.method).toBe("POST");
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body.cardId).toBe("card-1");
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-1",
              versionId: "version-1",
              planUrl: "/api/v1/card-transfer/download-sessions/download-1/plan",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/download-sessions/download-1/plan")) {
        expect(init?.method).toBe("GET");
        expect((init?.headers as Record<string, string>).authorization).toBe("Bearer token-1");
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-1",
              versionId: "version-1",
              suggestedFileName: "Demo.card",
              networkCard: {
                bucket: "card-resources",
                objectKey: "cards/card-1/versions/version-1/network-card/card.card",
                publicUrl: "https://cdn.example/cards/card-1/versions/version-1/network-card/card.card",
                downloadUrl: "https://cdn.example/download/network-card.card",
                sizeBytes: 1024,
                mimeType: "application/vnd.chips.card+zip",
              },
              resources: [
                {
                  originalRelativePath: "hero.png",
                  networkUrl: "https://cdn.example/cards/card-1/versions/version-1/resources/hero.png",
                  publicUrl: "https://cdn.example/cards/card-1/versions/version-1/resources/hero.png",
                  bucket: "card-resources",
                  objectKey: "cards/card-1/versions/version-1/resources/hero.png",
                  downloadUrl: "https://cdn.example/download/hero.png",
                  sizeBytes: 10,
                  mimeType: "image/png",
                },
                {
                  originalRelativePath: ".card/cardcover/cover.png",
                  networkUrl: "https://cdn.example/cards/card-1/versions/version-1/resources/.card/cardcover/cover.png",
                  publicUrl: "https://cdn.example/cards/card-1/versions/version-1/resources/.card/cardcover/cover.png",
                  bucket: "card-resources",
                  objectKey: "cards/card-1/versions/version-1/resources/.card/cardcover/cover.png",
                  downloadUrl: "https://cdn.example/download/cover.png",
                  sizeBytes: 11,
                  mimeType: "image/png",
                },
              ],
              restoreManifest: {
                schemaVersion: "1.0.0",
                originalFileName: "Demo.card",
                zipEntries: [
                  { order: 0, path: ".card/metadata.yaml", modifiedTime: 1767225600000 },
                  { order: 1, path: "content/node-1.yaml", modifiedTime: 1767229200000 },
                  { order: 2, path: "hero.png", modifiedTime: 1767232800000 },
                  { order: 3, path: ".card/cardcover/cover.png", modifiedTime: 1767236400000 },
                ],
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url === "https://cdn.example/download/network-card.card") {
        return new Response(arrayBuffer("network-card"), { status: 200 });
      }
      if (url === "https://cdn.example/download/hero.png") {
        return new Response(arrayBuffer("hero-bytes"), { status: 200 });
      }
      if (url === "https://cdn.example/download/cover.png") {
        return new Response(arrayBuffer("cover-bytes"), { status: 200 });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx = createContext(async (action, payload) => {
      if (action === "file.mkdir") {
        return { ack: true };
      }

      if (action === "file.write") {
        writtenFiles.set(String(payload?.path), payload?.content);
        return { ack: true };
      }

      if (action === "card.unpack") {
        expect(payload).toEqual({ cardFile: networkCardPath, outputDir: unpackedDir });
        return { outputDir: unpackedDir };
      }

      if (action === "file.list") {
        expect(payload?.dir).toBe(unpackedDir);
        return {
          entries: [
            { path: path.join(unpackedDir, ".card", "cover.html"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "content", "node-1.yaml"), isFile: true, isDirectory: false },
          ],
        };
      }

      if (action === "file.read") {
        if (payload?.path === path.join(unpackedDir, "content", "node-1.yaml")) {
          return {
            content: [
              "card_type: base.image",
              "images:",
              "  - id: image-1",
              "    source: url",
              "    url: https://cdn.example/cards/card-1/versions/version-1/resources/hero.png",
            ].join("\n"),
          };
        }
        if (payload?.path === path.join(unpackedDir, ".card", "cover.html")) {
          return {
            content: "<img src=\"https://cdn.example/cards/card-1/versions/version-1/resources/.card/cardcover/cover.png\">",
          };
        }
      }

      if (action === "card.pack") {
        expect(payload).toEqual({
          cardDir: unpackedDir,
          outputPath,
          entryPlan: [
            { path: ".card/metadata.yaml", modifiedTime: 1767225600000 },
            { path: "content/node-1.yaml", modifiedTime: 1767229200000 },
            { path: "hero.png", modifiedTime: 1767232800000 },
            { path: ".card/cardcover/cover.png", modifiedTime: 1767236400000 },
          ],
        });
        return { cardFile: outputPath };
      }

      if (action === "card.readInfo") {
        expect(payload?.cardFile).toBe(outputPath);
        return { info: { metadata: { name: "Demo Card" } } };
      }

      if (action === "card.render") {
        expect(payload?.cardFile).toBe(outputPath);
        return { view: { frame: "verified" } };
      }

      if (action === "card.open") {
        expect(payload?.cardFile).toBe(outputPath);
        return { result: { sessionId: "verified-session" } };
      }

      if (action === "file.delete") {
        deletedPaths.push(String(payload?.path));
        return { ack: true };
      }

      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.download(ctx, {
      cardId: "card-1",
      outputPath,
      server: {
        baseUrl: "https://community.example",
        accessToken: "token-1",
      },
      workspace: {
        tempDir: workspace,
      },
    });

    expect(result).toMatchObject({
      cardId: "card-1",
      versionId: "version-1",
      outputPath,
      restoredResourceCount: 2,
      suggestedFileName: "Demo.card",
    });
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("source: file");
    expect(writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"))).toContain("file_path: hero.png");
    expect(writtenFiles.get(path.join(unpackedDir, ".card", "cover.html"))).toBe("<img src=\".card/cardcover/cover.png\">");
    expect(writtenFiles.get(path.join(unpackedDir, "hero.png"))).toEqual(bytes("hero-bytes"));
    expect(writtenFiles.get(path.join(unpackedDir, ".card", "cardcover", "cover.png"))).toEqual(bytes("cover-bytes"));
    expect(deletedPaths).toContain(networkCardPath);
    expect(deletedPaths).toContain(unpackedDir);
  });

  it("opens remote community cards by downloading the network resource card and launching the local viewer", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/card-transfer/download-sessions")) {
        const body = JSON.stringify({
          data: {
            downloadId: "download-1",
            cardId: "card-1",
            versionId: "version-1",
            planUrl: "/api/v1/card-transfer/download-sessions/download-1/plan",
          },
        });
        return {
          ok: true,
          text: async () => body,
          json: async () => JSON.parse(body),
        };
      }
      if (url.endsWith("/api/v1/card-transfer/download-sessions/download-1/plan")) {
        const body = JSON.stringify({
          data: {
            cardId: "card-1",
            versionId: "version-1",
            suggestedFileName: "Demo.card",
            networkCard: {
              bucket: "chips-card-resources",
              objectKey: "cards/card-1/versions/version-1/network-card/card.card",
              publicUrl: "https://cdn.example/network-card.card",
              downloadUrl: "https://cdn.example/network-card.card",
              sizeBytes: 2048,
              mimeType: "application/vnd.chips.card+zip",
            },
            resources: [],
          },
        });
        return {
          ok: true,
          text: async () => body,
          json: async () => JSON.parse(body),
        };
      }
      if (url === "https://cdn.example/network-card.card") {
        return {
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode("network-card-bytes").buffer,
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const hostActions: Array<{ action: string; payload?: Record<string, unknown> }> = [];
    const ctx = createContext(async (action, payload) => {
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "file.write") {
        return { ack: true };
      }
      if (action === "surface.open") {
        hostActions.push({ action, payload });
        return { surface: { id: "surface-1" } };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.openRemote(ctx, {
      cardId: "card-1",
      server: {
        baseUrl: "https://community.example",
        accessToken: "token-1",
      },
    });

    expect(result.opened).toBe(true);
    expect(result.url).toBe("https://community.example/cards/card-1");
    expect(result.localCardPath).toBeTruthy();

    const openAction = hostActions.find((entry) => entry.action === "surface.open");
    expect(openAction).toBeTruthy();
    const request = (openAction?.payload as { request?: Record<string, unknown> })?.request;
    expect(request?.kind).toBe("window");
    const target = (request as { target?: Record<string, unknown> }).target;
    expect(target?.type).toBe("plugin");
    expect(target?.pluginId).toBe("com.chips.card-viewer");
    const launchParams = (target as { launchParams?: Record<string, unknown> }).launchParams;
    const cardSource = (launchParams as { cardSource?: Record<string, unknown> }).cardSource;
    expect(cardSource?.kind).toBe("local-file");
    expect(cardSource?.documentKind).toBe("card");
    expect(String(cardSource?.filePath)).toContain("Demo.card");
    const communityServer = (launchParams as { communityServer?: Record<string, unknown> }).communityServer;
    expect(communityServer?.baseUrl).toBe("https://community.example");
    expect(communityServer?.accessToken).toBe("token-1");

    vi.unstubAllGlobals();
  });

  it("retries transient control-plane failures and cancels on job signal", async () => {
    const cardFile = path.resolve("/tmp/retry-source.card");
    const workspace = path.resolve("/tmp/community-retry-work");
    const unpackedDir = path.join(workspace, "unpacked.card");
    let createSessionAttempts = 0;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        createSessionAttempts += 1;
        if (createSessionAttempts < 3) {
          return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "temporary" } }), {
            status: 503,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            data: { uploadId: "upload-1", cardId: "card-1", versionId: "version-1", resourcePrefix: "prefix" },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-1/objects:presign")) {
        const body = JSON.parse(String(init?.body)) as {
          objects: Array<{ role: "network-card" | "resource"; relativePath?: string }>;
        };
        return new Response(
          JSON.stringify({
            data: {
              objects: body.objects.map((object) => ({
                role: object.role,
                relativePath: object.relativePath ?? null,
                bucket: "card-resources",
                objectKey: `cards/card-1/versions/version-1/${object.role === "network-card" ? "network-card/card.card" : `resources/${object.relativePath}`}`,
                publicUrl: `https://cdn.example/${object.role}`,
                uploadUrl: `https://s3.example/${object.role}`,
                method: "PUT",
                headers: {},
              })),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://s3.example/")) {
        return new Response("", { status: 200 });
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-1/complete")) {
        return new Response(
          JSON.stringify({
            data: { cardId: "card-1", versionId: "version-1", status: "ready", renderStatus: "queued", renderStatusUrl: "/render-status", communityUrl: "https://community.example/cards/card-1" },
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        return { meta: { isFile: true, isDirectory: false } };
      }
      if (action === "card.readInfo") {
        return { info: { metadata: { name: "Retry Card" } } };
      }
      if (action === "zip.list") {
        return { entries: [] };
      }
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "card.unpack") {
        return { outputDir: unpackedDir };
      }
      if (action === "file.list") {
        return { entries: [] };
      }
      if (action === "card.pack") {
        return { cardFile: path.join(workspace, "retry.network.card") };
      }
      if (action === "file.read") {
        return { content: { type: "Buffer", data: bytes("network-card") } };
      }
      if (action === "file.write" || action === "file.delete") {
        return { ack: true };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.upload(ctx, {
      cardFile,
      server: { baseUrl: "https://community.example", accessToken: "token-1" },
      workspace: { tempDir: workspace },
    });

    expect(createSessionAttempts).toBe(3);
    expect(result.cardId).toBe("card-1");
  });

  it("signals auth expiration as a non-retryable transfer error", async () => {
    const cardFile = path.resolve("/tmp/auth-source.card");
    const workspace = path.resolve("/tmp/community-auth-work");
    const unpackedDir = path.join(workspace, "unpacked.card");

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        return new Response(JSON.stringify({ error: { code: "AUTH_TOKEN_EXPIRED", message: "expired" } }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        return { meta: { isFile: true, isDirectory: false } };
      }
      if (action === "card.readInfo") {
        return { info: { metadata: { name: "Auth Card" } } };
      }
      if (action === "zip.list") {
        return { entries: [] };
      }
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "card.unpack") {
        return { outputDir: unpackedDir };
      }
      if (action === "file.list") {
        return { entries: [] };
      }
      if (action === "card.pack") {
        return { cardFile: path.join(workspace, "auth.network.card") };
      }
      if (action === "file.read") {
        return { content: { type: "Buffer", data: bytes("network-card") } };
      }
      if (action === "file.write" || action === "file.delete") {
        return { ack: true };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = moduleDefinition.providers[0]!.methods.upload(ctx, {
      cardFile,
      server: { baseUrl: "https://community.example", accessToken: "token-1" },
      workspace: { tempDir: workspace },
    });

    await expect(result).rejects.toMatchObject({
      code: "COMMUNITY_TRANSFER_AUTH_EXPIRED",
      retryable: false,
    });
  });

  it("inlines file-backed rich text content during upload and records the original content file in the restore manifest", async () => {
    const cardFile = path.resolve("/tmp/richtext-source.card");
    const workspace = path.resolve("/tmp/community-richtext-work");
    const unpackedDir = path.join(workspace, "unpacked.card");
    const writtenFiles = new Map<string, unknown>();

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        return new Response(
          JSON.stringify({
            data: { uploadId: "upload-rt", cardId: "card-rt", versionId: "version-rt", resourcePrefix: "prefix" },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-rt/objects:presign")) {
        const body = JSON.parse(String(init?.body)) as {
          objects: Array<{ role: "network-card" | "resource"; relativePath?: string }>;
        };
        return new Response(
          JSON.stringify({
            data: {
              objects: body.objects.map((object) => ({
                role: object.role,
                relativePath: object.relativePath ?? null,
                bucket: "card-resources",
                objectKey: `cards/card-rt/versions/version-rt/${object.role === "network-card" ? "network-card/card.card" : `resources/${object.relativePath}`}`,
                publicUrl: `https://cdn.example/${object.role === "network-card" ? "network-card" : object.relativePath}`,
                uploadUrl: `https://s3.example/${object.role}`,
                method: "PUT",
                headers: {},
              })),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://s3.example/")) {
        return new Response("", { status: 200 });
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/upload-rt/complete")) {
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-rt",
              versionId: "version-rt",
              status: "ready",
              renderStatus: "queued",
              renderStatusUrl: "/render-status",
              communityUrl: "https://community.example/cards/card-rt",
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
        return { meta: { isFile: true, isDirectory: false } };
      }
      if (action === "card.readInfo") {
        return { info: { metadata: { name: "Rich Text Card" } } };
      }
      if (action === "zip.list") {
        return { entries: [] };
      }
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "card.unpack") {
        return { outputDir: unpackedDir };
      }
      if (action === "file.list") {
        return {
          entries: [
            { path: path.join(unpackedDir, "content", "node-1.yaml"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, "richtext", "node-1.md"), isFile: true, isDirectory: false },
            { path: path.join(unpackedDir, ".card", "cover.html"), isFile: true, isDirectory: false },
          ],
        };
      }
      if (action === "file.read") {
        if (payload?.path === path.join(unpackedDir, "content", "node-1.yaml")) {
          return {
            content: [
              "card_type: base.richtext",
              "content_source: file",
              "content_file: richtext/node-1.md",
            ].join("\n"),
          };
        }
        if (payload?.path === path.join(unpackedDir, "richtext", "node-1.md")) {
          return { content: "# 富文本正文\n\n这是内容。" };
        }
        if (payload?.path === path.join(unpackedDir, ".card", "cover.html")) {
          return { content: "<html></html>" };
        }
        if (payload?.path === path.join(workspace, "richtext-source.network.card")) {
          return { content: { type: "Buffer", data: bytes("network-card") } };
        }
      }
      if (action === "file.write") {
        writtenFiles.set(String(payload?.path), payload?.content);
        return { ack: true };
      }
      if (action === "file.delete") {
        return { ack: true };
      }
      if (action === "card.pack") {
        return { cardFile: path.join(workspace, "richtext-source.network.card") };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.upload(ctx, {
      cardFile,
      server: { baseUrl: "https://community.example", accessToken: "token-1" },
      workspace: { tempDir: workspace },
    });

    const rewrittenYaml = writtenFiles.get(path.join(unpackedDir, "content", "node-1.yaml"));
    expect(String(rewrittenYaml)).toContain("content_source: inline");
    expect(String(rewrittenYaml)).toContain("# 富文本正文");
    expect(String(rewrittenYaml)).not.toContain("content_file:");
    expect(result.cardId).toBe("card-rt");
  });
});

describe("community uploader box remote open", () => {
  it("downloads the community box and launches the local card viewer with documentKind box", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith("/api/v1/boxes/box-uuid-1/download")) {
        const body = JSON.stringify({
          data: {
            boxId: "box-uuid-1",
            bucket: "chips-box-files",
            objectKey: "boxes/box-uuid-1/versions/v1/box.box",
            suggestedFileName: "旅行箱.box",
            downloadUrl: "https://cdn.example/box.box",
            method: "GET",
            headers: {},
            expiresInSeconds: 900,
          },
        });
        return {
          ok: true,
          text: async () => body,
          json: async () => JSON.parse(body),
        };
      }
      if (url === "https://cdn.example/box.box") {
        return {
          ok: true,
          arrayBuffer: async () => new TextEncoder().encode("box-bytes").buffer,
        };
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const hostActions: Array<{ action: string; payload?: Record<string, unknown> }> = [];
    const ctx = createContext(async (action, payload) => {
      if (action === "file.mkdir") {
        return { ack: true };
      }
      if (action === "file.write") {
        return { ack: true };
      }
      if (action === "surface.open") {
        hostActions.push({ action, payload });
        return { surface: { id: "surface-box-1" } };
      }
      throw new Error(`Unexpected host action: ${action}`);
    });

    const result = await moduleDefinition.providers[0]!.methods.openRemoteBox(ctx, {
      boxId: "box-uuid-1",
      server: {
        baseUrl: "https://community.example",
        accessToken: "token-1",
      },
    });

    expect(result.opened).toBe(true);
    expect(result.url).toBe("https://community.example/boxes/box-uuid-1");
    expect(result.localBoxPath).toBeTruthy();

    const openAction = hostActions.find((entry) => entry.action === "surface.open");
    expect(openAction).toBeTruthy();
    const request = (openAction?.payload as { request?: Record<string, unknown> })?.request;
    expect(request?.kind).toBe("window");
    const target = (request as { target?: Record<string, unknown> }).target;
    expect(target?.type).toBe("plugin");
    expect(target?.pluginId).toBe("com.chips.card-viewer");
    const launchParams = (target as { launchParams?: Record<string, unknown> }).launchParams;
    const cardSource = (launchParams as { cardSource?: Record<string, unknown> }).cardSource;
    expect(cardSource?.kind).toBe("local-file");
    expect(cardSource?.documentKind).toBe("box");
    expect(String(cardSource?.filePath)).toContain("旅行箱.box");
    const communityServer = (launchParams as { communityServer?: Record<string, unknown> }).communityServer;
    expect(communityServer?.baseUrl).toBe("https://community.example");
    expect(communityServer?.accessToken).toBe("token-1");

    vi.unstubAllGlobals();
  });

  it("rejects openRemoteBox without boxId or server session", async () => {
    const ctx = createContext(async () => {
      throw new Error("unexpected host action");
    });

    await expect(
      moduleDefinition.providers[0]!.methods.openRemoteBox(ctx, {
        boxId: "",
        server: { baseUrl: "https://community.example", accessToken: "token-1" },
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_TRANSFER_INPUT_INVALID" });

    await expect(
      moduleDefinition.providers[0]!.methods.openRemoteBox(ctx, {
        boxId: "box-uuid-1",
        server: { baseUrl: "", accessToken: "" },
      }),
    ).rejects.toMatchObject({ code: "COMMUNITY_TRANSFER_INPUT_INVALID" });
  });
});
