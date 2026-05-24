/**
 * MinIO / S3 兼容对象存储的 Bucket 名称常量。
 *
 * 命名规则：全小写，连字符分隔（S3 规范）
 * 路径规则：
 *   chips-card-resources/{userId}/{cardId}/{filename}
 *   chips-card-html/{userId}/{cardId}/index.html
 *   chips-card-pipeline-inputs/{userId}/{cardId}/source.card
 *   chips-avatars/{userId}/avatar.{ext}
 *   chips-covers/rooms/{roomId}/cover.{ext}
 *   chips-covers/cards/{userId}/{cardId}/index.html
 */
export const Bucket = {
  /** 卡片内嵌资源文件（图片、视频、音频等），公开读 */
  CARD_RESOURCES: 'chips-card-resources',

  /** 卡片渲染后的 HTML，公开读 */
  CARD_HTML: 'chips-card-html',

  /** 卡片转换队列原始输入文件，内部任务使用 */
  CARD_PIPELINE_INPUTS: 'chips-card-pipeline-inputs',

  /** 用户头像，公开读 */
  AVATARS: 'chips-avatars',

  /** 封面产物（房间/箱子图片与卡片封面 HTML），公开读 */
  COVERS: 'chips-covers',
} as const;

export type BucketName = (typeof Bucket)[keyof typeof Bucket];
export type PublicBucketName = Exclude<BucketName, typeof Bucket.CARD_PIPELINE_INPUTS>;

/** 需要公开访问的 bucket 列表 */
export const PUBLIC_BUCKETS: PublicBucketName[] = [
  Bucket.CARD_RESOURCES,
  Bucket.CARD_HTML,
  Bucket.AVATARS,
  Bucket.COVERS,
];

/** 只供服务端/worker 内部访问的 bucket 列表 */
export const PRIVATE_BUCKETS: BucketName[] = [
  Bucket.CARD_PIPELINE_INPUTS,
];

/** 所有需要在启动时创建的 bucket 列表 */
export const STORAGE_BUCKETS: BucketName[] = [...PUBLIC_BUCKETS, ...PRIVATE_BUCKETS];
