/**
 * 图片卡片配置类型定义
 */

/**
 * 布局配置
 */
export interface ImageLayoutConfig {
  /** 高度模式 */
  height_mode?: 'auto' | 'fixed';
  /** 固定高度值（像素） */
  fixed_height?: number;
}

/**
 * 图片来源类型
 */
export type ImageSourceType = 'file' | 'url';

/**
 * 单张图片信息
 */
export interface ImageItem {
  /** 图片唯一ID（十位62进制） */
  id: string;
  /** 图片来源类型 */
  source: ImageSourceType;
  /** 本地文件路径（source=file时使用） */
  file_path?: string;
  /** 图片URL（source=url时使用） */
  url?: string;
  /** 图片替代文本 */
  alt?: string;
  /** 图片标题说明 */
  title?: string;
}

/**
 * 排版类型
 */
export type LayoutType = 'single' | 'grid' | 'long-scroll' | 'horizontal-scroll';

/**
 * 网格模式
 */
export type GridMode = '2x2' | '3x3' | '3-column-infinite';

/**
 * 长图滚动模式
 */
export type ScrollMode = 'fixed-window' | 'adaptive';

/**
 * 单张图片对齐方式
 */
export type SingleAlignment = 'left' | 'center' | 'right';

/**
 * 排版选项
 */
export interface LayoutOptions {
  /** 网格模式（layout_type=grid时使用） */
  grid_mode?: GridMode;
  /** 长图滚动模式（layout_type=long-scroll时使用） */
  scroll_mode?: ScrollMode;
  /** 固定窗口高度（scroll_mode=fixed-window时使用，像素） */
  fixed_window_height?: number;
  /** 单张图片宽度百分比（layout_type=single时使用，10-100） */
  single_width_percent?: number;
  /** 单张图片对齐方式（layout_type=single时使用） */
  single_alignment?: SingleAlignment;
  /** 图片间距（像素） */
  gap?: number;
}

/**
 * 图片卡片配置
 * 保存在复合卡片的 content/{ID}.yaml 文件中
 */
export interface ImageCardConfig {
  /** 卡片类型标识，固定为 "ImageCard" */
  card_type: 'ImageCard';
  /** 主题包标识，为空使用上级主题 */
  theme?: string;
  /** 布局参数 */
  layout?: ImageLayoutConfig;
  /** 图片列表 */
  images: ImageItem[];
  /** 排版类型 */
  layout_type: LayoutType;
  /** 排版选项 */
  layout_options?: LayoutOptions;
}
