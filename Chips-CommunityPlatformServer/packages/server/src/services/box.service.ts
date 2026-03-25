import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as yaml from 'js-yaml';
import * as unzipper from 'unzipper';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { boxes, type Box, type NewBox } from '../db/schema/boxes';
import { cards } from '../db/schema/cards';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../errors/codes';
import type { BoxMetadata, BoxStructure, BoxUnpackResult, BoxCardRef } from '../types/box';
import type { PaginationInput, UpdateBoxInput } from '../schemas/content.schemas';
import type { PagedResult } from './card.service';

/** ZIP 魔数 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

async function validateZipMagic(filePath: string): Promise<void> {
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(4);
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);
  if (!header.equals(ZIP_MAGIC)) {
    throw AppError.badRequest(ErrorCode.FILE_CORRUPT, 'File is not a valid ZIP archive');
  }
}

async function extractZip(filePath: string, tempDir: string): Promise<void> {
  const realTempDir = fs.realpathSync(tempDir);
  await fs
    .createReadStream(filePath)
    .pipe(unzipper.Parse({ forceStream: true }))
    .on('entry', (entry: unzipper.Entry) => {
      const destPath = path.resolve(realTempDir, entry.path);
      if (!destPath.startsWith(realTempDir + path.sep) && destPath !== realTempDir) {
        entry.autodrain();
        return;
      }
      if (entry.type === 'Directory') {
        fs.mkdirSync(destPath, { recursive: true });
        entry.autodrain();
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        entry.pipe(fs.createWriteStream(destPath));
      }
    })
    .promise();
}

async function unpackBox(boxFilePath: string): Promise<BoxUnpackResult> {
  await validateZipMagic(boxFilePath);

  const tempDir = path.join(os.tmpdir(), `ccps-box-${uuidv4()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await extractZip(boxFilePath, tempDir);

    const boxConfigDir = path.join(tempDir, '.box');
    if (!fs.existsSync(boxConfigDir)) {
      throw AppError.badRequest(ErrorCode.FILE_CORRUPT, 'Invalid .box file: missing .box/ directory');
    }

    const metaPath = path.join(boxConfigDir, 'metadata.yaml');
    const structPath = path.join(boxConfigDir, 'structure.yaml');

    if (!fs.existsSync(metaPath)) {
      throw AppError.badRequest(ErrorCode.FILE_CORRUPT, 'Invalid .box file: missing metadata.yaml');
    }

    const metadata = yaml.load(fs.readFileSync(metaPath, 'utf-8')) as BoxMetadata;
    const structure = fs.existsSync(structPath)
      ? (yaml.load(fs.readFileSync(structPath, 'utf-8')) as BoxStructure)
      : { cards: [] };

    return { tempDir, metadata, structure };
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw err;
  }
}

export const BoxService = {
  async create(params: {
    userId: string;
    roomId?: string;
    visibility: 'public' | 'private';
    boxFilePath: string;
    fileSizeBytes: number;
  }): Promise<Box> {
    const { userId, roomId, visibility, boxFilePath, fileSizeBytes } = params;

    const unpackResult = await unpackBox(boxFilePath);

    try {
      const [box] = await db
        .insert(boxes)
        .values({
          userId,
          roomId: roomId ?? null,
          boxFileId: unpackResult.metadata.id,
          title: unpackResult.metadata.name,
          layoutPlugin: unpackResult.metadata.layout_plugin ?? null,
          metadata: unpackResult.metadata as unknown as Record<string, unknown>,
          structure: unpackResult.structure as unknown as Record<string, unknown>,
          visibility,
          fileSizeBytes,
        } as NewBox)
        .returning();

      return box;
    } finally {
      fs.rmSync(unpackResult.tempDir, { recursive: true, force: true });
      try { fs.rmSync(boxFilePath, { force: true }); } catch { /* ignore */ }
    }
  },

  async findById(boxId: string): Promise<Box | undefined> {
    return db.query.boxes.findFirst({ where: eq(boxes.id, boxId) });
  },

  async getAccessible(boxId: string, requesterId: string | null): Promise<Box> {
    const box = await this.findById(boxId);
    if (!box) {
      throw AppError.notFound(ErrorCode.BOX_NOT_FOUND, 'Box not found');
    }
    if (box.visibility === 'private' && box.userId !== requesterId) {
      throw AppError.notFound(ErrorCode.BOX_NOT_FOUND, 'Box not found');
    }
    return box;
  },

  async update(boxId: string, userId: string, patch: UpdateBoxInput): Promise<Box> {
    const box = await this.findById(boxId);
    if (!box || box.userId !== userId) {
      throw AppError.notFound(ErrorCode.BOX_NOT_FOUND, 'Box not found');
    }

    if (patch.roomId) {
      const { RoomService } = await import('./room.service.js');
      await RoomService.assertOwnedByUser(patch.roomId, userId);
    }

    const [updated] = await db
      .update(boxes)
      .set({
        ...(patch.roomId !== undefined ? { roomId: patch.roomId } : {}),
        ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
        updatedAt: new Date(),
      })
      .where(eq(boxes.id, boxId))
      .returning();
    return updated;
  },

  async delete(boxId: string, userId: string): Promise<void> {
    const box = await this.findById(boxId);
    if (!box || box.userId !== userId) {
      throw AppError.notFound(ErrorCode.BOX_NOT_FOUND, 'Box not found');
    }
    await db.delete(boxes).where(eq(boxes.id, boxId));
  },

  /**
   * 将 structure.cards 中的引用与社区内卡片进行匹配
   */
  async enrichCardRefs(
    structure: BoxStructure,
  ): Promise<(BoxCardRef & { communityCardId?: string; communityHtmlUrl?: string })[]> {
    const refs = structure.cards ?? [];

    return Promise.all(
      refs.map(async (ref) => {
        if (!ref.card_id) return ref;

        const communityCard = await db.query.cards.findFirst({
          where: and(
            eq(cards.cardFileId, ref.card_id),
            eq(cards.status, 'ready'),
            eq(cards.visibility, 'public'),
          ),
        });

        return {
          ...ref,
          communityCardId: communityCard?.id,
          communityHtmlUrl: communityCard?.htmlUrl ?? undefined,
        };
      }),
    );
  },

  async listByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
  ): Promise<PagedResult<Box>> {
    const isOwner = userId === requesterId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allBoxes = await db.query.boxes.findMany({
      where: and(
        eq(boxes.userId, userId),
        isOwner ? undefined : eq(boxes.visibility, 'public'),
      ),
      orderBy: [desc(boxes.createdAt)],
    });

    const total = allBoxes.length;
    return {
      items: allBoxes.slice(offset, offset + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async listByRoom(
    roomId: string,
    requesterId: string | null,
    ownerUserId: string,
    pagination: PaginationInput,
  ): Promise<PagedResult<Box>> {
    const isOwner = requesterId === ownerUserId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allBoxes = await db.query.boxes.findMany({
      where: and(
        eq(boxes.roomId, roomId),
        isOwner ? undefined : eq(boxes.visibility, 'public'),
      ),
      orderBy: [desc(boxes.createdAt)],
    });

    const total = allBoxes.length;
    return {
      items: allBoxes.slice(offset, offset + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  async listRootByUser(
    userId: string,
    requesterId: string | null,
    pagination: PaginationInput,
  ): Promise<PagedResult<Box>> {
    const isOwner = userId === requesterId;
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const allBoxes = await db.query.boxes.findMany({
      where: and(
        eq(boxes.userId, userId),
        isNull(boxes.roomId),
        isOwner ? undefined : eq(boxes.visibility, 'public'),
      ),
      orderBy: [desc(boxes.createdAt)],
    });

    const total = allBoxes.length;
    return {
      items: allBoxes.slice(offset, offset + pageSize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  toDTO(box: Box) {
    return {
      id: box.id,
      boxFileId: box.boxFileId,
      userId: box.userId,
      roomId: box.roomId,
      title: box.title,
      coverUrl: box.coverUrl,
      layoutPlugin: box.layoutPlugin,
      visibility: box.visibility,
      fileSizeBytes: box.fileSizeBytes,
      metadata: box.metadata,
      createdAt: box.createdAt,
      updatedAt: box.updatedAt,
    };
  },
};
