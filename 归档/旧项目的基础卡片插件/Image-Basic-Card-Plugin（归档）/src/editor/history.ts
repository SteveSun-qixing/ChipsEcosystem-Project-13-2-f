/**
 * 撤销重做管理器
 */

import type { ImageCardConfig } from '../types';

/**
 * 历史记录项
 */
export interface HistoryEntry {
  id: string;
  type: 'add' | 'remove' | 'move' | 'update' | 'layout' | 'batch' | 'clear';
  beforeState: ImageCardConfig;
  afterState: ImageCardConfig;
  timestamp: number;
}

/**
 * 撤销重做管理器
 */
export class UndoManager {
  private history: HistoryEntry[] = [];
  private position = -1;
  private maxSize = 100;

  /**
   * 初始化
   */
  init(_config: ImageCardConfig): void {
    this.history = [];
    this.position = -1;
  }

  /**
   * 添加历史记录
   */
  push(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    // 清除position之后的历史
    this.history = this.history.slice(0, this.position + 1);

    // 添加新记录
    const newEntry: HistoryEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.history.push(newEntry);
    this.position++;

    // 限制大小
    if (this.history.length > this.maxSize) {
      this.history.shift();
      this.position--;
    }
  }

  /**
   * 撤销
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;

    const entry = this.history[this.position];
    this.position--;
    return entry ?? null;
  }

  /**
   * 重做
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;

    this.position++;
    return this.history[this.position] ?? null;
  }

  /**
   * 是否可撤销
   */
  canUndo(): boolean {
    return this.position >= 0;
  }

  /**
   * 是否可重做
   */
  canRedo(): boolean {
    return this.position < this.history.length - 1;
  }

  /**
   * 获取历史记录数量
   */
  getHistoryLength(): number {
    return this.history.length;
  }

  /**
   * 获取当前位置
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.history = [];
    this.position = -1;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default UndoManager;
