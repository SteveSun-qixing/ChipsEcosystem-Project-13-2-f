import type { FastifyPluginAsync } from 'fastify';
import { CardService } from '../services/card.service';
import { UpdateCardSchema, PaginationSchema } from '../schemas/content.schemas';
import { UserService } from '../services/user.service';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';

const cardRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /api/v1/cards/:cardId ────────────────────────────────────

  fastify.get(
    '/api/v1/cards/:cardId',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { cardId } = request.params as { cardId: string };
      const card = await CardService.getAccessible(cardId, request.user?.userId ?? null);
      const owner = await UserService.findById(card.userId);
      return {
        data: {
          ...CardService.toDTO(card),
          user: owner ? UserService.toPublicProfile(owner) : null,
        },
      };
    },
  );

  // ─── GET /api/v1/cards/:cardId/status ─────────────────────────────

  fastify.get(
    '/api/v1/cards/:cardId/status',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { cardId } = request.params as { cardId: string };
      const card = await CardService.getAccessible(cardId, request.user?.userId ?? null);

      return {
        data: {
          cardId: card.id,
          status: card.status,
          errorMessage: card.errorMessage,
          htmlUrl: card.htmlUrl,
          updatedAt: card.updatedAt,
        },
      };
    },
  );

  // ─── PATCH /api/v1/cards/:cardId ──────────────────────────────────

  fastify.patch(
    '/api/v1/cards/:cardId',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { cardId } = request.params as { cardId: string };
      const body = UpdateCardSchema.parse(request.body);
      const card = await CardService.update(cardId, request.user!.userId, body);
      return { data: CardService.toDTO(card) };
    },
  );

  // ─── DELETE /api/v1/cards/:cardId ─────────────────────────────────

  fastify.delete(
    '/api/v1/cards/:cardId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { cardId } = request.params as { cardId: string };
      await CardService.delete(cardId, request.user!.userId);
      return reply.status(204).send();
    },
  );

  // ─── GET /api/v1/users/me/cards ───────────────────────────────────

  fastify.get(
    '/api/v1/users/me/cards',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const qs = PaginationSchema.parse(request.query);
      const result = await CardService.listByUser(
        request.user!.userId,
        request.user!.userId,
        qs,
      );
      return { data: result.items.map(CardService.toDTO), pagination: result.pagination };
    },
  );

  // ─── GET /api/v1/users/:username/cards ───────────────────────────

  fastify.get(
    '/api/v1/users/:username/cards',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request) => {
      const { username } = request.params as { username: string };
      const qs = PaginationSchema.parse(request.query);

      const owner = await UserService.findByUsername(username);
      if (!owner || !owner.isActive) {
        throw AppError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
      }

      const result = await CardService.listByUser(
        owner.id,
        request.user?.userId ?? null,
        qs,
        { visibility: 'public', status: 'ready' },
      );

      return {
        data: result.items.map(CardService.toSummaryDTO),
        pagination: result.pagination,
      };
    },
  );
};

export default cardRoutes;
