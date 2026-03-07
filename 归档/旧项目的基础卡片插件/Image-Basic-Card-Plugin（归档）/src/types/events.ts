/**
 * 事件类型定义
 */

import type { ImageCardConfig, ImageItem } from './config';

/**
 * 配置变更事件
 */
export interface ImageChangeEvent {
  type: 'change';
  config: ImageCardConfig;
  isUserAction: boolean;
  timestamp: number;
}

/**
 * 图片添加事件
 */
export interface ImageAddEvent {
  type: 'imageAdd';
  image: ImageItem;
  index: number;
}

/**
 * 图片删除事件
 */
export interface ImageRemoveEvent {
  type: 'imageRemove';
  imageId: string;
  index: number;
}

/**
 * 图片排序变更事件
 */
export interface ImageReorderEvent {
  type: 'imageReorder';
  imageId: string;
  fromIndex: number;
  toIndex: number;
}

/**
 * 图片选中事件
 */
export interface ImageSelectEvent {
  type: 'imageSelect';
  imageId: string | null;
}

/**
 * 图片点击事件（渲染器）
 */
export interface ImageClickEvent {
  type: 'imageClick';
  imageId: string;
  index: number;
  src: string;
}

/**
 * 编辑器事件映射
 */
export interface EditorEvents {
  change: (event: ImageChangeEvent) => void;
  imageAdd: (event: ImageAddEvent) => void;
  imageRemove: (event: ImageRemoveEvent) => void;
  imageReorder: (event: ImageReorderEvent) => void;
  imageSelect: (event: ImageSelectEvent) => void;
}

/**
 * 渲染器事件映射
 */
export interface RendererEvents {
  imageClick: (event: ImageClickEvent) => void;
}
