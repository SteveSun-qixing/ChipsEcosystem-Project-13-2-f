/**
 * 事件类型定义
 */

import type { RichTextCardConfig } from './config';
import type { SelectionRange, FormatType, BlockType } from './state';

/**
 * 内容变更事件
 */
export interface RichTextChangeEvent {
  type: 'change';
  config: RichTextCardConfig;
  content: string;
  isUserAction: boolean;
  timestamp: number;
}

/**
 * 选区变更事件
 */
export interface SelectionChangeEvent {
  type: 'selectionChange';
  selection: SelectionRange | null;
  activeFormats: FormatType[];
  currentBlock: BlockType;
}

/**
 * 编辑器事件映射
 */
export interface EditorEvents {
  change: (event: RichTextChangeEvent) => void;
  selectionChange: (event: SelectionChangeEvent) => void;
  focus: (event: FocusEvent) => void;
  blur: (event: FocusEvent) => void;
}
