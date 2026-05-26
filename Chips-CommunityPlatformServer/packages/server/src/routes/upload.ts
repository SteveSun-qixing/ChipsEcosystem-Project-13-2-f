import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { CardService } from '../services/card.service';
import { BoxService } from '../services/box.service';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';
import {
  CreateUploadSessionSchema,
  PresignUploadResourcesSchema,
  UploadCardSchema,
  UploadBoxSchema,
} from '../schemas/content.schemas';
import { env } from '../config/env';
import { RoomService } from '../services/room.service';
import { uploadFile } from '../storage/s3';
import { Bucket } from '../storage/buckets';
import { inspectCardSourceFile } from '../utils/card-file';
import { CardRenderCacheService } from '../services/card-render-cache.service';
import { UploadSessionService, type UploadSessionVerifiedResource } from '../services/upload-session.service';
import { db } from '../db/client';
import { cards } from '../db/schema/cards';

const MAX_CARD_SIZE = env.MAX_CARD_SIZE_MB * 1024 * 1024;
const MAX_BOX_SIZE = env.MAX_BOX_SIZE_MB * 1024 * 1024;

function createUploadTempFilePath(extension: '.card' | '.box'): string {
  return path.join(os.tmpdir(), `ccps-upload-${uuidv4()}${extension}`);
}

async function drainUploadStream(stream: AsyncIterable<unknown>): Promise<void> {
  for await (const chunk of stream) {
    void chunk;
    // Drain the stream without buffering invalid uploads in memory.
  }
}

async function writeUploadStreamToTempFile(params: {
  stream: NodeJS.ReadableStream;
  tempFilePath: string;
  maxSizeBytes: number;
  tooLargeMessage: string;
}): Promise<number> {
  let fileSizeBytes = 0;

  const sizeLimitStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      fileSizeBytes += chunk.length;
      if (fileSizeBytes > params.maxSizeBytes) {
        callback(AppError.tooLarge(ErrorCode.FILE_TOO_LARGE, params.tooLargeMessage));
        return;
      }

      callback(null, chunk);
    },
  });

  try {
    await pipeline(params.stream, sizeLimitStream, fs.createWriteStream(params.tempFilePath));
    return fileSizeBytes;
  } catch (err) {
    try {
      fs.rmSync(params.tempFilePath, { force: true });
    } catch {
      // ignore cleanup failure; original upload error is more useful
    }
    throw err;
  }
}

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── POST /api/v1/upload-sessions ────────────────────────────────

  fastify.post(
    '/api/v1/upload-sessions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const body = CreateUploadSessionSchema.parse(request.body);
      if (body.roomId) {
        await RoomService.assertOwnedByUser(body.roomId, request.user!.userId);
      }

      const session = await UploadSessionService.create(request.user!.userId, body);
      return reply.status(201).send({
        data: {
          uploadId: session.id,
          resourcePrefix: session.resourcePrefix,
          expiresAt: session.expiresAt,
        },
      });
    },
  );

  // ─── POST /api/v1/upload-sessions/:uploadId/resources/presign ────

  fastify.post(
    '/api/v1/upload-sessions/:uploadId/resources/presign',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { uploadId } = request.params as { uploadId: string };
      const body = PresignUploadResourcesSchema.parse(request.body);
      const data = await UploadSessionService.presignResources(uploadId, request.user!.userId, body);
      return { data };
    },
  );

  // ─── POST /api/v1/upload-sessions/:uploadId/card ────────────────

  fastify.post(
    '/api/v1/upload-sessions/:uploadId/card',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { uploadId } = request.params as { uploadId: string };
      const session = await UploadSessionService.getOwned(uploadId, request.user!.userId);
      if (session.contentType !== 'card') {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'Upload session is not for card content');
      }
      const verifiedResources = await UploadSessionService.verifyResources(session);

      const result = await receiveProcessedCardUpload({
        request,
        userId: request.user!.userId,
        roomId: session.roomId ?? undefined,
        visibility: session.visibility,
        uploadSessionId: session.id,
        clientName: session.clientName,
        clientVersion: session.clientVersion,
        verifiedResources,
      });

      await UploadSessionService.markSourceReady(session.id, {
        sourceCardBucket: result.sourceCardBucket,
        sourceCardKey: result.sourceCardKey,
        sourceCardSha256: result.sourceCardSha256,
      });

      return reply.status(202).send({
        data: {
          cardId: result.cardId,
          status: 'ready',
          renderStatus: 'queued',
          renderStatusUrl: `/api/v1/cards/${result.cardId}/render-status`,
          communityUrl: `${env.BASE_URL}/cards/${result.cardId}`,
        },
      });
    },
  );

  // ─── POST /api/v1/upload/card ─────────────────────────────────────

  fastify.post(
    '/api/v1/upload/card',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parts = request.parts();

      let tempFilePath: string | null = null;
      let fileSizeBytes = 0;
      let roomId: string | undefined;
      let visibility: 'public' | 'private' = 'public';

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          // 校验文件扩展名
          if (!part.filename?.endsWith('.card')) {
            await drainUploadStream(part.file);
            throw AppError.badRequest(
              ErrorCode.FILE_TYPE_INVALID,
              'Only .card files are allowed',
            );
          }

          tempFilePath = createUploadTempFilePath('.card');
          fileSizeBytes = await writeUploadStreamToTempFile({
            stream: part.file,
            tempFilePath,
            maxSizeBytes: MAX_CARD_SIZE,
            tooLargeMessage: `Card file must be smaller than ${env.MAX_CARD_SIZE_MB}MB`,
          });
        } else if (part.type === 'field') {
          if (part.fieldname === 'roomId') {
            roomId = part.value as string;
          } else if (part.fieldname === 'visibility') {
            const v = part.value as string;
            visibility = v === 'private' ? 'private' : 'public';
          }
        }
      }

      if (!tempFilePath || fileSizeBytes === 0) {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file provided');
      }

      try {
        // 验证 options（roomId 格式等）
        const opts = UploadCardSchema.parse({ roomId, visibility });
        if (opts.roomId) {
          await RoomService.assertOwnedByUser(opts.roomId, request.user!.userId);
        }

        const result = await persistProcessedCard({
          userId: request.user!.userId,
          roomId: opts.roomId,
          visibility: opts.visibility,
          filePath: tempFilePath,
          fileSizeBytes,
          publishedByClient: 'web',
          publishedClientVersion: null,
          resourceManifest: null,
        });
        fs.rmSync(tempFilePath, { force: true });
        tempFilePath = null;

        return reply.status(202).send({
          data: {
            cardId: result.cardId,
            status: 'ready',
            renderStatus: 'queued',
            renderStatusUrl: `/api/v1/cards/${result.cardId}/render-status`,
          },
        });
      } catch (err) {
        if (tempFilePath) {
          try {
            fs.rmSync(tempFilePath, { force: true });
          } catch {
            // ignore cleanup failure; request error will be reported
          }
        }
        throw err;
      }
    },
  );

  // ─── POST /api/v1/upload/box ──────────────────────────────────────

  fastify.post(
    '/api/v1/upload/box',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parts = request.parts();

      let tempFilePath: string | null = null;
      let fileSizeBytes = 0;
      let roomId: string | undefined;
      let visibility: 'public' | 'private' = 'public';

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          if (!part.filename?.endsWith('.box')) {
            await drainUploadStream(part.file);
            throw AppError.badRequest(
              ErrorCode.FILE_TYPE_INVALID,
              'Only .box files are allowed',
            );
          }

          tempFilePath = createUploadTempFilePath('.box');
          fileSizeBytes = await writeUploadStreamToTempFile({
            stream: part.file,
            tempFilePath,
            maxSizeBytes: MAX_BOX_SIZE,
            tooLargeMessage: `Box file must be smaller than ${env.MAX_BOX_SIZE_MB}MB`,
          });
        } else if (part.type === 'field') {
          if (part.fieldname === 'roomId') roomId = part.value as string;
          else if (part.fieldname === 'visibility') {
            visibility = (part.value as string) === 'private' ? 'private' : 'public';
          }
        }
      }

      if (!tempFilePath || fileSizeBytes === 0) {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file provided');
      }

      try {
        const opts = UploadBoxSchema.parse({ roomId, visibility });
        if (opts.roomId) {
          await RoomService.assertOwnedByUser(opts.roomId, request.user!.userId);
        }

        const boxFilePath = tempFilePath;
        const box = await BoxService.create({
          userId: request.user!.userId,
          roomId: opts.roomId,
          visibility: opts.visibility,
          boxFilePath,
          fileSizeBytes,
        });
        tempFilePath = null;

        return reply.status(201).send({
          data: {
            boxId: box.id,
            title: box.title,
          },
        });
      } catch (err) {
        if (tempFilePath) {
          try {
            fs.rmSync(tempFilePath, { force: true });
          } catch {
            // ignore cleanup failure; request error will be reported
          }
        }
        throw err;
      }
    },
  );
};

export default uploadRoutes;

async function receiveProcessedCardUpload(params: {
  request: FastifyRequest;
  userId: string;
  roomId?: string;
  visibility: 'public' | 'private';
  uploadSessionId?: string;
  clientName?: string | null;
  clientVersion?: string | null;
  verifiedResources?: UploadSessionVerifiedResource[];
}): Promise<{
  cardId: string;
  sourceCardBucket: string;
  sourceCardKey: string;
  sourceCardSha256: string;
}> {
  const parts = params.request.parts();
  let tempFilePath: string | null = null;
  let fileSizeBytes = 0;
  let manifest: unknown = null;

  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'file') {
      if (!part.filename?.endsWith('.card')) {
        await drainUploadStream(part.file);
        throw AppError.badRequest(ErrorCode.FILE_TYPE_INVALID, 'Only .card files are allowed');
      }

      tempFilePath = createUploadTempFilePath('.card');
      fileSizeBytes = await writeUploadStreamToTempFile({
        stream: part.file,
        tempFilePath,
        maxSizeBytes: MAX_CARD_SIZE,
        tooLargeMessage: `Card file must be smaller than ${env.MAX_CARD_SIZE_MB}MB`,
      });
    } else if (part.type === 'field' && part.fieldname === 'manifest') {
      try {
        manifest = typeof part.value === 'string' ? JSON.parse(part.value) : part.value;
      } catch {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'Invalid manifest JSON');
      }
    }
  }

  if (!tempFilePath || fileSizeBytes === 0) {
    throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file provided');
  }

  try {
    return await persistProcessedCard({
      userId: params.userId,
      roomId: params.roomId,
      visibility: params.visibility,
      filePath: tempFilePath,
      fileSizeBytes,
      publishedByClient: params.clientName ?? 'api',
      publishedClientVersion: params.clientVersion ?? null,
      resourceManifest: {
        clientManifest: manifest,
        verifiedResources: params.verifiedResources ?? [],
      },
      verifiedResources: params.verifiedResources ?? [],
    });
  } finally {
    if (tempFilePath) {
      fs.rmSync(tempFilePath, { force: true });
    }
  }
}

async function persistProcessedCard(params: {
  userId: string;
  roomId?: string;
  visibility: 'public' | 'private';
  filePath: string;
  fileSizeBytes: number;
  publishedByClient: string;
  publishedClientVersion: string | null;
  resourceManifest: unknown;
  verifiedResources?: UploadSessionVerifiedResource[];
}): Promise<{
  cardId: string;
  sourceCardBucket: string;
  sourceCardKey: string;
  sourceCardSha256: string;
}> {
  const inspection = await inspectCardSourceFile(params.filePath);
  if (params.verifiedResources && params.verifiedResources.length > 0) {
    UploadSessionService.assertResourcesMatchCard(inspection, params.verifiedResources);
  }

  const provisionalCard = await CardService.create({
    userId: params.userId,
    roomId: params.roomId,
    visibility: params.visibility,
    fileSizeBytes: params.fileSizeBytes,
    title: inspection.title,
    cardFileId: inspection.cardFileId,
    coverRatio: inspection.coverRatio,
    cardMetadata: inspection.metadata,
    cardStructure: inspection.structure,
    resourceManifest: params.resourceManifest,
    publishedByClient: params.publishedByClient,
    publishedClientVersion: params.publishedClientVersion,
  });
  const sourceCardKey = `${params.userId}/${provisionalCard.id}/source.card`;
  await uploadFile({
    bucket: Bucket.CARD_FILES,
    key: sourceCardKey,
    filePath: params.filePath,
    contentType: 'application/vnd.chips.card+zip',
  });

  await db
    .update(cards)
    .set({
      sourceCardBucket: Bucket.CARD_FILES,
      sourceCardKey,
      sourceCardSha256: inspection.sha256,
      sourceCardStoredAt: new Date(),
      publishedAt: new Date(),
      status: 'ready',
      updatedAt: new Date(),
    })
    .where(eq(cards.id, provisionalCard.id));

  await CardRenderCacheService.enqueueForCard({
    cardId: provisionalCard.id,
    createdBy: 'upload',
    renderProfile: CardRenderCacheService.viewRenderProfile,
    priority: 100,
  });
  await CardRenderCacheService.enqueueForCard({
    cardId: provisionalCard.id,
    createdBy: 'upload',
    renderProfile: CardRenderCacheService.coverRenderProfile,
    priority: 90,
  });

  return {
    cardId: provisionalCard.id,
    sourceCardBucket: Bucket.CARD_FILES,
    sourceCardKey,
    sourceCardSha256: inspection.sha256,
  };
}
