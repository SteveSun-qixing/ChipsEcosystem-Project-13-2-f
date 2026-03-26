/**
 * 箱子文件格式的 TypeScript 类型定义
 * 与 生态设计原稿/06-箱子文件格式.md 对齐
 */

/** .box/metadata.yaml 结构 */
export interface BoxMetadata {
  chip_standards_version: string;
  /** 10 位 62 进制 ID */
  id: string;
  name: string;
  /** 当前布局插件标识（如 "chips-official.grid-layout"） */
  layout_plugin?: string;
  tags?: string[][];
  created_at: string;
  updated_at: string;
  cover_ratio?: string;
}

/** structure.yaml 中单条卡片引用 */
export interface BoxCardRef {
  /** 卡片 URL（file:// 或 https://） */
  url: string;
  /** 卡片内置 62 进制 ID（摘要信息） */
  card_id?: string;
  /** 卡片标题摘要 */
  title?: string;
  /** 卡片封面 URL 摘要 */
  cover_url?: string;
  /** 排序位置 */
  sort_index?: number;
  /** 是否启用 */
  enabled?: boolean;
}

/** .box/structure.yaml 结构 */
export interface BoxStructure {
  cards: BoxCardRef[];
}

/** 箱子解包结果 */
export interface BoxUnpackResult {
  tempDir: string;
  metadata: BoxMetadata;
  structure: BoxStructure;
}
