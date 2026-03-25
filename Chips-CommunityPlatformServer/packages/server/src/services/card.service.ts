import { eq, and, isNull, desc } from 'drizzle-orm';
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
    // 删除数据库记录
    await db.delete(cards).where(eq(cards.id, cardId));
  },

  async listByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
    filters?: { roomId?: string; status?: string; visibility?: string },
  ): Promise<PagedResult<Card>> {
    const isOwner = userId === requesterId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allCards = await db.query.cards.findMany({
      where: and(
        eq(cards.userId, userId),
        isOwner ? undefined : eq(cards.visibility, 'public'),
        filters?.status ? eq(cards.status, filters.status as Card['status']) : undefined,
      ),
      orderBy: [desc(cards.createdAt)],
    });

    const total = allCards.length;
    const items = allCards.slice(offset, offset + pageSize);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async listByRoom(
    roomId: string,
    requesterId: string | null,
    ownerUserId: string,
    pagination: PaginationInput,
  ): Promise<PagedResult<Card>> {
    const isOwner = requesterId === ownerUserId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allCards = await db.query.cards.findMany({
      where: and(
        eq(cards.roomId, roomId),
        isOwner ? undefined : eq(cards.visibility, 'public'),
        eq(cards.status, 'ready'),
      ),
      orderBy: [desc(cards.createdAt)],
    });

    const total = allCards.length;
    return {
      items: allCards.slice(offset, offset + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async listRootByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
  ): Promise<PagedResult<Card>> {
    const isOwner = userId === requesterId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allCards = await db.query.cards.findMany({
      where: and(
        eq(cards.userId, userId),
        isNull(cards.roomId),
        isOwner ? undefined : eq(cards.visibility, 'public'),
        eq(cards.status, 'ready'),
      ),
      orderBy: [desc(cards.createdAt)],
    });

    const total = allCards.length;
    return {
      items: allCards.slice(offset, offset + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  toDTO(card: Card) {
    return {
      id: card.id,
      cardFileId: card.cardFileId,
      userId: card.userId,
      roomId: card.roomId,
      title: card.title,
      coverUrl: card.coverUrl,
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

  toSummaryDTO(card: Card) {
    return {
      id: card.id,
      title: card.title,
      coverUrl: card.coverUrl,
      htmlUrl: card.htmlUrl,
      status: card.status,
      visibility: card.visibility,
      createdAt: card.createdAt,
    };
  },
};
