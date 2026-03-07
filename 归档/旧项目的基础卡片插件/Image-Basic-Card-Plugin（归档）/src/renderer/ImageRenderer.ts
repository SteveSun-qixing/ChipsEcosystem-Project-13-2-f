/**
 * 图片渲染器
 */

import { createApp, App } from 'vue';
import type { ChipsCore } from '../plugin';
import type {
  ImageCardConfig,
  ImageRendererState,
  RenderOptions,
  ImageItem,
} from '../types';
import { ImageErrorCode, ResourceError } from '../types/errors';
import ImageRendererVue from './ImageRenderer.vue';
import { t } from '../utils/i18n';

/**
 * 图片渲染器类
 */
export class ImageRenderer {
  private core: ChipsCore | null = null;
  private config: ImageCardConfig | null = null;
  private container: HTMLElement | null = null;
  private options: RenderOptions | null = null;
  private vueApp: App<Element> | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private state: ImageRendererState = {
    loadedImages: [],
    isLoading: false,
    error: null,
    currentTheme: '',
    containerWidth: 0,
    scrollPosition: 0,
    currentImageIndex: 0,
  };

  /**
   * 设置Core引用
   */
  setCore(core: ChipsCore): void {
    this.core = core;
  }

  /**
   * 渲染图片卡片
   */
  async render(
    config: ImageCardConfig,
    container: HTMLElement,
    options: RenderOptions
  ): Promise<void> {
    this.config = config;
    this.container = container;
    this.options = options;

    // 设置加载状态
    this.setState({ isLoading: true, error: null });

    try {
      // 1. 解析图片URL
      const resolvedImages = await this.resolveImageUrls(config.images);

      // 2. 自动判断排版类型
      const effectiveLayoutType =
        resolvedImages.length <= 1 ? 'single' : config.layout_type;

      // 3. 更新状态
      this.setState({
        loadedImages: resolvedImages.map((img) => img.resolvedUrl),
        isLoading: false,
      });

      // 4. 挂载Vue组件
      this.mountVueComponent(resolvedImages, effectiveLayoutType);

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
  async update(config: Partial<ImageCardConfig>): Promise<void> {
    if (!this.config || !this.container || !this.options) return;

    this.config = { ...this.config, ...config };

    // 重新渲染
    await this.render(this.config, this.container, this.options);
  }

  /**
   * 获取状态
   */
  getState(): ImageRendererState {
    return { ...this.state };
  }

  /**
   * 设置状态
   */
  setState(state: Partial<ImageRendererState>): void {
    this.state = { ...this.state, ...state };
  }

  /**
   * 销毁渲染器
   */
  async destroy(): Promise<void> {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.config = null;
    this.options = null;
  }

  /**
   * 解析图片URL列表
   */
  private async resolveImageUrls(
    images: ImageItem[]
  ): Promise<Array<ImageItem & { resolvedUrl: string }>> {
    const resolved: Array<ImageItem & { resolvedUrl: string }> = [];

    for (const image of images) {
      try {
        let resolvedUrl = '';

        if (image.source === 'url' && image.url) {
          resolvedUrl = image.url;
        } else if (image.source === 'file' && image.file_path) {
          resolvedUrl = await this.resolveFilePath(image.file_path);
        }

        if (resolvedUrl) {
          resolved.push({ ...image, resolvedUrl });
        }
      } catch (error) {
        console.warn(`Failed to resolve image ${image.id}:`, error);
        // 继续处理其他图片，不阻塞渲染
      }
    }

    return resolved;
  }

  /**
   * 解析本地文件路径为可访问URL
   */
  private async resolveFilePath(path: string): Promise<string> {
    if (!this.core) return path;

    const uri = this.buildResourceUri(path);

    const response = await this.core.request({
      service: 'resource.fetch',
      payload: {
        uri,
        options: {
          as: 'url',
          cache: true,
        },
      },
    });

    if (!response?.success) {
      throw new ResourceError(
        ImageErrorCode.IMAGE_NOT_FOUND,
        t('error.image_not_found', { file: path }),
        { file: path, uri }
      );
    }

    return (response.data as { url: string }).url;
  }

  /**
   * 挂载Vue组件
   */
  private mountVueComponent(
    resolvedImages: Array<ImageItem & { resolvedUrl: string }>,
    effectiveLayoutType: string
  ): void {
    if (!this.container || !this.config) return;

    // 卸载现有组件
    if (this.vueApp) {
      this.vueApp.unmount();
    }

    this.container.innerHTML = '';

    // 创建挂载点
    const mountPoint = document.createElement('div');
    mountPoint.className = 'chips-image-container';
    this.container.appendChild(mountPoint);

    // 创建Vue应用
    this.vueApp = createApp(ImageRendererVue, {
      images: resolvedImages,
      layoutType: effectiveLayoutType,
      layoutOptions: this.config.layout_options || {},
      interactive: this.options?.interactive !== false,
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
              text?: { primary?: string };
              background?: string;
              border?: string;
            };
            spacing?: {
              sm?: string;
              md?: string;
            };
            borderRadius?: {
              small?: string;
              medium?: string;
            };
          };
        };

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
  private applyThemeVariables(variables: Record<string, unknown>): void {
    if (!this.container) return;

    const vars = variables as {
      colors?: {
        text?: { primary?: string };
        background?: string;
        border?: string;
      };
      spacing?: {
        sm?: string;
        md?: string;
      };
      borderRadius?: {
        small?: string;
        medium?: string;
      };
    };

    if (vars.colors) {
      const { colors } = vars;
      this.container.style.setProperty('--chips-image-text-color', colors.text?.primary || '');
      this.container.style.setProperty('--chips-image-bg-color', colors.background || '');
      this.container.style.setProperty('--chips-image-border-color', colors.border || '');
    }

    if (vars.spacing) {
      const { spacing } = vars;
      this.container.style.setProperty('--chips-image-gap', spacing.sm || '');
      this.container.style.setProperty('--chips-image-padding', spacing.md || '');
    }

    if (vars.borderRadius) {
      const { borderRadius } = vars;
      this.container.style.setProperty('--chips-image-border-radius', borderRadius.medium || '');
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

    this.container.classList.remove(
      'chips-image--mobile',
      'chips-image--tablet',
      'chips-image--desktop'
    );

    if (width < 480) {
      this.container.classList.add('chips-image--mobile');
    } else if (width < 768) {
      this.container.classList.add('chips-image--tablet');
    } else {
      this.container.classList.add('chips-image--desktop');
    }
  }

  /**
   * 渲染错误状态
   */
  private renderError(error: Error): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="chips-image-error">
        <p>${t('error.render_failed')}</p>
        <small>${error.message}</small>
      </div>
    `;
  }

  /**
   * 处理图片点击
   */
  private handleImageClick(index: number, src: string): void {
    if (!this.options?.interactive) return;

    this.setState({ currentImageIndex: index });

    // 通过Core打开图片查看器
    if (this.core) {
      this.core.request({
        service: 'viewer.openImage',
        payload: {
          src,
          index,
          images: this.state.loadedImages,
        },
      });
    }
  }

  /**
   * 构建资源URI
   */
  private buildResourceUri(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return `chips://network/${path}`;
    }

    if (path.startsWith('/')) {
      return `chips://local${path}`;
    }

    const cardId = this.options?.cardId || '';
    return `chips://card/${cardId}/${path}`;
  }
}

export default ImageRenderer;
