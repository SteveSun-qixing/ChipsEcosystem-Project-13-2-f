/**
 * 富文本基础卡片插件主类
 *
 * @description 插件入口类，负责管理插件生命周期和创建组件实例
 */

import type { RichTextCardConfig } from './types';
import { RichTextRenderer } from './renderer';
import { RichTextEditor } from './editor';
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
 * 富文本卡片插件
 */
export class RichTextCardPlugin {
  /**
   * 插件元数据
   */
  readonly metadata: PluginMetadata = {
    id: 'chipshub:rich-text-card',
    name: '富文本卡片',
    version: '1.0.0',
    cardType: 'RichTextCard',
    icon: 'assets/icon.svg',
    description: '用于显示和编辑RTF格式的富文本内容',
  };

  /**
   * 配置Schema（JSON Schema格式）
   */
  readonly configSchema = {
    type: 'object',
    required: ['card_type', 'content_source'],
    properties: {
      card_type: {
        const: 'RichTextCard',
      },
      content_source: {
        type: 'string',
        enum: ['file', 'inline'],
        description: '内容来源：file-外部文件，inline-内联内容',
      },
      content_file: {
        type: 'string',
        description: '富文本文件路径（source为file时使用）',
      },
      content_text: {
        type: 'string',
        description: '内联HTML内容（source为inline时使用）',
      },
      toolbar: {
        type: 'boolean',
        default: false,
        description: '是否显示工具栏（编辑模式）',
      },
      read_only: {
        type: 'boolean',
        default: true,
        description: '是否只读',
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
    if: {
      properties: {
        content_source: { const: 'file' },
      },
    },
    then: {
      required: ['content_file'],
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
  createRenderer(): RichTextRenderer {
    const renderer = new RichTextRenderer();
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
  createEditor(): RichTextEditor {
    const editor = new RichTextEditor();
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
  validateConfig(config: unknown): config is RichTextCardConfig {
    if (!config || typeof config !== 'object') return false;

    const cfg = config as Record<string, unknown>;

    if (cfg.card_type !== 'RichTextCard') return false;
    if (!['file', 'inline'].includes(cfg.content_source as string)) return false;

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
        name: 'richtext.render',
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

    await this.logInfo('log.service_registered', { service: 'richtext.render' });

    // 注册格式化服务
    await this.core.request({
      service: 'core.register_service',
      payload: {
        name: 'richtext.format',
        handler: 'handleFormat',
        schema: {
          input: {
            type: 'object',
            properties: {
              format_type: { type: 'string' },
              value: { type: 'string' },
            },
          },
          output: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    });

    await this.logInfo('log.service_registered', { service: 'richtext.format' });
  }

  /**
   * 获取翻译文本
   */
  private t_internal(key: string, vars?: Record<string, unknown>): string {
    // ⚠️ 实际应该从 @chips/i18n 导入
    // import { t as systemT } from '@chips/i18n';
    // return systemT(key, vars);
    
    // 开发阶段：使用本地词汇表
    return t(key, vars);
  }

  /**
   * 记录日志
   */
  private async logInfo(key: string, vars?: Record<string, unknown>): Promise<void> {
    const message = this.t_internal(key, vars);
    
    if (!this.core) {
      console.log(`[RichTextCardPlugin] ${message}`);
      return;
    }

    // 通过内核记录日志
    await this.core.request({
      service: 'log.info',
      payload: {
        message,
        module: 'rich-text-card-plugin',
      },
    }).catch(() => {
      // 降级：如果日志服务不可用，使用console
      console.log(`[RichTextCardPlugin] ${message}`);
    });
  }
}

export default RichTextCardPlugin;
