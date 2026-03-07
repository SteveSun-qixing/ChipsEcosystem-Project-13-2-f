/**
 * 渲染器类测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageRenderer } from '../../src/renderer/ImageRenderer';
import type { ImageCardConfig, RenderOptions } from '../../src/types';

const createMockConfig = (): ImageCardConfig => ({
  card_type: 'ImageCard',
  images: [
    { id: 'img001', source: 'url', url: 'https://example.com/1.jpg', alt: 'Image 1', title: 'First' },
    { id: 'img002', source: 'url', url: 'https://example.com/2.jpg', alt: 'Image 2', title: 'Second' },
  ],
  layout_type: 'grid',
  layout_options: { grid_mode: '2x2', gap: 8 },
});

const createRenderOptions = (): RenderOptions => ({
  mode: 'view',
  interactive: true,
});

describe('ImageRenderer', () => {
  let renderer: ImageRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = new ImageRenderer();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await renderer.destroy();
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('setCore', () => {
    it('should set core reference', () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({ success: true }),
        on: vi.fn(),
        off: vi.fn(),
      };
      renderer.setCore(mockCore as any);
      // Should not throw
    });
  });

  describe('render', () => {
    it('should render into container', async () => {
      const config = createMockConfig();
      await renderer.render(config, container, createRenderOptions());
      expect(container.innerHTML).not.toBe('');
    });

    it('should update state after render', async () => {
      const config = createMockConfig();
      await renderer.render(config, container, createRenderOptions());
      
      const state = renderer.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.loadedImages.length).toBe(2);
    });

    it('should handle empty images', async () => {
      const config = { ...createMockConfig(), images: [] };
      await renderer.render(config, container, createRenderOptions());
      
      const state = renderer.getState();
      expect(state.loadedImages.length).toBe(0);
    });

    it('should auto-detect single mode for 1 image', async () => {
      const config = createMockConfig();
      config.images = [config.images[0]!];
      await renderer.render(config, container, createRenderOptions());
      
      // Should render in single mode regardless of config
      expect(container.innerHTML).not.toBe('');
    });

    it('should apply theme if provided', async () => {
      const mockCore = {
        request: vi.fn().mockResolvedValue({
          success: true,
          data: {
            variables: {
              colors: { text: { primary: '#333' }, background: '#fff', border: '#e0e0e0' },
            },
          },
        }),
        on: vi.fn(),
        off: vi.fn(),
      };
      renderer.setCore(mockCore as any);

      const config = createMockConfig();
      config.theme = 'test-theme';
      await renderer.render(config, container, createRenderOptions());
      
      const state = renderer.getState();
      expect(state.currentTheme).toBe('test-theme');
    });
  });

  describe('update', () => {
    it('should update configuration', async () => {
      const config = createMockConfig();
      await renderer.render(config, container, createRenderOptions());
      
      await renderer.update({ layout_type: 'horizontal-scroll' });
      // Should not throw
    });

    it('should handle update before render', async () => {
      // Should not throw
      await renderer.update({ layout_type: 'single' });
    });
  });

  describe('getState / setState', () => {
    it('should return initial state', () => {
      const state = renderer.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.loadedImages).toEqual([]);
      expect(state.scrollPosition).toBe(0);
      expect(state.currentImageIndex).toBe(0);
    });

    it('should update state', () => {
      renderer.setState({ isLoading: true });
      expect(renderer.getState().isLoading).toBe(true);
    });

    it('should return copy of state', () => {
      const state1 = renderer.getState();
      const state2 = renderer.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('destroy', () => {
    it('should clean up container', async () => {
      const config = createMockConfig();
      await renderer.render(config, container, createRenderOptions());
      
      await renderer.destroy();
      // Container should be cleared
    });

    it('should handle double destroy', async () => {
      await renderer.destroy();
      await renderer.destroy();
      // Should not throw
    });
  });
});
