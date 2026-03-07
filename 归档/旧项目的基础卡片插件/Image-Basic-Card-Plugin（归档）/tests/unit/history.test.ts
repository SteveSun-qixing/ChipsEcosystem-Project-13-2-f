/**
 * 撤销重做管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UndoManager } from '../../src/editor/history';
import type { ImageCardConfig } from '../../src/types';

const createMockConfig = (imageCount: number): ImageCardConfig => ({
  card_type: 'ImageCard',
  images: Array.from({ length: imageCount }, (_, i) => ({
    id: `img${i}`,
    source: 'url' as const,
    url: `https://example.com/image${i}.jpg`,
  })),
  layout_type: 'single',
});

describe('UndoManager', () => {
  let manager: UndoManager;

  beforeEach(() => {
    manager = new UndoManager();
    manager.init(createMockConfig(0));
  });

  describe('init', () => {
    it('should initialize with empty history', () => {
      expect(manager.getHistoryLength()).toBe(0);
      expect(manager.getPosition()).toBe(-1);
    });

    it('should reset on re-init', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      expect(manager.getHistoryLength()).toBe(1);

      manager.init(createMockConfig(0));
      expect(manager.getHistoryLength()).toBe(0);
    });
  });

  describe('push', () => {
    it('should add entry to history', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      expect(manager.getHistoryLength()).toBe(1);
      expect(manager.getPosition()).toBe(0);
    });

    it('should support multiple entries', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });
      manager.push({
        type: 'add',
        beforeState: createMockConfig(1),
        afterState: createMockConfig(2),
      });

      expect(manager.getHistoryLength()).toBe(2);
      expect(manager.getPosition()).toBe(1);
    });

    it('should clear future entries after undo', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });
      manager.push({
        type: 'add',
        beforeState: createMockConfig(1),
        afterState: createMockConfig(2),
      });

      manager.undo();

      manager.push({
        type: 'add',
        beforeState: createMockConfig(1),
        afterState: createMockConfig(3),
      });

      expect(manager.getHistoryLength()).toBe(2);
      expect(manager.getPosition()).toBe(1);
    });
  });

  describe('undo/redo', () => {
    it('should undo last action', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      const entry = manager.undo();
      expect(entry).not.toBeNull();
      expect(entry?.beforeState.images.length).toBe(0);
      expect(entry?.afterState.images.length).toBe(1);
    });

    it('should return null when nothing to undo', () => {
      const entry = manager.undo();
      expect(entry).toBeNull();
    });

    it('should redo undone action', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      manager.undo();
      const entry = manager.redo();

      expect(entry).not.toBeNull();
      expect(entry?.afterState.images.length).toBe(1);
    });

    it('should return null when nothing to redo', () => {
      const entry = manager.redo();
      expect(entry).toBeNull();
    });

    it('should support multiple undo/redo cycles', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });
      manager.push({
        type: 'add',
        beforeState: createMockConfig(1),
        afterState: createMockConfig(2),
      });

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);

      manager.undo();
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(true);

      manager.undo();
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);

      manager.redo();
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(true);

      manager.redo();
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('canUndo/canRedo', () => {
    it('should return false initially', () => {
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });

    it('should update after push', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('should update after undo', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });

      manager.undo();

      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      manager.push({
        type: 'add',
        beforeState: createMockConfig(0),
        afterState: createMockConfig(1),
      });
      manager.push({
        type: 'add',
        beforeState: createMockConfig(1),
        afterState: createMockConfig(2),
      });

      manager.clear();

      expect(manager.getHistoryLength()).toBe(0);
      expect(manager.getPosition()).toBe(-1);
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });
  });
});
