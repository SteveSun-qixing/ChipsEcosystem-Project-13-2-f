import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roomServiceMock = {
  assertOwnedByUser: vi.fn(),
};
const uploadSessionServiceMock = {
  create: vi.fn(),
  getOwned: vi.fn(),
  presignResources: vi.fn(),
  verifyResources: vi.fn(),
  assertResourcesMatchCard: vi.fn(),
  markSourceReady: vi.fn(),
};
const cardServiceMock = {
  create: vi.fn(),
};
const boxServiceMock = {
  create: vi.fn(),
};
const uploadFileMock = vi.fn();
const enqueueForCardMock = vi.fn();
const inspectCardSourceFileMock = vi.fn();
const updateSetMock = vi.fn();

vi.mock('../services/room.service', () => ({
  RoomService: roomServiceMock,
}));

vi.mock('../services/upload-session.service', () => ({
  UploadSessionService: uploadSessionServiceMock,
}));

vi.mock('../services/card.service', () => ({
  CardService: cardServiceMock,
}));

vi.mock('../services/box.service', () => ({
  BoxService: boxServiceMock,
}));

vi.mock('../storage/s3', () => ({
  uploadFile: uploadFileMock,
}));

vi.mock('../storage/buckets', () => ({
  Bucket: {
    CARD_FILES: 'chips-card-files',
  },
}));

vi.mock('../utils/card-file', () => ({
  inspectCardSourceFile: inspectCardSourceFileMock,
}));

vi.mock('../services/card-render-cache.service', () => ({
  CardRenderCacheService: {
    viewRenderProfile: 'community-web',
    coverRenderProfile: 'community-cover',
    enqueueForCard: enqueueForCardMock,
  },
}));

vi.mock('../db/client', () => ({
  db: {
    update: vi.fn(() => ({
      set: updateSetMock,
    })),
  },
}));

vi.mock('../db/schema/cards', () => ({
  cards: {
    id: 'cards.id',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((left, right) => ({ op: 'eq', left, right })),
}));

vi.mock('../config/env', () => ({
  env: {
    BASE_URL: 'https://www.chipscard.space',
    MAX_CARD_SIZE_MB: 500,
    MAX_BOX_SIZE_MB: 100,
  },
}));

async function buildUploadApp() {
  const { default: uploadRoutes } = await import('./upload');
  const { default: errorHandlerPlugin } = await import('../plugins/error-handler.plugin');
  const app = Fastify();
  await app.register(fastifyMultipart, {
    attachFieldsToBody: false,
  });
  await errorHandlerPlugin(app, {});
  app.decorate('authenticate', async (request: { user?: unknown }) => {
    request.user = { userId: 'user-1', role: 'user', jti: 'jwt-1' };
  });
  await app.register(uploadRoutes);
  return app;
}

function createMultipartBody(params: {
  fields?: Record<string, string>;
  fileField?: string;
  filename?: string;
  contentType?: string;
  fileBody?: Buffer | string;
}) {
  const boundary = `----chips-upload-test-${Math.random().toString(16).slice(2)}`;
  const chunks: Buffer[] = [];

  for (const [name, value] of Object.entries(params.fields ?? {})) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  }

  if (params.fileField) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="${params.fileField}"; filename="${params.filename ?? 'demo.card'}"\r\n`,
      ),
    );
    chunks.push(Buffer.from(`Content-Type: ${params.contentType ?? 'application/octet-stream'}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(params.fileBody) ? params.fileBody : Buffer.from(params.fileBody ?? 'card-bytes'));
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

beforeEach(() => {
  updateSetMock.mockReturnValue({
    where: vi.fn(async () => undefined),
  });
  inspectCardSourceFileMock.mockResolvedValue({
    sha256: 'a'.repeat(64),
    sizeBytes: 128,
    metadata: {
      card_id: 'AbCdEf1234',
      name: '迁移测试卡片',
      cover_ratio: '3:4',
    },
    structure: {
      structure: [],
    },
    contentMap: new Map(),
    resourceFiles: [],
    title: '迁移测试卡片',
    cardFileId: 'AbCdEf1234',
    coverRatio: '3:4',
    coverHtml: '<!doctype html><title>迁移测试卡片</title>',
  });
  cardServiceMock.create.mockResolvedValue({
    id: 'card-1',
  });
  uploadFileMock.mockResolvedValue('');
  enqueueForCardMock.mockResolvedValue(undefined);
  uploadSessionServiceMock.verifyResources.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('upload routes', () => {
  it('creates upload sessions and checks room ownership', async () => {
    const app = await buildUploadApp();
    uploadSessionServiceMock.create.mockResolvedValue({
      id: 'upload-1',
      resourcePrefix: 'users/user-1/uploads/upload-1/resources',
      expiresAt: new Date('2026-05-29T10:00:00.000Z'),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/upload-sessions',
      payload: {
        contentType: 'card',
        roomId: '11111111-1111-4111-8111-111111111111',
        visibility: 'private',
        fileName: 'demo.card',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(roomServiceMock.assertOwnedByUser).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'user-1',
    );
    expect(uploadSessionServiceMock.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        contentType: 'card',
        visibility: 'private',
        fileName: 'demo.card',
      }),
    );
    expect(response.json().data.uploadId).toBe('upload-1');

    await app.close();
  });

  it('delegates resource presign requests to the upload session service', async () => {
    const app = await buildUploadApp();
    uploadSessionServiceMock.presignResources.mockResolvedValue({
      resources: [
        {
          relativePath: 'images/photo.png',
          publicUrl: 'https://file.example/photo.png',
          uploadUrl: 'https://s3.example/presigned',
          method: 'PUT',
          headers: { 'content-type': 'image/png' },
          expiresAt: new Date('2026-05-29T10:00:00.000Z'),
        },
      ],
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/upload-sessions/upload-1/resources/presign',
      payload: {
        resources: [
          {
            relativePath: 'images/photo.png',
            sizeBytes: 12,
            sha256: 'a'.repeat(64),
            mimeType: 'image/png',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(uploadSessionServiceMock.presignResources).toHaveBeenCalledWith(
      'upload-1',
      'user-1',
      expect.objectContaining({
        resources: [
          expect.objectContaining({
            relativePath: 'images/photo.png',
          }),
        ],
      }),
    );
    expect(response.json().data.resources[0].uploadUrl).toBe('https://s3.example/presigned');

    await app.close();
  });

  it('stores submitted processed cards as source files and enqueues view and cover rendering', async () => {
    const app = await buildUploadApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: 'upload-1',
      contentType: 'card',
      roomId: null,
      visibility: 'public',
      clientName: 'community-uploader',
      clientVersion: '1.0.0',
    });
    uploadSessionServiceMock.verifyResources.mockResolvedValue([
      {
        relativePath: 'images/photo.png',
        publicUrl: 'https://file.example/photo.png',
        sizeBytes: 12,
        sha256: 'a'.repeat(64),
        mimeType: 'image/png',
      },
    ]);
    const multipart = createMultipartBody({
      fields: {
        manifest: JSON.stringify({ rewrittenResources: 1 }),
      },
      fileField: 'file',
      filename: 'demo.card',
      contentType: 'application/vnd.chips.card+zip',
      fileBody: 'processed-card-bytes',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/upload-sessions/upload-1/card',
      headers: {
        'content-type': multipart.contentType,
      },
      payload: multipart.body,
    });

    expect(response.statusCode).toBe(202);
    expect(cardServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        visibility: 'public',
        title: '迁移测试卡片',
        cardFileId: 'AbCdEf1234',
        coverRatio: '3:4',
        resourceManifest: {
          clientManifest: { rewrittenResources: 1 },
          verifiedResources: [
            {
              relativePath: 'images/photo.png',
              publicUrl: 'https://file.example/photo.png',
              sizeBytes: 12,
              sha256: 'a'.repeat(64),
              mimeType: 'image/png',
            },
          ],
        },
        publishedByClient: 'community-uploader',
        publishedClientVersion: '1.0.0',
      }),
    );
    expect(uploadFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'chips-card-files',
        key: 'user-1/card-1/source.card',
        contentType: 'application/vnd.chips.card+zip',
      }),
    );
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceCardBucket: 'chips-card-files',
        sourceCardKey: 'user-1/card-1/source.card',
        sourceCardSha256: 'a'.repeat(64),
        status: 'ready',
      }),
    );
    expect(enqueueForCardMock).toHaveBeenCalledWith({
      cardId: 'card-1',
      createdBy: 'upload',
      renderProfile: 'community-web',
      priority: 100,
    });
    expect(enqueueForCardMock).toHaveBeenCalledWith({
      cardId: 'card-1',
      createdBy: 'upload',
      renderProfile: 'community-cover',
      priority: 90,
    });
    expect(uploadSessionServiceMock.markSourceReady).toHaveBeenCalledWith('upload-1', {
      sourceCardBucket: 'chips-card-files',
      sourceCardKey: 'user-1/card-1/source.card',
      sourceCardSha256: 'a'.repeat(64),
    });
    expect(response.json().data).toMatchObject({
      cardId: 'card-1',
      status: 'ready',
      renderStatus: 'queued',
      renderStatusUrl: '/api/v1/cards/card-1/render-status',
      communityUrl: 'https://www.chipscard.space/cards/card-1',
    });

    await app.close();
  });

  it('rejects submitting a card to a non-card upload session', async () => {
    const app = await buildUploadApp();
    uploadSessionServiceMock.getOwned.mockResolvedValue({
      id: 'upload-1',
      contentType: 'box',
      visibility: 'public',
    });
    const multipart = createMultipartBody({
      fileField: 'file',
      filename: 'demo.card',
      fileBody: 'processed-card-bytes',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/upload-sessions/upload-1/card',
      headers: {
        'content-type': multipart.contentType,
      },
      payload: multipart.body,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(uploadSessionServiceMock.verifyResources).not.toHaveBeenCalled();

    await app.close();
  });
});
