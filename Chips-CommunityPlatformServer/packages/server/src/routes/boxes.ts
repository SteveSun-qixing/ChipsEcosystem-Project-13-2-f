import type { FastifyPluginAsync } from 'fastify';
import { BoxService } from '../services/box.service';
import { UpdateBoxSchema, PaginationSchema } from '../schemas/content.schemas';
import type { BoxStructure } from '../types/box';
import { UserService } from '../services/user.service';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';

const boxRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /api/v1/boxes/:boxId ─────────────────────────────────────

  fastify.get(
    '/api/v1/boxes/:boxId',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { boxId } = request.params as { boxId: string };
      const box = await BoxService.getAccessible(boxId, request.user?.userId ?? null);

      // 补充卡片引用的社区匹配信息
      const enrichedCards = await BoxService.enrichCardRefs(
        (box.structure as BoxStructure) ?? { cards: [] },
      );
      const owner = await UserService.findById(box.userId);

      return {
        data: {
          ...BoxService.toDTO(box),
          cards: enrichedCards,
          user: owner ? UserService.toPublicProfile(owner) : null,
        },
      };
    },
  );

  // ─── PATCH /api/v1/boxes/:boxId ───────────────────────────────────

  fastify.patch(
    '/api/v1/boxes/:boxId',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { boxId } = request.params as { boxId: string };
      const body = UpdateBoxSchema.parse(request.body);
      const box = await BoxService.update(boxId, request.user!.userId, body);
      return { data: BoxService.toDTO(box) };
    },
  );

  // ─── DELETE /api/v1/boxes/:boxId ──────────────────────────────────

  fastify.delete(
    '/api/v1/boxes/:boxId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { boxId } = request.params as { boxId: string };
      await BoxService.delete(boxId, request.user!.userId);
      return reply.status(204).send();
    },
  );

  // ─── GET /api/v1/users/me/boxes ───────────────────────────────────

  fastify.get(
    '/api/v1/users/me/boxes',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const qs = PaginationSchema.parse(request.query);
      const result = await BoxService.listByUser(
        request.user!.userId,
        request.user!.userId,
        qs,
      );
      return { data: result.items.map(BoxService.toDTO), pagination: result.pagination };
    },
  );

  // ─── GET /api/v1/users/:username/boxes ───────────────────────────

  fastify.get(
    '/api/v1/users/:username/boxes',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { username } = request.params as { username: string };
      const qs = PaginationSchema.parse(request.query);

      const owner = await UserService.findByUsername(username);
      if (!owner || !owner.isActive) {
        throw AppError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      const result = await BoxService.listByUser(owner.id, request.user?.userId ?? null, qs, {
        visibility: 'public',
      });
      return {
        data: result.items.map(BoxService.toDTO),
        pagination: result.pagination,
      };
    },
  );
};

export default boxRoutes;
