/**
 * 富文本基础卡片插件
 *
 * @packageDocumentation
 */

// 导出插件主类
export { RichTextCardPlugin, default } from './plugin';
export type { ChipsCore, PluginMetadata } from './plugin';

// 导出渲染器
export { RichTextRenderer } from './renderer';

// 导出编辑器
export { RichTextEditor, UndoManager } from './editor';

// 导出类型
export type {
  // 配置类型
  RichTextCardConfig,
  RichTextLayoutConfig,
  // 状态类型
  SelectionRange,
  FormatType,
  BlockType,
  RichTextRendererState,
  RichTextEditorState,
  // 命令类型
  FormatCommand,
  InsertCommand,
  // 事件类型
  RichTextChangeEvent,
  SelectionChangeEvent,
  EditorEvents,
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
  FONT_SIZES,
  PRESET_COLORS,
  PRESET_HIGHLIGHTS,
  ALLOWED_TAGS,
  CSS_PREFIX,
  CSS_VARS,
} from './types';

// 导出错误类型
export {
  RichTextErrorCode,
  ChipsError,
  ConfigError,
  ResourceError,
  SecurityError,
} from './types';

// 导出工具函数
export {
  sanitizeHtml,
  isSafeHtml,
  validateConfig,
  getDefaultConfig,
  mergeDefaults,
  t,
  countWords,
  isEmpty,
  escapeHtml,
} from './utils';
