import { desc, eq, and, or, ilike } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';
import { cards } from '../db/schema/cards';
import { boxes } from '../db/schema/boxes';
import { users } from '../db/schema/users';
import { PaginationSchema, SearchSchema } from '../schemas/content.schemas';
import { CardService } from '../services/card.service';
import { BoxService } from '../services/box.service';
import { UserService } from '../services/user.service';

const discoverRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── GET /api/v1/discover/cards ───────────────────────────────────

  fastify.get('/api/v1/discover/cards', async (request) => {
    const qs = PaginationSchema.parse(request.query);
    const { page, pageSize } = qs;
    const offset = (page - 1) * pageSize;

    const allCards = await db.query.cards.findMany({
      where: and(eq(cards.visibility, 'public'), eq(cards.status, 'ready')),
      orderBy: [desc(cards.createdAt)],
    });

    const total = allCards.length;
    const items = allCards.slice(offset, offset + pageSize).map(CardService.toSummaryDTO);

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  });

  // ─── GET /api/v1/discover/boxes ───────────────────────────────────

  fastify.get('/api/v1/discover/boxes', async (request) => {
    const qs = PaginationSchema.parse(request.query);
    const { page, pageSize } = qs;
    const offset = (page - 1) * pageSize;

    const allBoxes = await db.query.boxes.findMany({
      where: eq(boxes.visibility, 'public'),
      orderBy: [desc(boxes.createdAt)],
    });

    const total = allBoxes.length;
    const items = allBoxes.slice(offset, offset + pageSize).map(BoxService.toDTO);

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  });

  // ─── GET /api/v1/search ───────────────────────────────────────────

  fastify.get('/api/v1/search', async (request) => {
    const qs = SearchSchema.parse(request.query);
    const { q, type, page, pageSize } = qs;
    const offset = (page - 1) * pageSize;
    const pattern = `%${q}%`;

    const result: {
      cards?: ReturnType<typeof CardService.toSummaryDTO>[];
      boxes?: ReturnType<typeof BoxService.toDTO>[];
      users?: ReturnType<typeof UserService.toPublicProfile>[];
    } = {};

    if (type.includes('card')) {
      const matched = await db.query.cards.findMany({
        where: and(
          eq(cards.visibility, 'public'),
          eq(cards.status, 'ready'),
          ilike(cards.title, pattern),
        ),
        orderBy: [desc(cards.createdAt)],
      });
      result.cards = matched.slice(offset, offset + pageSize).map(CardService.toSummaryDTO);
    }

    if (type.includes('box')) {
      const matched = await db.query.boxes.findMany({
        where: and(eq(boxes.visibility, 'public'), ilike(boxes.title, pattern)),
        orderBy: [desc(boxes.createdAt)],
      });
      result.boxes = matched.slice(offset, offset + pageSize).map(BoxService.toDTO);
    }

    if (type.includes('user')) {
      const matched = await db.query.users.findMany({
        where: and(
          eq(users.isActive, true),
          or(ilike(users.username, pattern), ilike(users.displayName, pattern)),
        ),
        orderBy: [desc(users.createdAt)],
      });
      result.users = matched
        .slice(offset, offset + pageSize)
        .map(UserService.toPublicProfile);
    }

    return { data: result, pagination: { page, pageSize } };
  });
};

export default discoverRoutes;
