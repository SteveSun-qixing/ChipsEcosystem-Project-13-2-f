/**
 * 图片基础卡片插件主类
 *
 * @description 插件入口类，负责管理插件生命周期和创建组件实例
 */

import type { ImageCardConfig } from './types';
import { ImageRenderer } from './renderer';
import { ImageEditor } from './editor';
import { t } from './utils/i18n';

/**
 * 薯片内核接口（简化版，实际从@chips/core导入）
 */
export interface ChipsCore {
  request(params: { service: string; payload: unknown }): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * 插件元数据接口
 */
export interface PluginMetadata {
  /** 插件ID，格式：发行商:插件名 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 版本号 */
  version: string;
  /** 支持的卡片类型 */
  cardType: string;
  /** 图标路径 */
  icon: string;
  /** 插件描述 */
  description: string;
}

/**
 * 图片卡片插件
 */
export class ImageCardPlugin {
  /**
   * 插件元数据
   */
  readonly metadata: PluginMetadata = {
    id: 'chipshub:image-card',
    name: '图片卡片',
    version: '1.0.0',
    cardType: 'ImageCard',
    icon: 'assets/icon.svg',
    description: '用于展示图片，支持单张、网格、长图拼接和横向滑动四种排版方式',
  };

  /**
   * 配置Schema（JSON Schema格式）
   */
  readonly configSchema = {
    type: 'object',
    required: ['card_type', 'images'],
    properties: {
      card_type: {
        const: 'ImageCard',
      },
      images: {
        type: 'array',
        description: '图片列表',
        items: {
          type: 'object',
          required: ['id', 'source'],
          properties: {
            id: { type: 'string', description: '图片唯一ID' },
            source: {
              type: 'string',
              enum: ['file', 'url'],
              description: '图片来源',
            },
            file_path: { type: 'string', description: '本地文件路径' },
            url: { type: 'string', description: '图片URL' },
            alt: { type: 'string', description: '替代文本' },
            title: { type: 'string', description: '标题说明' },
          },
        },
      },
      layout_type: {
        type: 'string',
        enum: ['single', 'grid', 'long-scroll', 'horizontal-scroll'],
        default: 'single',
        description: '排版类型',
      },
      layout_options: {
        type: 'object',
        description: '排版选项',
        properties: {
          grid_mode: {
            type: 'string',
            enum: ['2x2', '3x3', '3-column-infinite'],
          },
          scroll_mode: {
            type: 'string',
            enum: ['fixed-window', 'adaptive'],
          },
          fixed_window_height: { type: 'integer', default: 600 },
          single_width_percent: {
            type: 'integer',
            minimum: 10,
            maximum: 100,
            default: 100,
          },
          single_alignment: {
            type: 'string',
            enum: ['left', 'center', 'right'],
            default: 'center',
          },
          gap: { type: 'integer', default: 8 },
        },
      },
      theme: {
        type: 'string',
        default: '',
        description: '主题包标识',
      },
      layout: {
        type: 'object',
        properties: {
          height_mode: {
            type: 'string',
            enum: ['auto', 'fixed'],
            default: 'auto',
          },
          fixed_height: {
            type: 'integer',
            description: '固定高度（像素）',
          },
        },
      },
    },
  };

  /**
   * 内核引用
   */
  private core: ChipsCore | null = null;

  /**
   * 是否已初始化
   */
  private initialized = false;

  /**
   * 初始化插件
   *
   * @param core - 薯片内核实例
   */
  async initialize(core: ChipsCore): Promise<void> {
    if (this.initialized) {
      await this.logInfo('plugin.already_initialized');
      return;
    }

    this.core = core;

    // 注册插件服务到内核
    await this.registerServices();

    this.initialized = true;
    await this.logInfo('plugin.initialized');
  }

  /**
   * 启动插件
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      throw new Error(this.t_internal('plugin.not_initialized'));
    }
    await this.logInfo('plugin.started');
  }

  /**
   * 停止插件
   */
  async stop(): Promise<void> {
    await this.logInfo('plugin.stopped');
  }

  /**
   * 销毁插件
   */
  async destroy(): Promise<void> {
    this.core = null;
    this.initialized = false;
    await this.logInfo('plugin.destroyed');
  }

  /**
   * 创建渲染器实例
   *
   * @returns 新的渲染器实例
   */
  createRenderer(): ImageRenderer {
    const renderer = new ImageRenderer();
    if (this.core) {
      renderer.setCore(this.core);
    }
    this.logInfo('log.renderer_created');
    return renderer;
  }

  /**
   * 创建编辑器实例
   *
   * @returns 新的编辑器实例
   */
  createEditor(): ImageEditor {
    const editor = new ImageEditor();
    if (this.core) {
      editor.setCore(this.core);
    }
    this.logInfo('log.editor_created');
    return editor;
  }

  /**
   * 验证配置
   *
   * @param config - 待验证的配置
   * @returns 是否有效
   */
  validateConfig(config: unknown): config is ImageCardConfig {
    if (!config || typeof config !== 'object') return false;

    const cfg = config as Record<string, unknown>;

    if (cfg.card_type !== 'ImageCard') return false;
    if (!Array.isArray(cfg.images)) return false;

    return true;
  }

  /**
   * 注册服务到内核
   */
  private async registerServices(): Promise<void> {
    if (!this.core) return;

    // 注册渲染服务
    await this.core.request({
      service: 'core.register_service',
      payload: {
        name: 'image.render',
        handler: 'handleRender',
        schema: {
          input: {
            type: 'object',
            properties: {
              config: { type: 'object' },
              options: { type: 'object' },
            },
          },
          output: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              html: { type: 'string' },
            },
          },
        },
      },
    });

    await this.logInfo('log.service_registered', { service: 'image.render' });

    // 注册上传服务
    await this.core.request({
      service: 'core.register_service',
      payload: {
        name: 'image.upload',
        handler: 'handleUpload',
        schema: {
          input: {
            type: 'object',
            properties: {
              card_id: { type: 'string' },
              file_data: { type: 'string' },
              file_name: { type: 'string' },
            },
          },
          output: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              file_path: { type: 'string' },
            },
          },
        },
      },
    });

    await this.logInfo('log.service_registered', { service: 'image.upload' });
  }

  /**
   * 获取翻译文本
   */
  private t_internal(key: string, vars?: Record<string, unknown>): string {
    return t(key, vars);
  }

  /**
   * 记录日志
   */
  private async logInfo(key: string, vars?: Record<string, unknown>): Promise<void> {
    const message = this.t_internal(key, vars);

    if (!this.core) {
      console.log(`[ImageCardPlugin] ${message}`);
      return;
    }

    // 通过内核记录日志
    await this.core
      .request({
        service: 'log.info',
        payload: {
          message,
          module: 'image-card-plugin',
        },
      })
      .catch(() => {
        // 降级：如果日志服务不可用，使用console
        console.log(`[ImageCardPlugin] ${message}`);
      });
  }
}

export default ImageCardPlugin;
