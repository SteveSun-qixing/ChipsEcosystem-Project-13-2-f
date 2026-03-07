/**
 * 富文本卡片配置类型定义
 */

/**
 * 布局配置
 */
export interface RichTextLayoutConfig {
  /** 高度模式 */
  height_mode?: 'auto' | 'fixed';
  /** 固定高度值（像素） */
  fixed_height?: number;
}

/**
 * 富文本卡片配置
 * 保存在复合卡片的 content/{ID}.yaml 文件中
 */
export interface RichTextCardConfig {
  /** 卡片类型标识，固定为 "RichTextCard" */
  card_type: 'RichTextCard';
  /** 主题包标识，为空使用上级主题 */
  theme?: string;
  /** 布局参数 */
  layout?: RichTextLayoutConfig;
  /** 内容来源 */
  content_source: 'file' | 'inline';
  /** 富文本文件路径（content_source=file时使用） */
  content_file?: string;
  /** 内联HTML内容（content_source=inline时使用） */
  content_text?: string;
  /** 是否显示工具栏 */
  toolbar?: boolean;
  /** 是否只读 */
  read_only?: boolean;
}
