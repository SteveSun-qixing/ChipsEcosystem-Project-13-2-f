import { eq, desc, ilike, or, count, sql, gte, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client';
import { users } from '../db/schema/users';
import { cards } from '../db/schema/cards';
import { boxes } from '../db/schema/boxes';
import { CardService } from '../services/card.service';
import { BoxService } from '../services/box.service';
import { deleteObjectsByPrefix } from '../storage/s3';
import { Bucket } from '../storage/buckets';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── 所有 admin 路由需要 admin 角色 ──────────────────────────────

  fastify.addHook('preHandler', fastify.requireAdmin);

  // ─── GET /admin/api/v1/stats ──────────────────────────────────────

  fastify.get('/api/v1/stats', async () => {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [cardCount] = await db.select({ count: count() }).from(cards);
    const [boxCount] = await db.select({ count: count() }).from(boxes);
    const [cardStorage] = await db
      .select({ total: sql<number>`COALESCE(SUM(${cards.fileSizeBytes}), 0)` })
      .from(cards);
    const [boxStorage] = await db
      .select({ total: sql<number>`COALESCE(SUM(${boxes.fileSizeBytes}), 0)` })
      .from(boxes);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayUsers] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, todayStart));
    const [todayCards] = await db
      .select({ count: count() })
      .from(cards)
      .where(gte(cards.createdAt, todayStart));
    const [todayBoxes] = await db
      .select({ count: count() })
      .from(boxes)
      .where(gte(boxes.createdAt, todayStart));

    return {
      data: {
        userCount: Number(userCount?.count ?? 0),
        cardCount: Number(cardCount?.count ?? 0),
        boxCount: Number(boxCount?.count ?? 0),
        totalStorageBytes:
          Number(cardStorage?.total ?? 0) + Number(boxStorage?.total ?? 0),
        today: {
          userCount: Number(todayUsers?.count ?? 0),
          cardCount: Number(todayCards?.count ?? 0),
          boxCount: Number(todayBoxes?.count ?? 0),
        },
      },
    };
  });

  // ─── GET /admin/api/v1/users ──────────────────────────────────────

  fastify.get('/api/v1/users', async (request) => {
    const qs = request.query as { page?: string; pageSize?: string; q?: string };
    const page = Math.max(1, parseInt(qs.page ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(qs.pageSize ?? '20', 10)));
    const q = qs.q ?? '';

    const allUsers = await db.query.users.findMany({
      where: q
        ? or(ilike(users.username, `%${q}%`), ilike(users.displayName, `%${q}%`))
        : undefined,
      orderBy: [desc(users.createdAt)],
    });

    const total = allUsers.length;
    const offset = (page - 1) * pageSize;
    const pagedUsers = allUsers.slice(offset, offset + pageSize);
    const userIds = pagedUsers.map((user) => user.id);

    const cardStorageRows = userIds.length
      ? await db
          .select({
            userId: cards.userId,
            total: sql<number>`COALESCE(SUM(${cards.fileSizeBytes}), 0)`,
          })
          .from(cards)
          .where(inArray(cards.userId, userIds))
          .groupBy(cards.userId)
      : [];

    const boxStorageRows = userIds.length
      ? await db
          .select({
            userId: boxes.userId,
            total: sql<number>`COALESCE(SUM(${boxes.fileSizeBytes}), 0)`,
          })
          .from(boxes)
          .where(inArray(boxes.userId, userIds))
          .groupBy(boxes.userId)
      : [];

    const storageByUserId = new Map<string, number>();

    for (const row of cardStorageRows) {
      storageByUserId.set(row.userId, Number(row.total ?? 0));
    }

    for (const row of boxStorageRows) {
      storageByUserId.set(
        row.userId,
        (storageByUserId.get(row.userId) ?? 0) + Number(row.total ?? 0),
      );
    }

    const items = pagedUsers.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      isActive: u.isActive,
      storageBytes: storageByUserId.get(u.id) ?? 0,
      createdAt: u.createdAt,
    }));

    return {
      data: items,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  });

  // ─── PATCH /admin/api/v1/users/:userId ───────────────────────────

  fastify.patch('/api/v1/users/:userId', async (request) => {
    const { userId } = request.params as { userId: string };
    const body = request.body as { isActive?: boolean };

    if (typeof body.isActive !== 'boolean') {
      throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'isActive (boolean) is required');
    }

    const [updated] = await db
      .update(users)
      .set({ isActive: body.isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw AppError.notFound(ErrorCode.USER_NOT_FOUND, 'User not found');
    }

    return { data: { id: updated.id, isActive: updated.isActive } };
  });

  // ─── GET /admin/api/v1/content ────────────────────────────────────

  fastify.get('/api/v1/content', async (request) => {
    const qs = request.query as { page?: string; pageSize?: string; type?: string; q?: string };
    const page = Math.max(1, parseInt(qs.page ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(qs.pageSize ?? '20', 10)));
    const type = qs.type && ['card', 'box'].includes(qs.type) ? qs.type : 'card';
    const q = qs.q ?? '';
    const offset = (page - 1) * pageSize;

    if (type === 'card') {
      const allCards = await db.query.cards.findMany({
        where: q ? ilike(cards.title, `%${q}%`) : undefined,
        orderBy: [desc(cards.createdAt)],
      });
      return {
        data: allCards.slice(offset, offset + pageSize).map(CardService.toDTO),
        pagination: { page, pageSize, total: allCards.length, totalPages: Math.ceil(allCards.length / pageSize) },
      };
    }

    const allBoxes = await db.query.boxes.findMany({
      where: q ? ilike(boxes.title, `%${q}%`) : undefined,
      orderBy: [desc(boxes.createdAt)],
    });
    return {
      data: allBoxes.slice(offset, offset + pageSize).map(BoxService.toDTO),
      pagination: { page, pageSize, total: allBoxes.length, totalPages: Math.ceil(allBoxes.length / pageSize) },
    };
  });

  // ─── DELETE /admin/api/v1/content/:type/:id ──────────────────────

  fastify.delete('/api/v1/content/:type/:id', async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };

    if (type === 'card') {
      const card = await db.query.cards.findFirst({ where: eq(cards.id, id) });
      if (!card) {
        throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
      }
      await deleteObjectsByPrefix(Bucket.CARD_RESOURCES, `${card.userId}/${id}/`);
      await deleteObjectsByPrefix(Bucket.CARD_HTML, `${card.userId}/${id}/`);
      await db.delete(cards).where(eq(cards.id, id));
    } else if (type === 'box') {
      const box = await db.query.boxes.findFirst({ where: eq(boxes.id, id) });
      if (!box) {
        throw AppError.notFound(ErrorCode.BOX_NOT_FOUND, 'Box not found');
      }
      await db.delete(boxes).where(eq(boxes.id, id));
    } else {
      throw AppError.badRequest(ErrorCode.VALIDATION_ERROR, 'type must be card or box');
    }

    return reply.status(204).send();
  });
};

export default adminRoutes;
