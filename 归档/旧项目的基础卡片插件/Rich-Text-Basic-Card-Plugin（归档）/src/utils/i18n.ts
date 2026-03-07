/**
 * 国际化工具
 *
 * ⚠️ 重要说明：
 * 1. 开发时使用词汇key（如 'toolbar.bold'）
 * 2. 词汇定义在 assets/i18n/dev_vocabulary.yaml
 * 3. 构建时自动替换为系统编码（如 'i18n.plugin.400001'）
 * 4. 运行时系统根据当前语言返回翻译文本
 */

/**
 * 开发阶段词汇表
 * ⚠️ 实际应该从 assets/i18n/dev_vocabulary.yaml 加载
 */
const DEV_VOCABULARY: Record<string, string> = {
  // 插件
  'plugin.initialized': '富文本卡片插件已初始化',
  'plugin.already_initialized': '插件已经初始化',
  'plugin.not_initialized': '插件未初始化',
  'plugin.started': '插件已启动',
  'plugin.stopped': '插件已停止',
  'plugin.destroyed': '插件已销毁',

  // 工具栏
  'toolbar.bold': '加粗',
  'toolbar.italic': '斜体',
  'toolbar.underline': '下划线',
  'toolbar.strikethrough': '删除线',
  'toolbar.superscript': '上标',
  'toolbar.subscript': '下标',
  'toolbar.code': '代码',
  'toolbar.heading': '标题',
  'toolbar.paragraph': '正文',
  'toolbar.ordered_list': '有序列表',
  'toolbar.unordered_list': '无序列表',
  'toolbar.blockquote': '引用',
  'toolbar.color': '文字颜色',
  'toolbar.background_color': '背景色',
  'toolbar.font_size': '字号',
  'toolbar.align_left': '左对齐',
  'toolbar.align_center': '居中',
  'toolbar.align_right': '右对齐',
  'toolbar.align_justify': '两端对齐',
  'toolbar.link': '链接',
  'toolbar.image': '图片',
  'toolbar.horizontal_rule': '分隔线',
  'toolbar.undo': '撤销',
  'toolbar.redo': '重做',
  'toolbar.clear_format': '清除格式',

  // 对话框
  'dialog.cancel': '取消',
  'dialog.confirm': '确定',
  'dialog.close': '关闭',
  'dialog.link_title': '插入链接',
  'dialog.link_url': '链接地址',
  'dialog.link_url_placeholder': '请输入URL',
  'dialog.link_text': '链接文本',
  'dialog.link_text_placeholder': '链接显示文本（可选）',
  'dialog.link_new_window': '在新窗口打开',
  'dialog.remove_link': '移除链接',
  'dialog.image_title': '插入图片',
  'dialog.image_upload': '上传图片',
  'dialog.image_url': '图片地址',
  'dialog.image_url_placeholder': '请输入图片URL',
  'dialog.image_alt': '替代文本',
  'dialog.image_alt_placeholder': '图片描述（可选）',

  // 提示
  'hint.placeholder': '请输入内容...',
  'hint.image_upload_hint': '点击或拖放图片到此处上传',
  'hint.image_max_size': '最大 {max}MB',
  'hint.word_count': '字数: {count}',

  // 消息
  'message.save_success': '保存成功',
  'message.upload_success': '上传成功',

  // 错误
  'error.invalid_url': '无效的URL',
  'error.content_required': '内容不能为空',
  'error.content_too_long': '内容超过最大长度 {max}',
  'error.unsupported_format': '不支持的文件格式',
  'error.image_too_large': '图片大小超过 {max}MB',
  'error.render_failed': '渲染失败',
  'error.load_failed': '加载失败',
  'error.file_not_found': '文件未找到: {file}',
  'error.editor_not_initialized': '编辑器未初始化',

  // 确认
  'confirm.clear_content': '确定要清除所有内容吗？',

  // 状态
  'status.loading': '加载中...',
  'status.saving': '保存中...',

  // 日志
  'log.renderer_created': '渲染器已创建',
  'log.editor_created': '编辑器已创建',
  'log.service_registered': '服务已注册: {service}',
};

function normalizeKey(key: string): string {
  if (key.startsWith('richtext.')) {
    return key.slice('richtext.'.length);
  }
  return key;
}

/**
 * 获取翻译文本
 *
 * @param key - 翻译键（开发时使用，构建时替换为系统编码）
 * @param vars - 变量替换
 * @returns 翻译后的文本
 *
 * @example
 * ```typescript
 * // 开发时
 * t('toolbar.bold')  // → "加粗"
 *
 * // 构建后
 * t('i18n.plugin.400001')  // → 系统根据当前语言返回翻译
 *
 * // 带变量
 * t('error.file_not_found', { file: 'test.txt' })
 * // → "文件未找到: test.txt"
 * ```
 */
export function t(key: string, vars?: Record<string, unknown>): string {
  // ⚠️ 实际生产环境应该调用系统多语言API
  // import { t as systemT } from '@chips/i18n';
  // return systemT(key, vars);

  const normalizedKey = normalizeKey(key);
  let text = DEV_VOCABULARY[normalizedKey] || key;

  // 变量替换
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}

/**
 * 检查键是否存在
 */
export function hasKey(key: string): boolean {
  return normalizeKey(key) in DEV_VOCABULARY;
}

/**
 * 获取所有词汇键
 */
export function getAllKeys(): string[] {
  return Object.keys(DEV_VOCABULARY);
}
