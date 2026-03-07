/**
 * 命令类型定义
 */

/**
 * 格式化命令
 */
export type FormatCommand =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strikethrough' }
  | { type: 'superscript' }
  | { type: 'subscript' }
  | { type: 'code' }
  | { type: 'heading'; level: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'orderedList' }
  | { type: 'unorderedList' }
  | { type: 'blockquote' }
  | { type: 'color'; value: string }
  | { type: 'backgroundColor'; value: string }
  | { type: 'fontSize'; value: number }
  | { type: 'align'; value: 'left' | 'center' | 'right' | 'justify' }
  | { type: 'clearFormat' };

/**
 * 插入命令
 */
export type InsertCommand =
  | {
      type: 'link';
      url: string;
      text?: string;
      newWindow?: boolean;
    }
  | {
      type: 'image';
      src: string;
      alt?: string;
      width?: number;
      height?: number;
    }
  | { type: 'horizontalRule' };
