/**
 * 图片编辑器
 */

import { createApp, App, reactive } from 'vue';
import type { ChipsCore } from '../plugin';
import type {
  ImageCardConfig,
  ImageEditorState,
  EditorOptions,
  ImageCommand,
  ValidationResult,
  ImageItem,
  LayoutType,
  LayoutOptions,
} from '../types';
import { DEFAULT_CONFIG, DEFAULT_MAX_IMAGES, DEFAULT_MAX_IMAGE_SIZE, ACCEPTED_IMAGE_FORMATS } from '../types/constants';
import ImageEditorVue from './ImageEditor.vue';
import { UndoManager } from './history';
import { t } from '../utils/i18n';
import { generateId, arrayMove } from '../utils/dom';
import { validateImageFormat, validateImageSize } from '../utils/validator';

/**
 * 默认编辑器选项
 */
const DEFAULT_EDITOR_OPTIONS: EditorOptions = {
  toolbar: true,
  preview: true,
  autoSave: true,
  saveDelay: 1000,
  maxImages: DEFAULT_MAX_IMAGES,
  maxImageSize: DEFAULT_MAX_IMAGE_SIZE,
  acceptedFormats: ACCEPTED_IMAGE_FORMATS,
};

/**
 * 图片编辑器类
 */
export class ImageEditor {
  private core: ChipsCore | null = null;
  private config: ImageCardConfig | null = null;
  private container: HTMLElement | null = null;
  private options: EditorOptions | null = null;
  private vueApp: App<Element> | null = null;
  private undoManager: UndoManager;
  private changeCallbacks: Array<(config: ImageCardConfig) => void> = [];
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

  private state: ImageEditorState = reactive({
    images: [],
    layoutType: 'single',
    isDirty: false,
    canUndo: false,
    canRedo: false,
    isUploading: false,
    uploadProgress: 0,
    selectedImageId: null,
    draggingImageId: null,
  });

  constructor() {
    this.undoManager = new UndoManager();
  }

  /**
   * 设置Core引用
   */
  setCore(core: ChipsCore): void {
    this.core = core;
  }

  /**
   * 渲染编辑器
   */
  async render(
    config: ImageCardConfig,
    container: HTMLElement,
    options: EditorOptions
  ): Promise<void> {
    this.config = { ...config };
    this.container = container;
    this.options = { ...DEFAULT_EDITOR_OPTIONS, ...options };

    // 初始化状态
    this.state.images = [...config.images];
    this.state.layoutType = config.layout_type || 'single';

    // 初始化撤销管理器
    this.undoManager.init(this.config);

    // 挂载Vue组件
    this.mountVueComponent();

    // 设置快捷键
    this.setupKeyboardShortcuts();
  }

  /**
   * 获取配置
   */
  getConfig(): ImageCardConfig {
    if (!this.config) {
      throw new Error(t('error.editor_not_initialized'));
    }

    return {
      ...this.config,
      images: [...this.state.images],
      layout_type: this.state.layoutType,
    };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<ImageCardConfig>): void {
    if (!this.config) return;

    this.config = { ...this.config, ...config };

    if (config.images !== undefined) {
      this.state.images = [...config.images];
    }
    if (config.layout_type !== undefined) {
      this.state.layoutType = config.layout_type;
    }
  }

  /**
   * 验证配置
   */
  validate(): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (this.state.images.length === 0) {
      errors.push({
        field: 'images',
        message: t('error.load_failed'),
        code: 'NO_IMAGES',
      });
    }

    // 验证每张图片
    this.state.images.forEach((img, index) => {
      if (img.source === 'file' && !img.file_path) {
        errors.push({
          field: `images[${index}].file_path`,
          message: t('error.image_not_found', { file: '' }),
          code: 'MISSING_FILE_PATH',
        });
      }
      if (img.source === 'url' && !img.url) {
        errors.push({
          field: `images[${index}].url`,
          message: t('error.invalid_url'),
          code: 'MISSING_URL',
        });
      }
    });

    return {
      valid: (errors?.length ?? 0) === 0,
      errors: errors && errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 注册变更回调
   */
  onChange(callback: (config: ImageCardConfig) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 执行命令
   */
  executeCommand(command: ImageCommand): void {
    if (!this.config) return;

    const beforeState = this.getConfig();

    switch (command.type) {
      case 'add_image':
        this.addImage(command.image);
        break;

      case 'remove_image':
        this.removeImage(command.imageId);
        break;

      case 'move_image':
        this.moveImage(command.imageId, command.targetIndex);
        break;

      case 'update_image':
        this.updateImage(command.imageId, command.updates);
        break;

      case 'set_layout_type':
        this.setLayoutType(command.layoutType);
        break;

      case 'update_layout_options':
        this.updateLayoutOptions(command.options);
        break;

      case 'batch_add_images':
        this.batchAddImages(command.images);
        break;

      case 'clear_all_images':
        this.clearAllImages();
        break;

      case 'replace_image':
        this.replaceImage(command.imageId, command.newImage);
        break;
    }

    const afterState = this.getConfig();

    // 记录到历史
    this.undoManager.push({
      type: this.mapCommandToHistoryType(command.type),
      beforeState,
      afterState,
    });

    this.state.isDirty = true;
    this.state.canUndo = this.undoManager.canUndo();
    this.state.canRedo = this.undoManager.canRedo();

    this.notifyChange();
  }

  /**
   * 处理图片文件上传
   */
  async handleFileUpload(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files);
    const maxImages = this.options?.maxImages ?? DEFAULT_MAX_IMAGES;
    const maxSize = this.options?.maxImageSize ?? DEFAULT_MAX_IMAGE_SIZE;
    const acceptedFormats = this.options?.acceptedFormats ?? ACCEPTED_IMAGE_FORMATS;

    // 检查数量限制
    if (this.state.images.length + fileArray.length > maxImages) {
      console.warn(t('error.max_images_exceeded', { max: maxImages }));
      return;
    }

    this.state.isUploading = true;
    this.state.uploadProgress = 0;

    const newImages: ImageItem[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file) continue;

      // 验证格式
      if (!validateImageFormat(file.type, acceptedFormats)) {
        console.warn(t('error.unsupported_format'));
        continue;
      }

      // 验证大小
      if (!validateImageSize(file.size, maxSize)) {
        console.warn(t('error.image_too_large', { max: maxSize }));
        continue;
      }

      try {
        // 上传文件
        const filePath = await this.uploadFile(file);

        newImages.push({
          id: generateId(),
          source: 'file',
          file_path: filePath,
          alt: '',
          title: file.name.replace(/\.[^.]+$/, ''),
        });
      } catch (error) {
        console.error(t('error.upload_failed'), error);
      }

      this.state.uploadProgress = Math.round(((i + 1) / fileArray.length) * 100);
    }

    this.state.isUploading = false;
    this.state.uploadProgress = 0;

    if (newImages.length > 0) {
      this.executeCommand({
        type: 'batch_add_images',
        images: newImages,
      });
    }
  }

  /**
   * 通过URL添加图片
   */
  addImageByUrl(url: string, alt?: string, title?: string): void {
    this.executeCommand({
      type: 'add_image',
      image: {
        id: generateId(),
        source: 'url',
        url,
        alt: alt || '',
        title: title || '',
      },
    });
  }

  /**
   * 撤销
   */
  undo(): void {
    const entry = this.undoManager.undo();
    if (entry) {
      this.restoreState(entry.beforeState);
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();
      this.notifyChange();
    }
  }

  /**
   * 重做
   */
  redo(): void {
    const entry = this.undoManager.redo();
    if (entry) {
      this.restoreState(entry.afterState);
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();
      this.notifyChange();
    }
  }

  /**
   * 是否可撤销
   */
  canUndo(): boolean {
    return this.undoManager.canUndo();
  }

  /**
   * 是否可重做
   */
  canRedo(): boolean {
    return this.undoManager.canRedo();
  }

  /**
   * 获取状态
   */
  getState(): ImageEditorState {
    return { ...this.state };
  }

  /**
   * 销毁
   */
  async destroy(): Promise<void> {
    this.removeKeyboardShortcuts();

    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    this.changeCallbacks = [];
    this.config = null;
    this.options = null;
  }

  // ===== 私有方法 =====

  private addImage(image: ImageItem): void {
    this.state.images.push({ ...image });
  }

  private removeImage(imageId: string): void {
    const index = this.state.images.findIndex((img) => img.id === imageId);
    if (index !== -1) {
      this.state.images.splice(index, 1);
    }
    if (this.state.selectedImageId === imageId) {
      this.state.selectedImageId = null;
    }
  }

  private moveImage(imageId: string, targetIndex: number): void {
    const fromIndex = this.state.images.findIndex((img) => img.id === imageId);
    if (fromIndex !== -1 && targetIndex >= 0 && targetIndex < this.state.images.length) {
      this.state.images = arrayMove(this.state.images, fromIndex, targetIndex);
    }
  }

  private updateImage(imageId: string, updates: Partial<ImageItem>): void {
    const image = this.state.images.find((img) => img.id === imageId);
    if (image) {
      Object.assign(image, updates);
    }
  }

  private setLayoutType(layoutType: LayoutType): void {
    this.state.layoutType = layoutType;
    if (this.config) {
      this.config.layout_type = layoutType;
    }
  }

  private updateLayoutOptions(options: Partial<LayoutOptions>): void {
    if (this.config) {
      this.config.layout_options = {
        ...this.config.layout_options,
        ...options,
      };
    }
  }

  private batchAddImages(images: ImageItem[]): void {
    this.state.images.push(...images.map((img) => ({ ...img })));
  }

  private clearAllImages(): void {
    this.state.images = [];
    this.state.selectedImageId = null;
  }

  private replaceImage(imageId: string, newImage: ImageItem): void {
    const index = this.state.images.findIndex((img) => img.id === imageId);
    if (index !== -1) {
      this.state.images[index] = { ...newImage };
    }
  }

  private restoreState(config: ImageCardConfig): void {
    this.config = { ...config };
    this.state.images = [...config.images];
    this.state.layoutType = config.layout_type;
  }

  private mapCommandToHistoryType(
    commandType: ImageCommand['type']
  ): 'add' | 'remove' | 'move' | 'update' | 'layout' | 'batch' | 'clear' {
    const map: Record<string, 'add' | 'remove' | 'move' | 'update' | 'layout' | 'batch' | 'clear'> = {
      add_image: 'add',
      remove_image: 'remove',
      move_image: 'move',
      update_image: 'update',
      set_layout_type: 'layout',
      update_layout_options: 'layout',
      batch_add_images: 'batch',
      clear_all_images: 'clear',
      replace_image: 'update',
    };
    return map[commandType] || 'update';
  }

  private async uploadFile(file: File): Promise<string> {
    if (!this.core) {
      // 降级：使用本地Data URL
      return URL.createObjectURL(file);
    }

    // 将文件转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const response = await this.core.request({
      service: 'resource.write',
      payload: {
        uri: `chips://card/${file.name}`,
        data: base64,
        encoding: 'base64',
        mimeType: file.type,
      },
    });

    if (!response?.success) {
      throw new Error(t('error.upload_failed'));
    }

    return (response.data as { path: string }).path || file.name;
  }

  private mountVueComponent(): void {
    if (!this.container) return;

    if (this.vueApp) {
      this.vueApp.unmount();
    }

    this.container.innerHTML = '';

    const mountPoint = document.createElement('div');
    mountPoint.className = 'chips-image-editor-wrapper';
    this.container.appendChild(mountPoint);

    this.vueApp = createApp(ImageEditorVue, {
      state: this.state,
      config: this.config,
      options: this.options,
      onExecuteCommand: this.executeCommand.bind(this),
      onFileUpload: this.handleFileUpload.bind(this),
      onAddByUrl: this.addImageByUrl.bind(this),
      onUndo: this.undo.bind(this),
      onRedo: this.redo.bind(this),
    });

    this.vueApp.mount(mountPoint);
  }

  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (event: KeyboardEvent) => {
      const isMac = navigator.platform.includes('Mac');
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd+Z: 撤销
      if (modifier && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z: 重做
      if (modifier && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        this.redo();
        return;
      }

      // Ctrl+Y: 重做
      if (event.ctrlKey && event.key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }

      // Delete: 删除选中图片
      if (event.key === 'Delete' && this.state.selectedImageId) {
        event.preventDefault();
        this.executeCommand({
          type: 'remove_image',
          imageId: this.state.selectedImageId,
        });
        return;
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
  }

  private removeKeyboardShortcuts(): void {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }

  private notifyChange(): void {
    const config = this.getConfig();
    this.changeCallbacks.forEach((cb) => cb(config));
  }
}

export default ImageEditor;
