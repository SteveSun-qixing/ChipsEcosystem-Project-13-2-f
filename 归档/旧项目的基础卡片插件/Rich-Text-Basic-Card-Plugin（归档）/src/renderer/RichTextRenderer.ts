/**
 * 富文本渲染器
 */

import { createApp, App } from 'vue';
import type { ChipsCore } from '../plugin';
import type {
  RichTextCardConfig,
  RichTextRendererState,
  RenderOptions,
} from '../types';
import { RichTextErrorCode, ResourceError } from '../types/errors';
import RichTextRendererVue from './RichTextRenderer.vue';
import { sanitizeHtml } from '../utils/sanitizer';
import { t } from '../utils/i18n';

/**
 * 富文本渲染器类
 */
export class RichTextRenderer {
  private core: ChipsCore | null = null;
  private config: RichTextCardConfig | null = null;
  private container: HTMLElement | null = null;
  private options: RenderOptions | null = null;
  private vueApp: App<Element> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private state: RichTextRendererState = {
    content: '',
    isLoading: false,
    error: null,
    currentTheme: '',
    containerWidth: 0,
  };

  /**
   * 设置Core引用
   */
  setCore(core: ChipsCore): void {
    this.core = core;
  }

  /**
   * 渲染富文本内容
   */
  async render(
    config: RichTextCardConfig,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    this.config = config;
    this.container = container;
    this.options = options;

    // 设置加载状态
    this.setState({ isLoading: true, error: null });

    try {
      // 1. 加载内容
      const rawContent = await this.loadContent();

      // 2. 安全过滤
      const safeContent = sanitizeHtml(rawContent);

      // 3. 更新状态
      this.setState({
        content: safeContent,
        isLoading: false,
      });

      // 4. 挂载Vue组件
      this.mountVueComponent();

      // 5. 应用主题
      const themeId = options.theme || config.theme || '';
      if (themeId) {
        await this.applyTheme(themeId);
      }

      // 6. 设置响应式监听
      this.setupResizeObserver();
    } catch (error) {
      this.setState({
        isLoading: false,
        error: (error as Error).message,
      });
      this.renderError(error as Error);
      throw error;
    }
  }

  /**
   * 更新配置
   */
  async update(config: Partial<RichTextCardConfig>): Promise<void> {
    if (!this.config) return;

    this.config = { ...this.config, ...config };

    // 如果内容变化，重新加载
    if (config.content_source || config.content_file || config.content_text) {
      const rawContent = await this.loadContent();
      const safeContent = sanitizeHtml(rawContent);
      this.setState({ content: safeContent });

      // 重新挂载组件
      this.mountVueComponent();
    }

    // 如果主题变化，重新应用
    if (config.theme !== undefined) {
      await this.applyTheme(config.theme);
    }
  }

  /**
   * 获取状态
   */
  getState(): RichTextRendererState {
    return { ...this.state };
  }

  /**
   * 设置状态
   */
  setState(state: Partial<RichTextRendererState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * 销毁渲染器
   */
  async destroy(): Promise<void> {
    // 停止监听
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 卸载Vue应用
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }

    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.config = null;
    this.options = null;
  }

  /**
   * 加载内容
   */
  private async loadContent(): Promise<string> {
    if (!this.config) return '';

    if (this.config.content_source === 'inline') {
      return this.config.content_text || '';
    }

    if (this.config.content_source === 'file' && this.config.content_file) {
      // 通过Core读取文件
      if (this.core) {
        // 构建资源URI
        const uri = this.buildResourceUri(this.config.content_file);

        const response = await this.core.request({
          service: 'resource.fetch',
          payload: {
            uri,
            options: {
              as: 'text',
              encoding: 'utf-8',
              cache: true,  // 启用缓存
            },
          },
        });

        if (!response?.success) {
          throw new ResourceError(
            RichTextErrorCode.FILE_NOT_FOUND,
            t('error.file_not_found', { file: this.config.content_file }),
            { file: this.config.content_file, uri }
          );
        }

        return (response.data as { content: string }).content;
      }
    }

    return '';
  }

  /**
   * 挂载Vue组件
   */
  private mountVueComponent(): void {
    if (!this.container) return;

    // 卸载现有组件
    if (this.vueApp) {
      this.vueApp.unmount();
    }

    // 清空容器
    this.container.innerHTML = '';

    // 创建挂载点
    const mountPoint = document.createElement('div');
    mountPoint.className = 'chips-richtext-container';
    this.container.appendChild(mountPoint);

    // 创建Vue应用
    this.vueApp = createApp(RichTextRendererVue, {
      content: this.state.content,
      options: this.options,
      onLinkClick: this.handleLinkClick.bind(this),
      onImageClick: this.handleImageClick.bind(this),
    });

    // 挂载
    this.vueApp.mount(mountPoint);
  }

  /**
   * 应用主题
   */
  private async applyTheme(themeId: string): Promise<void> {
    if (!themeId || !this.container) return;

    // 通过Core获取主题
    if (this.core) {
      try {
        const response = await this.core.request({
          service: 'theme.get',
          payload: { themeId },
        });

        if (!response?.success) {
          console.warn(`Failed to load theme: ${themeId}`);
          return;
        }

        const theme = response.data as {
          variables?: {
            colors?: {
              text?: { primary?: string; secondary?: string };
              primary?: string;
              secondary?: string;
              background?: string;
              surface?: string;
              border?: string;
            };
            typography?: {
              fontFamily?: string;
              fontSize?: { small?: string; medium?: string; large?: string };
              lineHeight?: { normal?: string; medium?: string };
            };
            spacing?: {
              xs?: string;
              sm?: string;
              md?: string;
              lg?: string;
            };
            borderRadius?: {
              small?: string;
              medium?: string;
            };
          };
        };

        // 应用所有CSS变量
        this.applyThemeVariables(theme.variables || {});

        this.setState({ currentTheme: themeId });
      } catch (error) {
        console.error('Failed to apply theme:', error);
      }
    }
  }

  /**
   * 应用主题CSS变量
   */
  private applyThemeVariables(variables: any): void {
    if (!this.container) return;

    // 颜色变量
    if (variables.colors) {
      const { colors } = variables;
      this.container.style.setProperty('--richtext-text-color', colors.text?.primary || '');
      this.container.style.setProperty('--richtext-text-secondary', colors.text?.secondary || '');
      this.container.style.setProperty('--richtext-link-color', colors.primary || '');
      this.container.style.setProperty('--richtext-bg-color', colors.background || '');
      this.container.style.setProperty('--richtext-surface-color', colors.surface || '');
      this.container.style.setProperty('--richtext-border-color', colors.border || '');
    }

    // 字体变量
    if (variables.typography) {
      const { typography } = variables;
      this.container.style.setProperty('--richtext-font-family', typography.fontFamily || '');
      this.container.style.setProperty('--richtext-font-size', typography.fontSize?.medium || '');
      this.container.style.setProperty('--richtext-line-height', typography.lineHeight?.normal || '');
    }

    // 间距变量
    if (variables.spacing) {
      const { spacing } = variables;
      this.container.style.setProperty('--richtext-spacing-sm', spacing.sm || '');
      this.container.style.setProperty('--richtext-spacing-md', spacing.md || '');
      this.container.style.setProperty('--richtext-paragraph-spacing', spacing.md || '');
    }

    // 圆角变量
    if (variables.borderRadius) {
      const { borderRadius } = variables;
      this.container.style.setProperty('--richtext-border-radius', borderRadius.medium || '');
    }
  }

  /**
   * 设置响应式监听
   */
  private setupResizeObserver(): void {
    if (!this.container) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        this.setState({ containerWidth: width });
        this.applyResponsiveStyles(width);
      }
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * 应用响应式样式
   */
  private applyResponsiveStyles(width: number): void {
    if (!this.container) return;

    // 移除所有断点类
    this.container.classList.remove(
      'chips-richtext--mobile',
      'chips-richtext--tablet',
      'chips-richtext--desktop'
    );

    // 添加对应断点类
    if (width < 480) {
      this.container.classList.add('chips-richtext--mobile');
    } else if (width < 768) {
      this.container.classList.add('chips-richtext--tablet');
    } else {
      this.container.classList.add('chips-richtext--desktop');
    }
  }

  /**
   * 渲染错误状态
   */
  private renderError(error: Error): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="chips-richtext-error">
        <p>${t('error.render_failed')}</p>
        <small>${error.message}</small>
      </div>
    `;
  }

  /**
   * 处理链接点击
   */
  private handleLinkClick(url: string): void {
    if (!this.options?.interactive) return;

    // 通过Core打开链接
    if (this.core) {
      this.core.request({
        service: 'system.openUrl',
        payload: { url, newWindow: true },
      });
    } else {
      // 降级：直接打开
      window.open(url, '_blank', 'noopener');
    }
  }

  /**
   * 处理图片点击
   */
  private handleImageClick(src: string): void {
    if (!this.options?.interactive) return;

    // 通过Core打开图片查看器
    if (this.core) {
      this.core.request({
        service: 'viewer.openImage',
        payload: { src },
      });
    }
  }

  /**
   * 构建资源URI
   * @param path - 资源路径（相对路径、绝对路径或URL）
   * @returns chips:// 格式的URI
   */
  private buildResourceUri(path: string): string {
    // 如果是网络地址
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return `chips://network/${path}`;
    }

    // 如果是绝对路径
    if (path.startsWith('/')) {
      return `chips://local${path}`;
    }

    // 相对路径，相对于卡片
    const cardId = this.options?.cardId || '';
    return `chips://card/${cardId}/${path}`;
  }
}

export default RichTextRenderer;
