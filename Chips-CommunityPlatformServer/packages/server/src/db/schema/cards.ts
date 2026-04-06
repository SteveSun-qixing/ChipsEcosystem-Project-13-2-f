import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { rooms } from './rooms';

export const cardStatusEnum = pgEnum('card_status', [
  'pending',
  'processing',
  'ready',
  'error',
]);

export const cardVisibilityEnum = pgEnum('card_visibility', ['public', 'private']);

export const cards = pgTable('cards', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  /**
   * 卡片文件内置的 10 位 62 进制 ID（来自 .card/metadata.yaml 的 id 字段）
   * 可能为 null（上传流水线完成前）
   */
  cardFileId: varchar('card_file_id', { length: 10 }),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** 所属房间（null = 挂在用户根目录） */
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),

  /** 卡片标题（来自 metadata.yaml 的 name 字段） */
  title: text('title').notNull(),

  /** 卡片封面入口 URL（来自独立保存的封面 HTML 产物） */
  coverUrl: text('cover_url'),

  /** 渲染后 HTML 的 CDN 访问 URL */
  htmlUrl: text('html_url'),

  /** 完整 metadata.yaml 内容（结构化 JSON） */
  cardMetadata: jsonb('card_metadata'),

  /** 完整 structure.yaml 内容（结构化 JSON） */
  cardStructure: jsonb('card_structure'),

  /** 流水线处理状态 */
  status: cardStatusEnum('status').default('pending').notNull(),

  /** 流水线错误信息 */
  errorMessage: text('error_message'),

  visibility: cardVisibilityEnum('visibility').default('public').notNull(),

  /** 原始 .card 文件大小（字节） */
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`NOW()`)
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`NOW()`)
    .notNull(),
});

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
