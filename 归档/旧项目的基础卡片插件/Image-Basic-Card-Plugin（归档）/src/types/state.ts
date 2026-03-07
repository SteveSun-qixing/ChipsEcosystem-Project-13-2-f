/**
 * 状态类型定义
 */

import type { ImageItem, LayoutType } from './config';

/**
 * 渲染器状态
 */
export interface ImageRendererState {
  /** 已加载的图片列表 */
  loadedImages: string[];
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前主题ID */
  currentTheme: string;
  /** 容器宽度 */
  containerWidth: number;
  /** 当前横向滑动位置 */
  scrollPosition: number;
  /** 当前查看的图片索引（单张或全屏） */
  currentImageIndex: number;
}

/**
 * 编辑器状态
 */
export interface ImageEditorState {
  /** 图片列表 */
  images: ImageItem[];
  /** 当前排版类型 */
  layoutType: LayoutType;
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 是否可以撤销 */
  canUndo: boolean;
  /** 是否可以重做 */
  canRedo: boolean;
  /** 是否正在上传 */
  isUploading: boolean;
  /** 上传进度（0-100） */
  uploadProgress: number;
  /** 当前选中的图片ID */
  selectedImageId: string | null;
  /** 当前拖动的图片ID */
  draggingImageId: string | null;
}
