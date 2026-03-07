/**
 * 命令类型定义
 */

import type { ImageItem, LayoutType, LayoutOptions } from './config';

/**
 * 图片操作命令
 */
export type ImageCommand =
  /** 添加图片 */
  | { type: 'add_image'; image: ImageItem }
  /** 删除图片 */
  | { type: 'remove_image'; imageId: string }
  /** 移动图片（排序） */
  | { type: 'move_image'; imageId: string; targetIndex: number }
  /** 更新图片信息 */
  | { type: 'update_image'; imageId: string; updates: Partial<ImageItem> }
  /** 设置排版类型 */
  | { type: 'set_layout_type'; layoutType: LayoutType }
  /** 更新排版选项 */
  | { type: 'update_layout_options'; options: Partial<LayoutOptions> }
  /** 批量添加图片 */
  | { type: 'batch_add_images'; images: ImageItem[] }
  /** 清空所有图片 */
  | { type: 'clear_all_images' }
  /** 替换图片 */
  | { type: 'replace_image'; imageId: string; newImage: ImageItem };
