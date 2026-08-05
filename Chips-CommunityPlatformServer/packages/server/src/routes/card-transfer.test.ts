import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CARD_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';

const roomServiceMock = {
  assertOwnedByUser: vi.fn(),
};

const uploadSessionServiceMock = {
  create: vi.fn(),
  getOwned: vi.fn(),
};

const cardServiceMock = {
  create: vi.fn(),
  getAccessible: vi.fn(),
};

const cardRenderCacheServiceMock = {
  viewRenderProfile: 'community-web',
  coverRenderProfile: 'community-cover',
  enqueueForCard: vi.fn(),
};

const createPresignedPutUrlMock = vi.fn();
const createPresignedGetUrlMock = vi.fn();
const buildObjectUrlMock = vi.fn((bucket: string, key: string) => `https://cdn.example/${bucket}/${key}`);
const headObjectMock = vi.fn();

const dbUpdateCalls: Array<{ table: unknown; values: Record<string, unknown>; condition: unknown }> = [];
let updatedCardResult: Record<string, unknown> | null = null;

const dbMock = {
  update: vi.fn((table: unknown) => ({
    set: vi.fn((values: Record<string, unknown>) => ({
      where: vi.fn((condition: unknown) => {
        dbUpdateCalls.push({ table, values, condition });
        return {
          returning: vi.fn(async () => (updatedCardResult ? [updatedCardResult] : [])),
        };
      }),
    })),
  })),
};

vi.mock('../services/room.service', () => ({
  RoomService: roomServiceMock,
}));

vi.mock('../services/upload-session.service', () => ({
  UploadSessionService: uploadSessionServiceMock,
}));

vi.mock('../services/card.service', () => ({
  CardService: cardServiceMock,
}));

vi.mock('../services/card-render-cache.service', () => ({
  CardRenderCacheService: cardRenderCacheServiceMock,
}));

vi.mock('../storage/buckets', () => ({
  Bucket: {
    CARD_RESOURCES: 'chips-card-resources',
  },
}));

vi.mock('../storage/s3', () => ({
  buildObjectUrl: buildObjectUrlMock,
  createPresignedPutUrl: createPresignedPutUrlMock,
  createPresignedGetUrl: createPresignedGetUrlMock,
  headObject: headObjectMock,
}));

vi.mock('../db/client', () => ({
  db: dbMock,
}));

vi.mock('../db/schema/cards', () => ({
  cards: {
    id: 'cards.id',
    userId: 'cards.user_id',
  },
}));

vi.mock('../db/schema/upload-sessions', () => ({
  uploadSessions: {
    id: 'upload_sessions.id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left, right) => ({ op: 'eq', left, right })),
  and: vi.fn((...conditions) => ({ op: 'and', conditions })),
}));

vi.mock('../config/env', () => ({
  env: {
    BASE_URL: 'https://community.example',
    UPLOAD_SESSION_TTL_MINUTES: 30,
  },
}));

async function buildCardTransferApp() {
  const { default: cardTransferRoutes } = await import('./card-transfer');
  const { default: errorHandlerPlugin } = await import('../plugins/error-handler.plugin');
  const app = Fastify();
  await errorHandlerPlugin(app, {});
  app.decorate('authenticate', async (request: { user?: unknown }) => {
    request.user = { userId: 'user-1', role: 'user', jti: 'jwt-1' };
  });
  await app.register(cardTransferRoutes);
  return app;
}

function transferMetadata() {
  return {
    transferKind: 'network-resource-card',
    cardId: CARD_ID,
    versionId: VERSION_ID,
    resourcePrefix: `cards/${CARD_ID}/versions/${VERSION_ID}/resources`,
    networkCardObjectKey: `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`,
  };
}

beforeEach(() => {
  dbUpdateCalls.length = 0;
  updatedCardResult = null;
  uploadSessionServiceMock.create.mockResolvedValue({
    id: VERSION_ID,
    fileName: 'demo.card',
    expiresAt: new Date('2026-08-05T00:30:00.000Z'),
    clientMetadata: {},
  });
  cardServiceMock.create.mockResolvedValue({
    id: CARD_ID,
  });
  createPresignedPutUrlMock.mockImplementation((input: { key: string; contentType: string }) => ({
    url: `https://s3.example/put/${input.key}`,
    method: 'PUT',
    headers: {
      'content-type': input.contentType,
    },
  }));
  createPresignedGetUrlMock.mockImplementation((input: { key: string }) => ({
    url: `https://s3.example/get/${input.key}`,
    method: 'GET',
    headers: {},
  }));
  headObjectMock.mockResolvedValue({ contentLength: 100 });
  cardRenderCacheServiceMock.enqueueForCard.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('card transfer routes', () => {
  it('creates client-owned upload sessions and records object-storage layout metadata', async () => {
    const app = await buildCardTransferApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/card-transfer/upload-sessions',
      payload: {
        fileName: 'demo.card',
        roomId: '33333333-3333-4333-8333-333333333333',
        idempotencyKey: 'idem-1',
        client: {
          name: 'desktop-transfer',
          version: '1.0.0',
          platform: 'desktop',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(roomServiceMock.assertOwnedByUser).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333',
      'user-1',
    );
    expect(uploadSessionServiceMock.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        contentType: 'card',
        visibility: 'public',
        fileName: 'demo.card',
        idempotencyKey: 'idem-1',
      }),
    );
    expect(cardServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        title: 'demo',
        visibility: 'public',
        fileSizeBytes: 0,
        publishedByClient: 'desktop-transfer',
        publishedClientVersion: '1.0.0',
      }),
    );
    expect(dbUpdateCalls[0]?.values).toMatchObject({
      resourcePrefix: `cards/${CARD_ID}/versions/${VERSION_ID}/resources`,
      clientMetadata: expect.objectContaining(transferMetadata()),
    });
    expect(response.json().data.networkCard).toMatchObject({
      bucket: 'chips-card-resources',
      objectKey: `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`,
      publicUrl: `https://cdn.example/chips-card-resources/cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`,
    });

    await app.close();
  });

  it('presigns only object-storage targets for resources and the network resource card', async () => {
    const app = await buildCardTransferApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: VERSION_ID,
      userId: 'user-1',
      clientMetadata: transferMetadata(),
    });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/objects:presign`,
      payload: {
        objects: [
          {
            role: 'resource',
            relativePath: 'images/hero.png',
            sizeBytes: 10,
            mimeType: 'image/png',
          },
          {
            role: 'network-card',
            sizeBytes: 100,
            mimeType: 'application/vnd.chips.card+zip',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(uploadSessionServiceMock.getOwned).toHaveBeenCalledWith(VERSION_ID, 'user-1');
    expect(createPresignedPutUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'chips-card-resources',
        key: `cards/${CARD_ID}/versions/${VERSION_ID}/resources/images/hero.png`,
        contentType: 'image/png',
      }),
    );
    expect(createPresignedPutUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'chips-card-resources',
        key: `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`,
        contentType: 'application/vnd.chips.card+zip',
      }),
    );
    expect(response.json().data.objects).toEqual([
      expect.objectContaining({
        role: 'resource',
        relativePath: 'images/hero.png',
        objectKey: `cards/${CARD_ID}/versions/${VERSION_ID}/resources/images/hero.png`,
        uploadUrl: `https://s3.example/put/cards/${CARD_ID}/versions/${VERSION_ID}/resources/images/hero.png`,
      }),
      expect.objectContaining({
        role: 'network-card',
        relativePath: null,
        objectKey: `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`,
      }),
    ]);

    await app.close();
  });

  it('completes uploads by saving the network resource manifest and queuing render caches', async () => {
    const app = await buildCardTransferApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: VERSION_ID,
      fileName: 'demo.card',
      userId: 'user-1',
      clientName: 'desktop-transfer',
      clientVersion: '1.0.0',
      clientMetadata: transferMetadata(),
    });
    headObjectMock.mockImplementation(async (input: { key: string }) => ({
      contentLength: input.key.endsWith('card.card') ? 100 : 10,
    }));
    updatedCardResult = {
      id: CARD_ID,
      status: 'ready',
    };

    const networkCardObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`;
    const resourceObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/resources/images/hero.png`;
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/complete`,
      payload: {
        title: 'Demo Card',
        cardFileId: 'AbCdEf1234',
        coverRatio: '3:4',
        networkCard: {
          bucket: 'chips-card-resources',
          objectKey: networkCardObjectKey,
          publicUrl: `https://cdn.example/chips-card-resources/${networkCardObjectKey}`,
          sizeBytes: 100,
          mimeType: 'application/vnd.chips.card+zip',
        },
        resources: [
          {
            originalRelativePath: 'images/hero.png',
            networkUrl: `https://cdn.example/chips-card-resources/${resourceObjectKey}`,
            bucket: 'chips-card-resources',
            objectKey: resourceObjectKey,
            publicUrl: `https://cdn.example/chips-card-resources/${resourceObjectKey}`,
            sizeBytes: 10,
            mimeType: 'image/png',
          },
        ],
        restoreManifest: {
          schemaVersion: '1.0.0',
          zipEntries: [{ path: 'images/hero.png', order: 1 }],
        },
        cardMetadata: {
          card_id: 'AbCdEf1234',
          name: 'Demo Card',
        },
        cardStructure: {
          structure: [],
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(headObjectMock).toHaveBeenCalledWith({
      bucket: 'chips-card-resources',
      key: networkCardObjectKey,
    });
    expect(headObjectMock).toHaveBeenCalledWith({
      bucket: 'chips-card-resources',
      key: resourceObjectKey,
    });
    const cardUpdate = dbUpdateCalls.find((call) => call.values.resourceManifest);
    expect(cardUpdate?.values).toMatchObject({
      title: 'Demo Card',
      cardFileId: 'AbCdEf1234',
      coverRatio: '3:4',
      fileSizeBytes: 100,
      sourceCardBucket: 'chips-card-resources',
      sourceCardKey: networkCardObjectKey,
      sourceCardSha256: null,
      publishedByClient: 'desktop-transfer',
      publishedClientVersion: '1.0.0',
      status: 'ready',
      resourceManifest: {
        schemaVersion: '1.0.0',
        mode: 'network-resource-card',
        cardId: CARD_ID,
        cardVersionId: VERSION_ID,
        networkCard: expect.objectContaining({
          objectKey: networkCardObjectKey,
          sizeBytes: 100,
        }),
        resources: [
          expect.objectContaining({
            originalRelativePath: 'images/hero.png',
            objectKey: resourceObjectKey,
          }),
        ],
        restoreManifest: expect.objectContaining({
          schemaVersion: '1.0.0',
        }),
      },
    });
    expect(cardRenderCacheServiceMock.enqueueForCard).toHaveBeenCalledWith({
      cardId: CARD_ID,
      createdBy: 'upload',
      renderProfile: 'community-web',
      priority: 50,
    });
    expect(cardRenderCacheServiceMock.enqueueForCard).toHaveBeenCalledWith({
      cardId: CARD_ID,
      createdBy: 'upload',
      renderProfile: 'community-cover',
      priority: 40,
    });
    expect(response.json().data).toMatchObject({
      cardId: CARD_ID,
      versionId: VERSION_ID,
      status: 'ready',
      renderStatus: 'queued',
      communityUrl: `https://community.example/cards/${CARD_ID}`,
    });

    await app.close();
  });

  it('rejects malformed restore manifests on complete', async () => {
    const app = await buildCardTransferApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: VERSION_ID,
      userId: 'user-1',
      clientMetadata: transferMetadata(),
    });

    const networkCardObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`;
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/complete`,
      payload: {
        title: 'Demo Card',
        networkCard: {
          bucket: 'chips-card-resources',
          objectKey: networkCardObjectKey,
          sizeBytes: 100,
          mimeType: 'application/vnd.chips.card+zip',
        },
        resources: [],
        restoreManifest: {
          zipEntries: [{ path: 'hero.png' }],
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(response.json().error.message).toContain('schemaVersion');

    await app.close();
  });

  it('rejects resource objects that do not belong to the upload session', async () => {
    const app = await buildCardTransferApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: VERSION_ID,
      userId: 'user-1',
      clientMetadata: transferMetadata(),
    });

    const networkCardObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`;
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/complete`,
      payload: {
        title: 'Demo Card',
        networkCard: {
          bucket: 'chips-card-resources',
          objectKey: networkCardObjectKey,
          sizeBytes: 100,
          mimeType: 'application/vnd.chips.card+zip',
        },
        resources: [
          {
            originalRelativePath: '../escape/hero.png',
            networkUrl: 'https://cdn.example/hero.png',
            bucket: 'chips-card-resources',
            objectKey: `cards/${CARD_ID}/versions/${VERSION_ID}/resources/../escape/hero.png`,
            sizeBytes: 10,
            mimeType: 'image/png',
          },
        ],
        restoreManifest: {
          schemaVersion: '1.0.0',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns download plans with object locations and restore manifests without streaming card bytes', async () => {
    const app = await buildCardTransferApp();
    const networkCardObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`;
    const resourceObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/resources/images/hero.png`;
    cardServiceMock.getAccessible.mockResolvedValue({
      id: CARD_ID,
      title: 'Demo Card',
      resourceManifest: {
        schemaVersion: '1.0.0',
        mode: 'network-resource-card',
        cardId: CARD_ID,
        cardVersionId: VERSION_ID,
        networkCard: {
          bucket: 'chips-card-resources',
          objectKey: networkCardObjectKey,
          publicUrl: `https://cdn.example/chips-card-resources/${networkCardObjectKey}`,
          sizeBytes: 100,
          mimeType: 'application/vnd.chips.card+zip',
        },
        resources: [
          {
            originalRelativePath: 'images/hero.png',
            networkUrl: `https://cdn.example/chips-card-resources/${resourceObjectKey}`,
            bucket: 'chips-card-resources',
            objectKey: resourceObjectKey,
            publicUrl: `https://cdn.example/chips-card-resources/${resourceObjectKey}`,
            sizeBytes: 10,
            mimeType: 'image/png',
          },
        ],
        restoreManifest: {
          schemaVersion: '1.0.0',
        },
      },
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/card-transfer/download-sessions',
      payload: {
        cardId: CARD_ID,
        client: {
          name: 'desktop-transfer',
        },
      },
    });

    expect(createResponse.statusCode).toBe(201);
    expect(cardServiceMock.getAccessible).toHaveBeenCalledWith(CARD_ID, 'user-1');
    expect(createResponse.json().data.planUrl).toBe(`/api/v1/card-transfer/download-sessions/${CARD_ID}/plan`);

    const planResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/card-transfer/download-sessions/${CARD_ID}/plan`,
    });

    expect(planResponse.statusCode).toBe(200);
    expect(createPresignedGetUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'chips-card-resources',
        key: networkCardObjectKey,
        responseContentDisposition: 'attachment; filename="Demo%20Card.card"',
      }),
    );
    expect(planResponse.json().data).toMatchObject({
      schemaVersion: '1.0.0',
      cardId: CARD_ID,
      versionId: VERSION_ID,
      suggestedFileName: 'Demo Card.card',
      networkCard: expect.objectContaining({
        bucket: 'chips-card-resources',
        objectKey: networkCardObjectKey,
        downloadUrl: `https://cdn.example/chips-card-resources/${networkCardObjectKey}`,
        presignedUrl: `https://s3.example/get/${networkCardObjectKey}`,
      }),
      resources: [
        expect.objectContaining({
          originalRelativePath: 'images/hero.png',
          objectKey: resourceObjectKey,
          downloadUrl: `https://cdn.example/chips-card-resources/${resourceObjectKey}`,
          presignedUrl: `https://s3.example/get/${resourceObjectKey}`,
        }),
      ],
      restoreManifest: {
        schemaVersion: '1.0.0',
      },
    });

    await app.close();
  });

  it('does not accept binary card payloads on the card-transfer control plane', async () => {
    const app = await buildCardTransferApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/card-transfer/upload-sessions',
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from('fake-card-zip-bytes'),
    });
    expect(createResponse.statusCode).toBe(415);

    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: VERSION_ID,
      userId: 'user-1',
      clientMetadata: transferMetadata(),
    });

    const networkCardObjectKey = `cards/${CARD_ID}/versions/${VERSION_ID}/network-card/card.card`;
    const completeResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/complete`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from('fake-network-card-bytes'),
    });
    expect(completeResponse.statusCode).toBe(415);

    const planResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/objects:presign`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from('fake-resource-bytes'),
    });
    expect(planResponse.statusCode).toBe(415);

    const noContentTypeResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/card-transfer/upload-sessions/${VERSION_ID}/objects:presign`,
      payload: JSON.stringify({ objects: [] }),
    });
    expect(noContentTypeResponse.statusCode).toBe(415);

    expect(cardServiceMock.getAccessible).not.toHaveBeenCalled();
    expect(cardRenderCacheServiceMock.enqueueForCard).not.toHaveBeenCalled();

    await app.close();
  });
});
