/**
 * 常量定义
 */

import type { ImageCardConfig } from './config';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Omit<ImageCardConfig, 'images'> & { images: [] } = {
  card_type: 'ImageCard',
  theme: '',
  layout: { height_mode: 'auto' },
  images: [],
  layout_type: 'single',
  layout_options: {
    grid_mode: '2x2',
    scroll_mode: 'fixed-window',
    fixed_window_height: 600,
    single_width_percent: 100,
    single_alignment: 'center',
    gap: 8,
  },
};

/**
 * 默认接受的图片格式
 */
export const ACCEPTED_IMAGE_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/**
 * 接受的图片文件扩展名
 */
export const ACCEPTED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
];

/**
 * 默认最大图片大小（MB）
 */
export const DEFAULT_MAX_IMAGE_SIZE = 10;

/**
 * 默认最大图片数量
 */
export const DEFAULT_MAX_IMAGES = 50;

/**
 * 网格模式下的显示数量限制
 */
export const GRID_DISPLAY_LIMITS = {
  '2x2': 4,
  '3x3': 9,
  '3-column-infinite': Infinity,
} as const;

/**
 * 横向滑动默认速度
 */
export const HORIZONTAL_SCROLL_SPEED = 1;

/**
 * 样式类名前缀
 */
export const CSS_PREFIX = 'chips-image';

/**
 * CSS变量名
 */
export const CSS_VARS = {
  // 颜色
  textColor: `--${CSS_PREFIX}-text-color`,
  bgColor: `--${CSS_PREFIX}-bg-color`,
  borderColor: `--${CSS_PREFIX}-border-color`,
  overlayColor: `--${CSS_PREFIX}-overlay-color`,

  // 字体
  fontFamily: `--${CSS_PREFIX}-font-family`,
  fontSize: `--${CSS_PREFIX}-font-size`,

  // 间距
  gap: `--${CSS_PREFIX}-gap`,
  padding: `--${CSS_PREFIX}-padding`,

  // 图片
  objectFit: `--${CSS_PREFIX}-object-fit`,
  borderRadius: `--${CSS_PREFIX}-border-radius`,

  // 滚动
  scrollbarColor: `--${CSS_PREFIX}-scrollbar-color`,
  scrollbarWidth: `--${CSS_PREFIX}-scrollbar-width`,
} as const;
