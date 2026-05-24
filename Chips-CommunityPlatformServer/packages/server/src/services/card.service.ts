import { eq, and, isNull, desc, count, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { cards, type Card, type NewCard } from '../db/schema/cards';
import { deleteObjectsByPrefix } from '../storage/s3';
import { Bucket } from '../storage/buckets';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';
import type { PaginationInput, UpdateCardInput } from '../schemas/content.schemas';

export interface PagedResult<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CardOpenViewRecord {
  id: string;
  userId: string;
  title: string;
  coverUrl: string | null;
  coverRatio: string | null;
  htmlUrl: string | null;
  cardStructure?: never;
  status: Card['status'];
  visibility: Card['visibility'];
  createdAt: Date;
  updatedAt: Date;
}

export interface CardSummaryRecord {
  id: string;
  title: string;
  coverUrl: string | null;
  coverRatio: string | null;
  htmlUrl: string | null;
  status: Card['status'];
  visibility: Card['visibility'];
  createdAt: Date;
}

function getCoverRatioFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const rawRatio = (metadata as { cover_ratio?: unknown }).cover_ratio;
  return typeof rawRatio === 'string' && rawRatio.trim() ? rawRatio.trim() : null;
}

async function paginateCardSummaries(
  where: SQL | undefined,
  pagination: PaginationInput,
): Promise<PagedResult<CardSummaryRecord>> {
  const { page, pageSize } = pagination;
  const offset = (page - 1) * pageSize;

  const [items, totalRows] = await Promise.all([
    db.query.cards.findMany({
      where,
      columns: {
        id: true,
        title: true,
        coverUrl: true,
        coverRatio: true,
        htmlUrl: true,
        status: true,
        visibility: true,
        createdAt: true,
      },
      orderBy: [desc(cards.createdAt)],
      limit: pageSize,
      offset,
    }),
    where
      ? db.select({ count: count() }).from(cards).where(where)
      : db.select({ count: count() }).from(cards),
  ]);

  const total = Number(totalRows[0]?.count ?? 0);
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export const CardService = {
  async create(params: {
    userId: string;
    roomId?: string;
    visibility: 'public' | 'private';
    fileSizeBytes: number;
  }): Promise<Card> {
    const [card] = await db
      .insert(cards)
      .values({
        userId: params.userId,
        roomId: params.roomId ?? null,
        title: '处理中…',
        visibility: params.visibility,
        fileSizeBytes: params.fileSizeBytes,
        status: 'pending',
      } as NewCard)
      .returning();
    return card;
  },

  async findById(cardId: string): Promise<Card | undefined> {
    return db.query.cards.findFirst({ where: eq(cards.id, cardId) });
  },

  async getAccessible(cardId: string, requesterId: string | null): Promise<Card> {
    const card = await this.findById(cardId);
    if (!card) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }
    if (card.visibility === 'private' && card.userId !== requesterId) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }
    return card;
  },

  async update(cardId: string, userId: string, patch: UpdateCardInput): Promise<Card> {
    const card = await this.findById(cardId);
    if (!card || card.userId !== userId) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }

    if (patch.roomId) {
      const { RoomService } = await import('./room.service.js');
      await RoomService.assertOwnedByUser(patch.roomId, userId);
    }

    const [updated] = await db
      .update(cards)
      .set({
        ...(patch.roomId !== undefined ? { roomId: patch.roomId } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardId))
      .returning();
    return updated;
  },

  async delete(cardId: string, userId: string): Promise<void> {
    const card = await this.findById(cardId);
    if (!card || card.userId !== userId) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }
    // 删除 CDN 资源
    await deleteObjectsByPrefix(Bucket.CARD_RESOURCES, `${userId}/${cardId}/`);
    await deleteObjectsByPrefix(Bucket.CARD_HTML, `${userId}/${cardId}/`);
    await deleteObjectsByPrefix(Bucket.COVERS, `cards/${userId}/${cardId}/`);
    // 删除数据库记录
    await db.delete(cards).where(eq(cards.id, cardId));
  },

  async markPipelineError(cardId: string, errorMessage: string): Promise<Card> {
    const [updated] = await db
      .update(cards)
      .set({
        status: 'error',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardId))
      .returning();
    return updated;
  },

  async listByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
    filters?: { roomId?: string; status?: string; visibility?: string },
  ): Promise<PagedResult<CardSummaryRecord>> {
    const isOwner = userId === requesterId;
    return paginateCardSummaries(
      and(
        eq(cards.userId, userId),
        filters?.visibility ? eq(cards.visibility, filters.visibility as Card['visibility']) : isOwner ? undefined : eq(cards.visibility, 'public'),
        filters?.status ? eq(cards.status, filters.status as Card['status']) : undefined,
      ),
      pagination,
    );
  },

  async listByRoom(
    roomId: string,
    requesterId: string | null,
    ownerUserId: string,
    pagination: PaginationInput,
  ): Promise<PagedResult<CardSummaryRecord>> {
    const isOwner = requesterId === ownerUserId;
    return paginateCardSummaries(
      and(
        eq(cards.roomId, roomId),
        isOwner ? undefined : eq(cards.visibility, 'public'),
        eq(cards.status, 'ready'),
      ),
      pagination,
    );
  },

  async listRootByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
  ): Promise<PagedResult<CardSummaryRecord>> {
    const isOwner = userId === requesterId;
    return paginateCardSummaries(
      and(
        eq(cards.userId, userId),
        isNull(cards.roomId),
        isOwner ? undefined : eq(cards.visibility, 'public'),
        eq(cards.status, 'ready'),
      ),
      pagination,
    );
  },

  toDTO(card: Card) {
    return {
      id: card.id,
      cardFileId: card.cardFileId,
      userId: card.userId,
      roomId: card.roomId,
      title: card.title,
      coverUrl: card.coverUrl,
      coverRatio: card.coverRatio ?? getCoverRatioFromMetadata(card.cardMetadata),
      htmlUrl: card.htmlUrl,
      status: card.status,
      visibility: card.visibility,
      fileSizeBytes: card.fileSizeBytes,
      cardMetadata: card.cardMetadata,
      cardStructure: card.cardStructure,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  },

  toSummaryDTO(card: CardSummaryRecord) {
    return {
      id: card.id,
      title: card.title,
      coverUrl: card.coverUrl,
      coverRatio: card.coverRatio,
      htmlUrl: card.htmlUrl,
      status: card.status,
      visibility: card.visibility,
      createdAt: card.createdAt,
    };
  },

  async getOpenViewAccessible(
    cardId: string,
    requesterId: string | null,
  ): Promise<CardOpenViewRecord> {
    const card = await db.query.cards.findFirst({
      where: eq(cards.id, cardId),
      columns: {
        id: true,
        userId: true,
        title: true,
        coverUrl: true,
        coverRatio: true,
        htmlUrl: true,
        cardStructure: false,
        status: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!card) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }
    if (card.visibility === 'private' && card.userId !== requesterId) {
      throw AppError.notFound(ErrorCode.CARD_NOT_FOUND, 'Card not found');
    }
    return card;
  },

  toOpenViewDTO(card: CardOpenViewRecord) {
    return {
      id: card.id,
      title: card.title,
      coverUrl: card.coverUrl,
      coverRatio: card.coverRatio,
      htmlUrl: card.htmlUrl,
      status: card.status,
      visibility: card.visibility,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  },
};
