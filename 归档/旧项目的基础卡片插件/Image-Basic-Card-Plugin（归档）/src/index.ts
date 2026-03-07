/**
 * 图片基础卡片插件
 *
 * @packageDocumentation
 */

// 导出插件主类
export { ImageCardPlugin, default } from './plugin';
export type { ChipsCore, PluginMetadata } from './plugin';

// 导出渲染器
export { ImageRenderer } from './renderer';

// 导出编辑器
export { ImageEditor, UndoManager } from './editor';

// 导出类型
export type {
  // 配置类型
  ImageCardConfig,
  ImageLayoutConfig,
  ImageItem,
  ImageSourceType,
  LayoutType,
  GridMode,
  ScrollMode,
  SingleAlignment,
  LayoutOptions,
  // 状态类型
  ImageRendererState,
  ImageEditorState,
  // 命令类型
  ImageCommand,
  // 事件类型
  ImageChangeEvent,
  ImageAddEvent,
  ImageRemoveEvent,
  ImageReorderEvent,
  ImageSelectEvent,
  ImageClickEvent,
  EditorEvents,
  RendererEvents,
  // 选项类型
  RenderOptions,
  EditorOptions,
  // 验证类型
  ValidationError,
  ValidationResult,
} from './types';

// 导出常量
export {
  DEFAULT_CONFIG,
  ACCEPTED_IMAGE_FORMATS,
  ACCEPTED_IMAGE_EXTENSIONS,
  DEFAULT_MAX_IMAGE_SIZE,
  DEFAULT_MAX_IMAGES,
  GRID_DISPLAY_LIMITS,
  CSS_PREFIX,
  CSS_VARS,
} from './types';

// 导出错误类型
export {
  ImageErrorCode,
  ChipsError,
  ConfigError,
  ResourceError,
  UploadError,
} from './types';

// 导出工具函数
export {
  validateConfig,
  validateImageUrl,
  validateImageFormat,
  validateImageSize,
  getDefaultConfig,
  mergeDefaults,
  t,
  hasKey,
  getAllKeys,
  generateId,
  getImageNaturalSize,
  preloadImage,
  preloadImages,
  fileToDataUrl,
  getFileExtension,
  formatFileSize,
  escapeHtml,
  debounce,
  throttle,
  arrayMove,
} from './utils';
