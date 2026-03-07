/**
 * 插件集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RichTextCardPlugin, ChipsCore } from '../../src/plugin';
import type { RichTextCardConfig } from '../../src/types';

describe('RichTextCardPlugin Integration', () => {
  let plugin: RichTextCardPlugin;
  let mockCore: ChipsCore;

  beforeEach(() => {
    plugin = new RichTextCardPlugin();
    mockCore = {
      request: vi.fn().mockResolvedValue({ success: true, data: {} }),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as ChipsCore;
  });

  describe('Complete Render Flow', () => {
    it('should render inline content', async () => {
      await plugin.initialize(mockCore);

      const renderer = plugin.createRenderer();
      const container = document.createElement('div');

      const config: RichTextCardConfig = {
        card_type: 'RichTextCard',
        content_source: 'inline',
        content_text: '<p>Hello World</p>',
      };

      await renderer.render(config, container, {
        mode: 'view',
        interactive: true,
      });

      // 验证渲染结果
      expect(container.innerHTML).toContain('chips-richtext');
      expect(renderer.getState().isLoading).toBe(false);
      expect(renderer.getState().error).toBeNull();

      await renderer.destroy();
    });

    it('should handle file content loading', async () => {
      await plugin.initialize(mockCore);

      // Mock resource fetch - 需要多次调用：服务注册、日志、资源获取
      (mockCore.request as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ success: true, data: {} })  // 服务注册1
        .mockResolvedValueOnce({ success: true, data: {} })  // 日志1
        .mockResolvedValueOnce({ success: true, data: {} })  // 服务注册2
        .mockResolvedValueOnce({ success: true, data: {} })  // 日志2
        .mockResolvedValueOnce({ success: true, data: {} })  // 日志3
        .mockResolvedValueOnce({                             // 资源获取
          success: true,
          data: { content: '<p>File Content</p>' },
        });

      const renderer = plugin.createRenderer();
      const container = document.createElement('div');

      const config: RichTextCardConfig = {
        card_type: 'RichTextCard',
        content_source: 'file',
        content_file: 'content.html',
      };

      await renderer.render(config, container, { mode: 'view', cardId: 'test123' });

      // 验证调用了资源获取服务（使用chips://协议）
      expect(mockCore.request).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'resource.fetch',
        })
      );

      await renderer.destroy();
    });
  });

  describe('Complete Edit Flow', () => {
    it('should initialize editor and handle changes', async () => {
      await plugin.initialize(mockCore);

      const editor = plugin.createEditor();
      const container = document.createElement('div');

      const config: RichTextCardConfig = {
        card_type: 'RichTextCard',
        content_source: 'inline',
        content_text: '<p>Initial</p>',
      };

      await editor.render(config, container, {
        toolbar: true,
        autoSave: true,
      });

      // 验证编辑器状态
      const state = editor.getState();
      expect(state.content).toContain('Initial');
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);

      // 设置onChange回调
      const onChange = vi.fn();
      editor.onChange(onChange);

      // 设置新内容
      editor.setContent('<p>Updated</p>');

      // 验证回调被调用
      expect(onChange).toHaveBeenCalled();

      // 获取配置
      const newConfig = editor.getConfig();
      expect(newConfig.content_text).toContain('Updated');

      await editor.destroy();
    });

    it('should support undo/redo operations', async () => {
      await plugin.initialize(mockCore);

      const editor = plugin.createEditor();
      const container = document.createElement('div');

      await editor.render(
        {
          card_type: 'RichTextCard',
          content_source: 'inline',
          content_text: '<p>Version 1</p>',
        },
        container,
        {}
      );

      // 修改内容
      editor.setContent('<p>Version 2</p>');
      expect(editor.canUndo()).toBe(true);

      // 撤销
      editor.undo();
      expect(editor.getContent()).toContain('Version 1');
      expect(editor.canRedo()).toBe(true);

      // 重做
      editor.redo();
      expect(editor.getContent()).toContain('Version 2');

      await editor.destroy();
    });
  });

  describe('Config Validation', () => {
    it('should validate config before rendering', async () => {
      await plugin.initialize(mockCore);

      const validConfig = {
        card_type: 'RichTextCard',
        content_source: 'inline',
        content_text: '<p>Test</p>',
      };

      const invalidConfig = {
        card_type: 'WrongType',
        content_source: 'inline',
      };

      expect(plugin.validateConfig(validConfig)).toBe(true);
      expect(plugin.validateConfig(invalidConfig)).toBe(false);
    });
  });

  describe('Theme Integration', () => {
    it('should apply theme when available', async () => {
      await plugin.initialize(mockCore);

      // Mock theme service
      (mockCore.request as ReturnType<typeof vi.fn>).mockImplementation(({ service }: { service: string }) => {
        if (service === 'theme.get') {
          return Promise.resolve({
            success: true,
            data: {
              variables: {
                colors: {
                  text: { primary: '#333' },
                  primary: '#0066cc',
                },
              },
            },
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });

      const renderer = plugin.createRenderer();
      const container = document.createElement('div');

      await renderer.render(
        {
          card_type: 'RichTextCard',
          content_source: 'inline',
          content_text: '<p>Test</p>',
          theme: 'custom-theme',
        },
        container,
        { mode: 'view' }
      );

      // 验证主题请求
      expect(mockCore.request).toHaveBeenCalledWith({
        service: 'theme.get',
        payload: { themeId: 'custom-theme' },
      });

      expect(renderer.getState().currentTheme).toBe('custom-theme');

      await renderer.destroy();
    });
  });
});
