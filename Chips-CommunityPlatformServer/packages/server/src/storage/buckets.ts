/**
 * MinIO / S3 兼容对象存储的 Bucket 名称常量。
 *
 * 命名规则：全小写，连字符分隔（S3 规范）
 * 路径规则：
 *   chips-card-resources/{userId}/{cardId}/{filename}
 *   chips-card-html/{userId}/{cardId}/index.html
 *   chips-avatars/{userId}/avatar.{ext}
 *   chips-covers/rooms/{roomId}/cover.{ext}
 */
export const Bucket = {
  /** 卡片内嵌资源文件（图片、视频、音频等），公开读 */
  CARD_RESOURCES: 'chips-card-resources',

  /** 卡片渲染后的 HTML，公开读 */
  CARD_HTML: 'chips-card-html',

  /** 用户头像，公开读 */
  AVATARS: 'chips-avatars',

  /** 封面图（房间、箱子等），公开读 */
  COVERS: 'chips-covers',
} as const;

export type BucketName = (typeof Bucket)[keyof typeof Bucket];

/** 所有需要在启动时创建的 bucket 列表，均开放公共读 */
export const PUBLIC_BUCKETS: BucketName[] = [
  Bucket.CARD_RESOURCES,
  Bucket.CARD_HTML,
  Bucket.AVATARS,
  Bucket.COVERS,
];
