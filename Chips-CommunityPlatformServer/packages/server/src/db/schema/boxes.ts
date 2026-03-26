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

export const boxVisibilityEnum = pgEnum('box_visibility', ['public', 'private']);

export const boxes = pgTable('boxes', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  /**
   * 箱子文件内置的 10 位 62 进制 ID（来自 .box/metadata.yaml 的 id 字段）
   */
  boxFileId: varchar('box_file_id', { length: 10 }),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** 所属房间（null = 挂在用户根目录） */
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),

  /** 箱子名称 */
  title: text('title').notNull(),

  /** 封面 URL */
  coverUrl: text('cover_url'),

  /** 完整 metadata.yaml 内容 */
  metadata: jsonb('metadata'),

  /** 完整 structure.yaml 内容（含卡片引用列表） */
  structure: jsonb('structure'),

  /** 当前布局插件标识（如 chips-official.grid-layout） */
  layoutPlugin: text('layout_plugin'),

  visibility: boxVisibilityEnum('visibility').default('public').notNull(),

  /** 原始 .box 文件大小（字节） */
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`NOW()`)
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`NOW()`)
    .notNull(),
});

export type Box = typeof boxes.$inferSelect;
export type NewBox = typeof boxes.$inferInsert;
