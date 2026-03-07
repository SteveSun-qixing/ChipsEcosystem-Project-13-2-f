/**
 * 富文本编辑器
 */

import { createApp, App, reactive } from 'vue';
import type { ChipsCore } from '../plugin';
import type {
  RichTextCardConfig,
  RichTextEditorState,
  EditorOptions,
  FormatCommand,
  InsertCommand,
  ValidationResult,
  FormatType,
  BlockType,
} from '../types';
import RichTextEditorVue from './RichTextEditor.vue';
import { UndoManager } from './history';
import { sanitizeHtml } from '../utils/sanitizer';
import { countWords, escapeHtml, capitalize } from '../utils/dom';
import { t } from '../utils/i18n';

/**
 * 默认编辑器选项
 */
const DEFAULT_EDITOR_OPTIONS: EditorOptions = {
  toolbar: true,
  preview: false,
  autoSave: true,
  saveDelay: 1000,
  placeholder: '',
  maxLength: 100000,
  maxImageSize: 5,
};

/**
 * 富文本编辑器类
 */
export class RichTextEditor {
  private core: ChipsCore | null = null;
  private config: RichTextCardConfig | null = null;
  private container: HTMLElement | null = null;
  private options: EditorOptions | null = null;
  private vueApp: App<Element> | null = null;
  private undoManager: UndoManager;
  private changeCallbacks: Array<(config: RichTextCardConfig) => void> = [];
  private keyboardHandler: ((event: KeyboardEvent) => void) | null = null;

  private state: RichTextEditorState = reactive({
    content: '',
    selection: null,
    activeFormats: new Set<FormatType>(),
    currentBlock: 'paragraph',
    canUndo: false,
    canRedo: false,
    isDirty: false,
    wordCount: 0,
    isFocused: false,
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
    config: RichTextCardConfig,
    container: HTMLElement,
    options: EditorOptions
  ): Promise<void> {
    this.config = config;
    this.container = container;
    this.options = { ...DEFAULT_EDITOR_OPTIONS, ...options };

    // 初始化内容
    const content =
      config.content_source === 'inline'
        ? config.content_text || ''
        : await this.loadContentFromFile(config.content_file || '');

    this.state.content = sanitizeHtml(content);
    this.state.wordCount = countWords(this.state.content);

    // 初始化撤销管理器
    this.undoManager.init(this.state.content);

    // 挂载Vue组件
    this.mountVueComponent();

    // 设置全局快捷键
    this.setupKeyboardShortcuts();
  }

  /**
   * 获取配置
   */
  getConfig(): RichTextCardConfig {
    if (!this.config) {
      throw new Error(t('error.editor_not_initialized'));
    }

    return {
      ...this.config,
      content_text: this.state.content,
    };
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<RichTextCardConfig>): void {
    if (!this.config) return;

    this.config = { ...this.config, ...config };

    if (config.content_text !== undefined) {
      this.setContent(config.content_text);
    }
  }

  /**
   * 验证配置
   */
  validate(): ValidationResult {
    const errors = [];

    if (!this.state.content.trim()) {
      errors.push({
        field: 'content_text',
        message: t('richtext.error.content_required'),
        code: 'REQUIRED',
      });
    }

    if (this.options?.maxLength && this.state.wordCount > this.options.maxLength) {
      errors.push({
        field: 'content_text',
        message: t('richtext.error.content_too_long', { max: this.options.maxLength }),
        code: 'MAX_LENGTH',
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 注册变更回调
   */
  onChange(callback: (config: RichTextCardConfig) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 执行格式化命令
   */
  format(command: FormatCommand): void {
    const beforeHtml = this.state.content;

    this.executeFormatCommand(command);

    const afterHtml = this.getEditorContent();

    if (beforeHtml !== afterHtml) {
      this.undoManager.push({
        beforeHtml,
        afterHtml,
        type: 'format',
      });

      this.state.content = afterHtml;
      this.state.isDirty = true;
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();

      this.notifyChange();
    }
  }

  /**
   * 插入内容
   */
  insert(command: InsertCommand): void {
    const beforeHtml = this.state.content;

    this.executeInsertCommand(command);

    const afterHtml = this.getEditorContent();

    if (beforeHtml !== afterHtml) {
      this.undoManager.push({
        beforeHtml,
        afterHtml,
        type: 'insert',
      });

      this.state.content = afterHtml;
      this.state.isDirty = true;
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();
      this.state.wordCount = countWords(afterHtml);

      this.notifyChange();
    }
  }

  /**
   * 撤销
   */
  undo(): void {
    const entry = this.undoManager.undo();
    if (entry) {
      this.setEditorContent(entry.beforeHtml);
      this.state.content = entry.beforeHtml;
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
      this.setEditorContent(entry.afterHtml);
      this.state.content = entry.afterHtml;
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
  getState(): RichTextEditorState {
    return { ...this.state };
  }

  /**
   * 聚焦
   */
  focus(): void {
    const editor = this.container?.querySelector('[contenteditable]');
    (editor as HTMLElement)?.focus();
  }

  /**
   * 失焦
   */
  blur(): void {
    const editor = this.container?.querySelector('[contenteditable]');
    (editor as HTMLElement)?.blur();
  }

  /**
   * 获取内容
   */
  getContent(): string {
    return this.state.content;
  }

  /**
   * 设置内容
   */
  setContent(html: string): void {
    const beforeHtml = this.state.content;
    const safeHtml = sanitizeHtml(html);

    if (beforeHtml !== safeHtml) {
      this.undoManager.push({
        beforeHtml,
        afterHtml: safeHtml,
        type: 'input',
      });

      this.state.content = safeHtml;
      this.state.wordCount = countWords(safeHtml);
      this.state.isDirty = true;
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();

      this.setEditorContent(safeHtml);
      this.notifyChange();
    }
  }

  /**
   * 获取纯文本
   */
  getPlainText(): string {
    const div = document.createElement('div');
    div.innerHTML = this.state.content;
    return div.textContent || '';
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

  private mountVueComponent(): void {
    if (!this.container) return;

    // 卸载现有组件
    if (this.vueApp) {
      this.vueApp.unmount();
    }

    this.container.innerHTML = '';

    const mountPoint = document.createElement('div');
    mountPoint.className = 'chips-richtext-editor-wrapper';
    this.container.appendChild(mountPoint);

    this.vueApp = createApp(RichTextEditorVue, {
      initialContent: this.state.content,
      options: this.options,
      state: this.state,
      onFormat: this.format.bind(this),
      onInsert: this.insert.bind(this),
      onUndo: this.undo.bind(this),
      onRedo: this.redo.bind(this),
      onContentChange: this.handleContentChange.bind(this),
      onSelectionChange: this.handleSelectionChange.bind(this),
      onFocus: this.handleFocus.bind(this),
      onBlur: this.handleBlur.bind(this),
    });

    this.vueApp.mount(mountPoint);
  }

  private handleContentChange(html: string): void {
    const beforeHtml = this.state.content;
    const afterHtml = sanitizeHtml(html);

    if (beforeHtml !== afterHtml) {
      this.undoManager.push({
        beforeHtml,
        afterHtml,
        type: 'input',
      });

      this.state.content = afterHtml;
      this.state.isDirty = true;
      this.state.wordCount = countWords(afterHtml);
      this.state.canUndo = this.undoManager.canUndo();
      this.state.canRedo = this.undoManager.canRedo();

      this.notifyChange();
    }
  }

  private handleSelectionChange(
    selection: { startOffset: number; endOffset: number; collapsed: boolean } | null,
    formats: Set<FormatType>,
    block: BlockType
  ): void {
    this.state.selection = selection;
    this.state.activeFormats = formats;
    this.state.currentBlock = block;
  }

  private handleFocus(): void {
    this.state.isFocused = true;
  }

  private handleBlur(): void {
    this.state.isFocused = false;
  }

  private executeFormatCommand(command: FormatCommand): void {
    switch (command.type) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false);
        break;
      case 'superscript':
        document.execCommand('superscript', false);
        break;
      case 'subscript':
        document.execCommand('subscript', false);
        break;
      case 'code':
        // 自定义实现code格式
        this.wrapSelectionWithTag('code');
        break;
      case 'heading':
        if (command.level === 0) {
          document.execCommand('formatBlock', false, 'p');
        } else {
          document.execCommand('formatBlock', false, `h${command.level}`);
        }
        break;
      case 'orderedList':
        document.execCommand('insertOrderedList', false);
        break;
      case 'unorderedList':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'color':
        document.execCommand('foreColor', false, command.value);
        break;
      case 'backgroundColor':
        document.execCommand('hiliteColor', false, command.value);
        break;
      case 'fontSize':
        this.wrapSelectionWithStyle(`font-size: ${command.value}px`);
        break;
      case 'align':
        document.execCommand(`justify${capitalize(command.value)}`, false);
        break;
      case 'clearFormat':
        document.execCommand('removeFormat', false);
        break;
    }
  }

  private executeInsertCommand(command: InsertCommand): void {
    switch (command.type) {
      case 'link':
        const linkHtml = `<a href="${escapeHtml(command.url)}" ${
          command.newWindow ? 'target="_blank" rel="noopener"' : ''
        }>${escapeHtml(command.text || command.url)}</a>`;
        document.execCommand('insertHTML', false, linkHtml);
        break;

      case 'image':
        const imgHtml = `<img src="${escapeHtml(command.src)}" ${
          command.alt ? `alt="${escapeHtml(command.alt)}"` : ''
        } ${command.width ? `width="${command.width}"` : ''} ${
          command.height ? `height="${command.height}"` : ''
        } />`;
        document.execCommand('insertHTML', false, imgHtml);
        break;

      case 'horizontalRule':
        document.execCommand('insertHorizontalRule', false);
        break;
    }
  }

  private wrapSelectionWithTag(tagName: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const element = document.createElement(tagName);
    range.surroundContents(element);
  }

  private wrapSelectionWithStyle(style: string): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.setAttribute('style', style);

    try {
      range.surroundContents(span);
    } catch {
      // 如果选区跨越多个元素，降级处理
      document.execCommand('insertHTML', false, `<span style="${style}">${selection.toString()}</span>`);
    }
  }

  private getEditorContent(): string {
    const editor = this.container?.querySelector('[contenteditable]');
    return editor?.innerHTML || '';
  }

  private setEditorContent(html: string): void {
    const editor = this.container?.querySelector('[contenteditable]');
    if (editor) {
      editor.innerHTML = html;
    }
  }

  private async loadContentFromFile(path: string): Promise<string> {
    if (!path || !this.core) return '';

    const response = await this.core.request({
      service: 'resource.read',
      payload: { uri: path, encoding: 'utf-8' },
    });

    return (response?.data as { content: string })?.content || '';
  }

  private setupKeyboardShortcuts(): void {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.state.isFocused) return;

      const isMac = navigator.platform.includes('Mac');
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd+Z: 撤销
      if (modifier && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        this.undo();
        return;
      }

      // Ctrl/Cmd+Shift+Z 或 Ctrl+Y: 重做
      if (
        (modifier && event.key === 'z' && event.shiftKey) ||
        (event.ctrlKey && event.key === 'y')
      ) {
        event.preventDefault();
        this.redo();
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

export default RichTextEditor;
