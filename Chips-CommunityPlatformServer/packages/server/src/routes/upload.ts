import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import type { FastifyPluginAsync } from 'fastify';
import { CardService } from '../services/card.service';
import { BoxService } from '../services/box.service';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';
import { UploadCardSchema, UploadBoxSchema } from '../schemas/content.schemas';
import { runCardPipeline } from '../pipeline/card-pipeline';
import { env } from '../config/env';
import { RoomService } from '../services/room.service';

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

        // 创建卡片数据库记录
        const card = await CardService.create({
          userId: request.user!.userId,
          roomId: opts.roomId,
          visibility: opts.visibility,
          fileSizeBytes,
        });

        const pipelineFilePath = tempFilePath;
        tempFilePath = null;

        // 异步触发流水线（不阻塞响应）
        setImmediate(() => {
          runCardPipeline({
            cardFilePath: pipelineFilePath,
            cardDbId: card.id,
            userId: request.user!.userId,
          }).catch((err) => {
            console.error(`Card pipeline failed for card ${card.id}:`, err);
          });
        });

        return reply.status(202).send({
          data: {
            cardId: card.id,
            status: 'pending',
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
