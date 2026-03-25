import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── POST /api/v1/upload/card ─────────────────────────────────────

  fastify.post(
    '/api/v1/upload/card',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parts = request.parts();

      let fileBuffer: Buffer | null = null;
      let fileSizeBytes = 0;
      let roomId: string | undefined;
      let visibility: 'public' | 'private' = 'public';

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          // 校验文件扩展名
          if (!part.filename?.endsWith('.card')) {
            await part.toBuffer(); // drain
            throw AppError.badRequest(
              ErrorCode.FILE_TYPE_INVALID,
              'Only .card files are allowed',
            );
          }

          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            fileSizeBytes += chunk.length;
            if (fileSizeBytes > MAX_CARD_SIZE) {
              throw AppError.tooLarge(
                ErrorCode.FILE_TOO_LARGE,
                `Card file must be smaller than ${env.MAX_CARD_SIZE_MB}MB`,
              );
            }
            chunks.push(chunk as Buffer);
          }
          fileBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field') {
          if (part.fieldname === 'roomId') {
            roomId = part.value as string;
          } else if (part.fieldname === 'visibility') {
            const v = part.value as string;
            visibility = v === 'private' ? 'private' : 'public';
          }
        }
      }

      if (!fileBuffer || fileSizeBytes === 0) {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file provided');
      }

      // 验证 options（roomId 格式等）
      const opts = UploadCardSchema.parse({ roomId, visibility });
      if (opts.roomId) {
        await RoomService.assertOwnedByUser(opts.roomId, request.user!.userId);
      }

      // 保存到临时文件（流水线需要文件路径）
      const tempFileName = `ccps-upload-${uuidv4()}.card`;
      const tempFilePath = path.join(os.tmpdir(), tempFileName);
      fs.writeFileSync(tempFilePath, fileBuffer);

      // 创建卡片数据库记录
      const card = await CardService.create({
        userId: request.user!.userId,
        roomId: opts.roomId,
        visibility: opts.visibility,
        fileSizeBytes,
      });

      // 异步触发流水线（不阻塞响应）
      setImmediate(() => {
        runCardPipeline({
          cardFilePath: tempFilePath,
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
    },
  );

  // ─── POST /api/v1/upload/box ──────────────────────────────────────

  fastify.post(
    '/api/v1/upload/box',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parts = request.parts();

      let fileBuffer: Buffer | null = null;
      let fileSizeBytes = 0;
      let roomId: string | undefined;
      let visibility: 'public' | 'private' = 'public';

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          if (!part.filename?.endsWith('.box')) {
            await part.toBuffer();
            throw AppError.badRequest(
              ErrorCode.FILE_TYPE_INVALID,
              'Only .box files are allowed',
            );
          }

          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            fileSizeBytes += chunk.length;
            if (fileSizeBytes > MAX_BOX_SIZE) {
              throw AppError.tooLarge(
                ErrorCode.FILE_TOO_LARGE,
                `Box file must be smaller than ${env.MAX_BOX_SIZE_MB}MB`,
              );
            }
            chunks.push(chunk as Buffer);
          }
          fileBuffer = Buffer.concat(chunks);
        } else if (part.type === 'field') {
          if (part.fieldname === 'roomId') roomId = part.value as string;
          else if (part.fieldname === 'visibility') {
            visibility = (part.value as string) === 'private' ? 'private' : 'public';
          }
        }
      }

      if (!fileBuffer || fileSizeBytes === 0) {
        throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'No file provided');
      }

      const opts = UploadBoxSchema.parse({ roomId, visibility });
      if (opts.roomId) {
        await RoomService.assertOwnedByUser(opts.roomId, request.user!.userId);
      }

      const tempFileName = `ccps-upload-${uuidv4()}.box`;
      const tempFilePath = path.join(os.tmpdir(), tempFileName);
      fs.writeFileSync(tempFilePath, fileBuffer);

      const box = await BoxService.create({
        userId: request.user!.userId,
        roomId: opts.roomId,
        visibility: opts.visibility,
        boxFilePath: tempFilePath,
        fileSizeBytes,
      });

      return reply.status(201).send({
        data: {
          boxId: box.id,
          title: box.title,
        },
      });
    },
  );
};

export default uploadRoutes;
