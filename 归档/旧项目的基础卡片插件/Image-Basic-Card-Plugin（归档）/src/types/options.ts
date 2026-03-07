/**
 * 选项类型定义
 */

/**
 * 渲染选项
 */
export interface RenderOptions {
  /** 卡片ID（用于构建资源URI） */
  cardId?: string;
  /**
   * 渲染模式
   * - view: 查看模式，只读展示
   * - edit: 编辑模式，可编辑
   */
  mode: 'view' | 'edit';
  /** 主题包ID */
  theme?: string;
  /** 是否只读 */
  readonly?: boolean;
  /**
   * 是否可交互（点击放大等）
   * @default true
   */
  interactive?: boolean;
  /**
   * 语言环境
   * @default 'zh-CN'
   */
  locale?: string;
}

/**
 * 编辑器选项
 */
export interface EditorOptions {
  /** 主题包ID */
  theme?: string;
  /**
   * 语言环境
   * @default 'zh-CN'
   */
  locale?: string;
  /**
   * 是否显示工具栏
   * @default true
   */
  toolbar?: boolean;
  /**
   * 是否显示预览
   * @default true
   */
  preview?: boolean;
  /**
   * 是否启用自动保存
   * @default true
   */
  autoSave?: boolean;
  /**
   * 自动保存延迟（毫秒）
   * @default 1000
   */
  saveDelay?: number;
  /**
   * 允许的最大图片数量
   * @default 50
   */
  maxImages?: number;
  /**
   * 允许的最大单张图片大小（MB）
   * @default 10
   */
  maxImageSize?: number;
  /**
   * 允许的图片格式
   * @default ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
   */
  acceptedFormats?: string[];
  /**
   * 资源解析回调（将卡片内相对路径解析为可访问 URL）
   */
  onResolveResource?: (resourcePath: string) => Promise<string>;
  /**
   * 资源释放回调（释放由 onResolveResource 创建的资源句柄）
   */
  onReleaseResolvedResource?: (resourcePath: string) => Promise<void> | void;
}
