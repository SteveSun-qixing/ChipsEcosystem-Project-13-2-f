/**
 * 状态类型定义
 */

/**
 * 选区范围
 */
export interface SelectionRange {
  startOffset: number;
  endOffset: number;
  collapsed: boolean;
}

/**
 * 文本格式类型
 */
export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'superscript'
  | 'subscript'
  | 'code';

/**
 * 块级元素类型
 */
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'orderedList'
  | 'unorderedList'
  | 'blockquote';

/**
 * 渲染器状态
 */
export interface RichTextRendererState {
  /** 当前HTML内容 */
  content: string;
  /** 是否加载中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前主题ID */
  currentTheme: string;
  /** 容器宽度 */
  containerWidth: number;
}

/**
 * 编辑器状态
 */
export interface RichTextEditorState {
  /** 当前HTML内容 */
  content: string;
  /** 当前选区 */
  selection: SelectionRange | null;
  /** 当前生效的格式 */
  activeFormats: Set<FormatType>;
  /** 当前块级类型 */
  currentBlock: BlockType;
  /** 是否可撤销 */
  canUndo: boolean;
  /** 是否可重做 */
  canRedo: boolean;
  /** 是否有未保存的修改 */
  isDirty: boolean;
  /** 字数统计 */
  wordCount: number;
  /** 是否聚焦 */
  isFocused: boolean;
}
