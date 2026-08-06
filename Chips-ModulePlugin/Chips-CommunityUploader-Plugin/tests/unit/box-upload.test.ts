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
    invoke: vi.fn(async (action: string, payload?: Record<string, unknown>) => {
      return await invokeImpl(action, payload) as never;
    }) as unknown as CommunityCardPublishContext["host"]["invoke"],
  },
  job: {
    id: "job-box-1",
    signal: new AbortController().signal,
    reportProgress: vi.fn().mockResolvedValue(undefined),
    isCancelled: vi.fn().mockReturnValue(false),
  },
});

const METADATA_YAML = [
  'chip_standards_version: "1.0.0"',
  'box_id: "b1C2d3E4f5"',
  'name: "2026 旅行箱"',
  'created_at: "2026-03-23T09:30:00.000Z"',
  'modified_at: "2026-03-23T11:20:00.000Z"',
  'active_layout_type: "chips.layout.grid"',
  'cover_ratio: "3:4"',
].join("\n");

const CONTENT_YAML = 'active_layout_type: "chips.layout.grid"\nlayout_configs: {}\n';

const STRUCTURE_YAML = [
  "entries:",
  '  - entry_id: "e9K2m1P4q7"',
  '    url: "cards/day-01.card"',
  "    enabled: true",
  "    snapshot:",
  '      document_id: "c7H1k2L9m3"',
  '      title: "第一天"',
  '      content_type: "chips/card"',
  '  - entry_id: "f4H8n2Q7r1"',
  '    url: "file:///Users/name/Cards/scattered-01.card"',
  "    enabled: true",
  "    snapshot:",
  '      document_id: "d9K3m1P4q7"',
  '      title: "散落卡片"',
  '  - entry_id: "g5J9p2R6s1"',
  '    url: "https://example.com/cards/network-01.card"',
  "    enabled: true",
  "    snapshot:",
  '      document_id: "n8L2q4R7t5"',
  '      title: "网络卡片"',
].join("\n");

const BOX_FILE = path.resolve("/tmp/upload.box");
const WORKSPACE = path.resolve("/tmp/community-box-work");
const UNPACKED_DIR = path.join(WORKSPACE, "unpacked.box");
const SCATTERED_CARD = "/Users/name/Cards/scattered-01.card";

describe("community uploader box transfer", () => {
  it("exports the uploadBox method", () => {
    const provider = moduleDefinition.providers[0];
    expect(typeof provider?.methods.uploadBox).toBe("function");
  });

  it("uploads a box: embedded and network entries skipped, scattered card uploaded, URLs rewritten, box object direct-uploaded", async () => {
    const storageUploads: Array<{ url: string; body: ArrayBuffer }> = [];
    const boxCompleteBodies: Array<Record<string, unknown>> = [];
    const boxCoverUploads: Array<{ url: string; method?: string; body?: unknown }> = [];
    const rewrittenStructureFile = new Map<string, string>();
    let boxPackPayload: Record<string, unknown> | null = null;
    let boxUnpackPayload: Record<string, unknown> | null = null;

    // 模拟社区控制面：散落卡片会话（无 contentType）与箱子上传会话（contentType: box）
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const bodyText = String(init?.body ?? "");
      let body: Record<string, unknown> = {};
      if (bodyText.length > 0 && (bodyText.startsWith("{") || bodyText.startsWith("["))) {
        try {
          body = JSON.parse(bodyText) as Record<string, unknown>;
        } catch {
          body = {};
        }
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        if (body.contentType === "box") {
          return new Response(
            JSON.stringify({
              data: {
                uploadId: "box-upload-1",
                boxId: "box-uuid-1",
                versionId: "box-version-1",
                expiresAt: "2026-08-06T01:00:00.000Z",
                resourcePrefix: "boxes/box-uuid-1/versions/box-version-1",
                boxFile: {
                  bucket: "chips-box-files",
                  objectKey: "boxes/box-uuid-1/versions/box-version-1/box.box",
                  publicUrl: "https://cdn.example/chips-box-files/boxes/box-uuid-1/versions/box-version-1/box.box",
                },
              },
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              uploadId: "card-upload-1",
              cardId: "card-1",
              versionId: "card-version-1",
              expiresAt: "2026-08-06T01:00:00.000Z",
              resourcePrefix: "cards/card-1/versions/card-version-1/resources",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/card-upload-1/objects:presign")) {
        const objects = body.objects as Array<{ role: string; relativePath?: string; mimeType: string }>;
        return new Response(
          JSON.stringify({
            data: {
              objects: objects.map((object) => {
                const objectName = object.role === "network-card"
                  ? "network-card/card.card"
                  : `resources/${object.relativePath ?? "unknown"}`;
                return {
                  role: object.role,
                  relativePath: object.role === "resource" ? (object.relativePath ?? null) : null,
                  bucket: "chips-card-resources",
                  objectKey: `cards/card-1/versions/card-version-1/${objectName}`,
                  publicUrl: `https://cdn.example/cards/card-1/versions/card-version-1/${objectName}`,
                  uploadUrl: `https://s3.example/cards/card-1/versions/card-version-1/${objectName}`,
                  method: "PUT",
                  headers: { "content-type": object.mimeType },
                  expiresAt: "2026-08-06T01:00:00.000Z",
                };
              }),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/card-upload-1/complete")) {
        return new Response(
          JSON.stringify({
            data: {
              cardId: "card-1",
              versionId: "card-version-1",
              status: "ready",
              renderStatus: "queued",
              renderStatusUrl: "/api/v1/cards/card-1/render-status",
              communityUrl: "https://community.example/cards/card-1",
            },
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/box-upload-1/objects:presign")) {
        const objects = body.objects as Array<{ role: string; relativePath?: string; mimeType: string; sizeBytes: number }>;
        if (objects.every((object) => object.role === "box-file")) {
          expect(objects).toHaveLength(1);
          expect(objects[0]?.mimeType).toBe("application/vnd.chips.box+zip");
          return new Response(
            JSON.stringify({
              data: {
                objects: [
                  {
                    role: "box-file",
                    relativePath: null,
                    bucket: "chips-box-files",
                    objectKey: "boxes/box-uuid-1/versions/box-version-1/box.box",
                    publicUrl: "https://cdn.example/chips-box-files/boxes/box-uuid-1/versions/box-version-1/box.box",
                    uploadUrl: "https://s3.example/chips-box-files/boxes/box-uuid-1/versions/box-version-1/box.box",
                    method: "PUT",
                    headers: { "content-type": "application/vnd.chips.box+zip" },
                    expiresAt: "2026-08-06T01:00:00.000Z",
                  },
                ],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        expect(objects.every((object) => object.role === "cover-file")).toBe(true);
        boxCoverUploads.push(...objects.map((object) => ({ url: "cover-presign", method: "PUT", body: object })));
        return new Response(
          JSON.stringify({
            data: {
              objects: objects.map((object) => ({
                role: "cover-file",
                relativePath: object.relativePath ?? null,
                bucket: "chips-covers",
                objectKey: `boxes/box-uuid-1/cover/${object.relativePath ?? ""}`,
                publicUrl: `https://cdn.example/chips-covers/boxes/box-uuid-1/cover/${object.relativePath ?? ""}`,
                uploadUrl: `https://s3.example/chips-covers/boxes/box-uuid-1/cover/${object.relativePath ?? ""}`,
                method: "PUT",
                headers: { "content-type": object.mimeType },
                expiresAt: "2026-08-06T01:00:00.000Z",
              })),
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.endsWith("/api/v1/card-transfer/upload-sessions/box-upload-1/complete")) {
        boxCompleteBodies.push(body);
        return new Response(
          JSON.stringify({
            data: {
              boxId: "box-uuid-1",
              versionId: "box-version-1",
              status: "ready",
              communityUrl: "https://community.example/boxes/box-uuid-1",
              boxViewUrl: "/api/v1/boxes/box-uuid-1/view",
            },
          }),
          { status: 202, headers: { "content-type": "application/json" } },
        );
      }

      if (url.startsWith("https://s3.example/")) {
        storageUploads.push({ url, body: init?.body as ArrayBuffer });
        return new Response("", { status: 200 });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const ctx = createContext(async (action, payload) => {
      if (action === "file.stat") {
        if (payload?.path === BOX_FILE || payload?.path === SCATTERED_CARD
          || payload?.path === path.join(UNPACKED_DIR, ".box", "boxcover", "cover-image.png")) {
          return { meta: { isFile: true, isDirectory: false, size: 4096 } };
        }
        return { meta: { isFile: false, isDirectory: false } };
      }

      if (action === "box.inspect") {
        expect(payload).toEqual({ boxFile: BOX_FILE });
        return {
          inspection: {
            metadata: {
              chipStandardsVersion: "1.0.0",
              boxId: "b1C2d3E4f5",
              name: "2026 旅行箱",
              activeLayoutType: "chips.layout.grid",
              coverRatio: "3:4",
            },
            entries: [
              {
                entryId: "e9K2m1P4q7",
                url: "cards/day-01.card",
                enabled: true,
                snapshot: { documentId: "c7H1k2L9m3", title: "第一天", contentType: "chips/card" },
              },
              {
                entryId: "f4H8n2Q7r1",
                url: `file://${SCATTERED_CARD}`,
                enabled: true,
                snapshot: { documentId: "d9K3m1P4q7", title: "散落卡片" },
              },
              {
                entryId: "g5J9p2R6s1",
                url: "https://example.com/cards/network-01.card",
                enabled: true,
                snapshot: { documentId: "n8L2q4R7t5", title: "网络卡片" },
              },
            ],
          },
        };
      }

      if (action === "box.unpack") {
        boxUnpackPayload = payload ?? null;
        return { outputDir: payload?.outputDir };
      }

      if (action === "file.mkdir") {
        return { ack: true };
      }

      if (action === "file.write") {
        rewrittenStructureFile.set(String(payload?.path), String(payload?.content));
        return { ack: true };
      }

      if (action === "file.read") {
        if (payload?.path === path.join(UNPACKED_DIR, ".box", "metadata.yaml")) {
          return { content: METADATA_YAML };
        }
        if (payload?.path === path.join(UNPACKED_DIR, ".box", "structure.yaml")) {
          return { content: STRUCTURE_YAML };
        }
        if (payload?.path === path.join(UNPACKED_DIR, ".box", "content.yaml")) {
          return { content: CONTENT_YAML };
        }
        if (payload?.path === path.join(UNPACKED_DIR, ".box", "cover.html")) {
          return { content: '<html><body data-chips-cover-image-source="./boxcover/cover-image.png"></body></html>' };
        }
        if (payload?.path === path.join(UNPACKED_DIR, ".box", "boxcover", "cover-image.png")) {
          return { content: { type: "Buffer", data: bytes("png-bytes") } };
        }
        return { content: { type: "Buffer", data: bytes("binary") } };
      }

      if (action === "box.pack") {
        boxPackPayload = payload ?? null;
        return { outputPath: payload?.outputPath };
      }

      if (action === "card.readInfo") {
        return { info: { metadata: { card_id: "d9K3m1P4q7", name: "散落卡片" } } };
      }

      if (action === "zip.list") {
        return {
          entries: [
            { path: ".card/metadata.yaml", isDirectory: false, size: 80, compressedSize: 80, crc32: 1, offset: 0, compressionMethod: 0, modifiedTime: 1000 },
          ],
        };
      }

      if (action === "card.unpack") {
        return { outputDir: payload?.outputDir };
      }

      if (action === "file.list") {
        return {
          entries: [
            { path: path.join(String(payload?.dir), ".card", "metadata.yaml"), isFile: true, isDirectory: false },
          ],
        };
      }

      if (action === "card.pack") {
        return { outputPath: payload?.outputPath };
      }

      if (action === "file.delete") {
        return { ack: true };
      }

      throw new Error(`Unexpected host action: ${action}`);
    });

    const provider = moduleDefinition.providers[0]!;
    const result = await provider.methods.uploadBox(ctx, {
      boxFile: BOX_FILE,
      server: { baseUrl: "https://community.example", accessToken: "token-1" },
      publish: { roomId: null, idempotencyKey: "box-key-1" },
      workspace: { tempDir: WORKSPACE },
    });

    // 控制面顺序：先卡片上传会话（散落卡片），后箱子上传会话
    const sessionUrls = fetchMock.mock.calls
      .map((call) => String(call[0]))
      .filter((url) => url.endsWith("/api/v1/card-transfer/upload-sessions"));
    expect(sessionUrls).toHaveLength(2);

    // 解包与打包
    expect(boxUnpackPayload).toEqual({ boxFile: BOX_FILE, outputDir: UNPACKED_DIR });
    expect(boxPackPayload).toMatchObject({ boxDir: UNPACKED_DIR });

    // structure.yaml 保持原始引用：file:// 散落卡片不被改写，内嵌与网络条目原样
    expect(rewrittenStructureFile.size).toBe(0);
    const complete = boxCompleteBodies[0]!;
    expect(complete.structure).toEqual({
      entries: [
        {
          entry_id: "e9K2m1P4q7",
          url: "cards/day-01.card",
          enabled: true,
          snapshot: { document_id: "c7H1k2L9m3", title: "第一天", content_type: "chips/card" },
        },
        {
          entry_id: "f4H8n2Q7r1",
          url: `file://${SCATTERED_CARD}`,
          enabled: true,
          snapshot: { document_id: "d9K3m1P4q7", title: "散落卡片" },
        },
        {
          entry_id: "g5J9p2R6s1",
          url: "https://example.com/cards/network-01.card",
          enabled: true,
          snapshot: { document_id: "n8L2q4R7t5", title: "网络卡片" },
        },
      ],
    });
    expect(JSON.stringify(complete.structure)).not.toContain("https://community.example/cards/card-1");

    // complete payload
    expect(boxCompleteBodies).toHaveLength(1);
    expect(complete.title).toBe("2026 旅行箱");
    expect(complete.boxFileId).toBe("b1C2d3E4f5");
    expect(complete.layoutPlugin).toBe("chips.layout.grid");
    expect(complete.coverRatio).toBe("3:4");
    expect(complete.coverObject).toEqual({
      bucket: "chips-covers",
      objectKey: "boxes/box-uuid-1/cover/index.html",
    });
    expect(complete.boxFile).toMatchObject({
      bucket: "chips-box-files",
      objectKey: "boxes/box-uuid-1/versions/box-version-1/box.box",
      mimeType: "application/vnd.chips.box+zip",
    });
    expect(complete.structure).toBeDefined();

    // 结果
    expect(result.boxId).toBe("box-uuid-1");
    expect(result.communityUrl).toBe("https://community.example/boxes/box-uuid-1");
    expect(result.boxViewUrl).toBe("/api/v1/boxes/box-uuid-1/view");
    expect(result.uploadedCards).toHaveLength(1);
    expect(result.uploadedCards[0]).toMatchObject({
      entryId: "f4H8n2Q7r1",
      documentId: "d9K3m1P4q7",
      communityUrl: "https://community.example/cards/card-1",
    });
    expect(result.skippedCards).toHaveLength(2);
    expect(result.skippedCards.map((item) => item.reason).sort()).toEqual(["embedded", "network"]);

    // 箱子本体字节直传对象存储
    expect(storageUploads.some((item) => item.url.includes("chips-box-files"))).toBe(true);

    // 箱子封面 HTML 目录发布（cover.html + boxcover 资源）
    expect(boxCoverUploads.length).toBeGreaterThanOrEqual(2);
    const coverRelativePaths = boxCoverUploads.map((item) => {
      const body = item.body as { relativePath?: string } | undefined;
      return body?.relativePath ?? "";
    });
    expect(coverRelativePaths).toContain("index.html");
    expect(coverRelativePaths).toContain("boxcover/cover-image.png");
  });

  it("collects multiple scattered cards and reports warnings when a card file is missing", async () => {
    const missingCard = "/Users/name/Cards/missing-01.card";
    const structureWithMissing = [
      "entries:",
      '  - entry_id: "e1"',
      `    url: "file://${missingCard}"`,
      "    enabled: true",
      "    snapshot:",
      '      document_id: "m1"',
      '      title: "缺失卡片"',
    ].join("\n");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const bodyText = String(init?.body ?? "");
      let body: Record<string, unknown> = {};
      if (bodyText.length > 0 && (bodyText.startsWith("{") || bodyText.startsWith("["))) {
        try {
          body = JSON.parse(bodyText) as Record<string, unknown>;
        } catch {
          body = {};
        }
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions")) {
        if (body.contentType === "box") {
          return new Response(
            JSON.stringify({
              data: {
                uploadId: "box-upload-2",
                boxId: "box-uuid-2",
                versionId: "box-version-2",
                expiresAt: "2026-08-06T01:00:00.000Z",
                resourcePrefix: "boxes/box-uuid-2/versions/box-version-2",
                boxFile: {
                  bucket: "chips-box-files",
                  objectKey: "boxes/box-uuid-2/versions/box-version-2/box.box",
                  publicUrl: "https://cdn.example/chips-box-files/boxes/box-uuid-2/versions/box-version-2/box.box",
                },
              },
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        throw new Error(`Unexpected card session: ${url}`);
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/box-upload-2/objects:presign")) {
        return new Response(
          JSON.stringify({
            data: {
              objects: [
                {
                  role: "box-file",
                  relativePath: null,
                  bucket: "chips-box-files",
                  objectKey: "boxes/box-uuid-2/versions/box-version-2/box.box",
                  publicUrl: "https://cdn.example/chips-box-files/boxes/box-uuid-2/versions/box-version-2/box.box",
                  uploadUrl: "https://s3.example/box-2",
                  method: "PUT",
                  headers: {},
                  expiresAt: "2026-08-06T01:00:00.000Z",
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.startsWith("https://s3.example/")) {
        return new Response("", { status: 200 });
      }
      if (url.endsWith("/api/v1/card-transfer/upload-sessions/box-upload-2/complete")) {
        return new Response(
          JSON.stringify({
            data: {
              boxId: "box-uuid-2",
              versionId: "box-version-2",
              status: "ready",
              communityUrl: "https://community.example/boxes/box-uuid-2",
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
        return { meta: { isFile: payload?.path === BOX_FILE, isDirectory: false } };
      }
      if (action === "box.inspect") {
        return {
          inspection: {
            metadata: { boxId: "b1C2d3E4f5", name: "测试箱", activeLayoutType: "chips.layout.grid" },
            entries: [
              { entryId: "e1", url: `file://${missingCard}`, enabled: true, snapshot: { documentId: "m1", title: "缺失卡片" } },
            ],
          },
        };
      }
      if (action === "box.unpack") return { outputDir: payload?.outputDir };
      if (action === "file.mkdir") return { ack: true };
      if (action === "file.write") return { ack: true };
      if (action === "file.read") {
        if (String(payload?.path).endsWith(".box/metadata.yaml")) return { content: METADATA_YAML };
        if (String(payload?.path).endsWith(".box/structure.yaml")) return { content: structureWithMissing };
        if (String(payload?.path).endsWith(".box/content.yaml")) return { content: CONTENT_YAML };
        return { content: { type: "Buffer", data: bytes("bin") } };
      }
      if (action === "box.pack") return { outputPath: payload?.outputPath };
      if (action === "file.delete") return { ack: true };
      throw new Error(`Unexpected host action: ${action}`);
    });

    const provider = moduleDefinition.providers[0]!;
    const result = await provider.methods.uploadBox(ctx, {
      boxFile: BOX_FILE,
      server: { baseUrl: "https://community.example", accessToken: "token-1" },
      publish: { roomId: null, idempotencyKey: "box-key-2" },
      workspace: { tempDir: WORKSPACE },
    });

    expect(result.boxId).toBe("box-uuid-2");
    expect(result.uploadedCards).toHaveLength(0);
    expect(result.warnings?.some((w) => w.code === "COMMUNITY_TRANSFER_BOX_CARD_FILE_MISSING")).toBe(true);
  });
});

export {};
