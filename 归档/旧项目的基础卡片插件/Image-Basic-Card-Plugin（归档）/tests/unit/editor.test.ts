/**
 * 编辑器类测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageEditor } from '../../src/editor/ImageEditor';
import type { ImageCardConfig, EditorOptions } from '../../src/types';

const createMockConfig = (): ImageCardConfig => ({
  card_type: 'ImageCard',
  images: [
    { id: 'img001', source: 'url', url: 'https://example.com/1.jpg', alt: '', title: '' },
    { id: 'img002', source: 'url', url: 'https://example.com/2.jpg', alt: '', title: '' },
  ],
  layout_type: 'grid',
  layout_options: { grid_mode: '2x2', gap: 8 },
});

const createMockCore = () => ({
  request: vi.fn().mockResolvedValue({ success: true, data: {} }),
  on: vi.fn(),
  off: vi.fn(),
});

describe('ImageEditor', () => {
  let editor: ImageEditor;
  let container: HTMLElement;

  beforeEach(() => {
    editor = new ImageEditor();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await editor.destroy();
    document.body.removeChild(container);
  });

  describe('render', () => {
    it('should render editor into container', async () => {
      const config = createMockConfig();
      await editor.render(config, container, { toolbar: true });
      expect(container.innerHTML).not.toBe('');
    });

    it('should initialize state from config', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      const state = editor.getState();
      expect(state.images.length).toBe(2);
      expect(state.layoutType).toBe('grid');
    });
  });

  describe('getConfig', () => {
    it('should return current config', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      const result = editor.getConfig();
      expect(result.card_type).toBe('ImageCard');
      expect(result.images.length).toBe(2);
    });

    it('should throw if not initialized', () => {
      expect(() => editor.getConfig()).toThrow();
    });
  });

  describe('setConfig', () => {
    it('should update config', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.setConfig({ layout_type: 'single' });
      
      const state = editor.getState();
      expect(state.layoutType).toBe('single');
    });

    it('should update images', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.setConfig({
        images: [{ id: 'new1', source: 'url', url: 'https://example.com/new.jpg' }],
      });
      
      const state = editor.getState();
      expect(state.images.length).toBe(1);
    });
  });

  describe('validate', () => {
    it('should validate config with images', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      const result = editor.validate();
      expect(result.valid).toBe(true);
    });

    it('should detect empty images', async () => {
      const config = { ...createMockConfig(), images: [] };
      await editor.render(config, container, {});
      const result = editor.validate();
      expect(result.valid).toBe(false);
    });

    it('should detect missing url', async () => {
      const config = createMockConfig();
      config.images[0] = { id: 'test', source: 'url' };
      await editor.render(config, container, {});
      const result = editor.validate();
      expect(result.valid).toBe(false);
    });

    it('should detect missing file_path', async () => {
      const config = createMockConfig();
      config.images[0] = { id: 'test', source: 'file' };
      await editor.render(config, container, {});
      const result = editor.validate();
      expect(result.valid).toBe(false);
    });
  });

  describe('onChange', () => {
    it('should register callback', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      const cb = vi.fn();
      editor.onChange(cb);
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('executeCommand', () => {
    it('should add image', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      expect(editor.getState().images.length).toBe(3);
    });

    it('should remove image', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'remove_image',
        imageId: 'img001',
      });
      
      expect(editor.getState().images.length).toBe(1);
    });

    it('should move image', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'move_image',
        imageId: 'img002',
        targetIndex: 0,
      });
      
      expect(editor.getState().images[0]?.id).toBe('img002');
    });

    it('should update image', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'update_image',
        imageId: 'img001',
        updates: { title: 'New Title' },
      });
      
      expect(editor.getState().images[0]?.title).toBe('New Title');
    });

    it('should set layout type', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'set_layout_type',
        layoutType: 'horizontal-scroll',
      });
      
      expect(editor.getState().layoutType).toBe('horizontal-scroll');
    });

    it('should update layout options', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'update_layout_options',
        options: { gap: 16 },
      });
      
      const result = editor.getConfig();
      expect(result.layout_options?.gap).toBe(16);
    });

    it('should batch add images', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'batch_add_images',
        images: [
          { id: 'new1', source: 'url', url: 'https://example.com/3.jpg' },
          { id: 'new2', source: 'url', url: 'https://example.com/4.jpg' },
        ],
      });
      
      expect(editor.getState().images.length).toBe(4);
    });

    it('should clear all images', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({ type: 'clear_all_images' });
      
      expect(editor.getState().images.length).toBe(0);
    });

    it('should replace image', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'replace_image',
        imageId: 'img001',
        newImage: { id: 'replaced1', source: 'url', url: 'https://example.com/replaced.jpg' },
      });
      
      expect(editor.getState().images[0]?.id).toBe('replaced1');
    });

    it('should mark state as dirty', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      expect(editor.getState().isDirty).toBe(false);
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      expect(editor.getState().isDirty).toBe(true);
    });
  });

  describe('undo/redo', () => {
    it('should undo last command', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      expect(editor.getState().images.length).toBe(3);
      
      editor.undo();
      
      expect(editor.getState().images.length).toBe(2);
    });

    it('should redo undone command', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      editor.undo();
      expect(editor.getState().images.length).toBe(2);
      
      editor.redo();
      expect(editor.getState().images.length).toBe(3);
    });

    it('should report canUndo/canRedo correctly', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(false);
      
      editor.executeCommand({
        type: 'add_image',
        image: { id: 'new1', source: 'url', url: 'https://example.com/new.jpg' },
      });
      
      expect(editor.canUndo()).toBe(true);
      expect(editor.canRedo()).toBe(false);
      
      editor.undo();
      
      expect(editor.canUndo()).toBe(false);
      expect(editor.canRedo()).toBe(true);
    });
  });

  describe('addImageByUrl', () => {
    it('should add image from URL', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      
      editor.addImageByUrl('https://example.com/url-image.jpg', 'Alt text', 'Title');
      
      const state = editor.getState();
      expect(state.images.length).toBe(3);
      const lastImage = state.images[state.images.length - 1];
      expect(lastImage?.source).toBe('url');
      expect(lastImage?.url).toBe('https://example.com/url-image.jpg');
    });
  });

  describe('destroy', () => {
    it('should clean up', async () => {
      const config = createMockConfig();
      await editor.render(config, container, {});
      await editor.destroy();
      // Should not throw on double destroy
      await editor.destroy();
    });
  });

  describe('with core', () => {
    it('should use core for uploads', async () => {
      const mockCore = createMockCore();
      editor.setCore(mockCore as any);
      
      const config = createMockConfig();
      await editor.render(config, container, {});
      // Editor should work with core set
    });
  });
});
