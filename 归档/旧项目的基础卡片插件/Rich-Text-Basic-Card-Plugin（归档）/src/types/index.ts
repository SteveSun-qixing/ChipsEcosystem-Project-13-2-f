/**
 * 类型定义统一导出
 */

// 配置类型
export type { RichTextCardConfig, RichTextLayoutConfig } from './config';

// 状态类型
export type {
  SelectionRange,
  FormatType,
  BlockType,
  RichTextRendererState,
  RichTextEditorState,
} from './state';

// 命令类型
export type { FormatCommand, InsertCommand } from './commands';

// 事件类型
export type {
  RichTextChangeEvent,
  SelectionChangeEvent,
  EditorEvents,
} from './events';

// 选项类型
export type { RenderOptions, EditorOptions } from './options';

// 验证类型
export type { ValidationError, ValidationResult } from './validation';

// 常量
export {
  DEFAULT_CONFIG,
  FONT_SIZES,
  PRESET_COLORS,
  PRESET_HIGHLIGHTS,
  ALLOWED_TAGS,
  ALLOWED_ATTRS,
  ALLOWED_PROTOCOLS,
  ALLOWED_STYLES,
  CSS_PREFIX,
  CSS_VARS,
} from './constants';

// 错误类型和错误码
export {
  RichTextErrorCode,
  ChipsError,
  ConfigError,
  ResourceError,
  SecurityError,
} from './errors';