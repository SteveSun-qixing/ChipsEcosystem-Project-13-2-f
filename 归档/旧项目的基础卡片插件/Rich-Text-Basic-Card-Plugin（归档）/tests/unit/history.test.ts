/**
 * 撤销重做管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UndoManager } from '../../src/editor/history';

describe('UndoManager', () => {
  let manager: UndoManager;

  beforeEach(() => {
    manager = new UndoManager();
    manager.init('<p>Initial</p>');
  });

  it('should initialize with empty history', () => {
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
    expect(manager.getHistoryLength()).toBe(0);
  });

  it('should add history entry', () => {
    manager.push({
      beforeHtml: '<p>Initial</p>',
      afterHtml: '<p>Changed</p>',
      type: 'input',
    });

    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    expect(manager.getHistoryLength()).toBe(1);
  });

  it('should undo changes', () => {
    manager.push({
      beforeHtml: '<p>Initial</p>',
      afterHtml: '<p>Changed</p>',
      type: 'input',
    });

    const entry = manager.undo();

    expect(entry).not.toBeNull();
    expect(entry?.beforeHtml).toBe('<p>Initial</p>');
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
  });

  it('should redo changes', () => {
    manager.push({
      beforeHtml: '<p>Initial</p>',
      afterHtml: '<p>Changed</p>',
      type: 'input',
    });

    manager.undo();
    const entry = manager.redo();

    expect(entry).not.toBeNull();
    expect(entry?.afterHtml).toBe('<p>Changed</p>');
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('should clear redo history on new push', () => {
    manager.push({
      beforeHtml: '<p>1</p>',
      afterHtml: '<p>2</p>',
      type: 'input',
    });

    manager.push({
      beforeHtml: '<p>2</p>',
      afterHtml: '<p>3</p>',
      type: 'input',
    });

    manager.undo();
    expect(manager.canRedo()).toBe(true);

    manager.push({
      beforeHtml: '<p>2</p>',
      afterHtml: '<p>4</p>',
      type: 'input',
    });

    expect(manager.canRedo()).toBe(false);
    expect(manager.getHistoryLength()).toBe(2);
  });

  it('should support multiple undo/redo', () => {
    manager.push({ beforeHtml: '<p>1</p>', afterHtml: '<p>2</p>', type: 'input' });
    manager.push({ beforeHtml: '<p>2</p>', afterHtml: '<p>3</p>', type: 'input' });
    manager.push({ beforeHtml: '<p>3</p>', afterHtml: '<p>4</p>', type: 'input' });

    expect(manager.getHistoryLength()).toBe(3);

    // Undo all
    expect(manager.undo()?.afterHtml).toBe('<p>4</p>');
    expect(manager.undo()?.afterHtml).toBe('<p>3</p>');
    expect(manager.undo()?.afterHtml).toBe('<p>2</p>');
    expect(manager.canUndo()).toBe(false);

    // Redo all
    expect(manager.redo()?.afterHtml).toBe('<p>2</p>');
    expect(manager.redo()?.afterHtml).toBe('<p>3</p>');
    expect(manager.redo()?.afterHtml).toBe('<p>4</p>');
    expect(manager.canRedo()).toBe(false);
  });

  it('should return null when cannot undo', () => {
    expect(manager.undo()).toBeNull();
  });

  it('should return null when cannot redo', () => {
    expect(manager.redo()).toBeNull();
  });

  it('should clear history', () => {
    manager.push({ beforeHtml: '<p>1</p>', afterHtml: '<p>2</p>', type: 'input' });
    manager.push({ beforeHtml: '<p>2</p>', afterHtml: '<p>3</p>', type: 'input' });

    manager.clear();

    expect(manager.getHistoryLength()).toBe(0);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
  });
});
