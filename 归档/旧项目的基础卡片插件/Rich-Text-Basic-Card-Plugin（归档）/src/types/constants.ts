/**
 * 常量定义
 */

import type { RichTextCardConfig } from './config';

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Partial<RichTextCardConfig> = {
  theme: '',
  layout: { height_mode: 'auto' },
  toolbar: false,
  read_only: true,
};

/**
 * 预设字体大小
 */
export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

/**
 * 预设文字颜色
 */
export const PRESET_COLORS = [
  '#000000', // 黑色
  '#333333', // 深灰
  '#666666', // 中灰
  '#999999', // 浅灰
  '#FF0000', // 红色
  '#FF6600', // 橙色
  '#FFCC00', // 黄色
  '#33CC00', // 绿色
  '#0066FF', // 蓝色
  '#9900FF', // 紫色
];

/**
 * 预设背景颜色
 */
export const PRESET_HIGHLIGHTS = [
  'transparent',
  '#FFFF00', // 黄色
  '#00FF00', // 绿色
  '#00FFFF', // 青色
  '#FF00FF', // 品红
  '#FF6600', // 橙色
  '#FFB6C1', // 粉红
  '#E6E6FA', // 淡紫
  '#FFFACD', // 柠檬
  '#98FB98', // 淡绿
];

/**
 * 允许的HTML标签
 */
export const ALLOWED_TAGS = [
  'p',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'sup',
  'sub',
  'code',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
  'span',
  'div',
];

/**
 * 允许的属性映射
 */
export const ALLOWED_ATTRS: Record<string, string[]> = {
  '*': ['style', 'class'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
};

/**
 * 允许的URL协议
 */
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * 允许的样式属性
 */
export const ALLOWED_STYLES = [
  'color',
  'background-color',
  'font-size',
  'font-weight',
  'font-style',
  'text-align',
  'text-decoration',
];

/**
 * 样式类名前缀
 */
export const CSS_PREFIX = 'chips-richtext';

/**
 * CSS变量名
 */
export const CSS_VARS = {
  textColor: '--richtext-text-color',
  bgColor: '--richtext-bg-color',
  linkColor: '--richtext-link-color',
  borderColor: '--richtext-border-color',
  fontFamily: '--richtext-font-family',
  fontSize: '--richtext-font-size',
  lineHeight: '--richtext-line-height',
  paragraphSpacing: '--richtext-paragraph-spacing',
  listIndent: '--richtext-list-indent',
};

// 错误代码已移至 src/types/errors.ts
