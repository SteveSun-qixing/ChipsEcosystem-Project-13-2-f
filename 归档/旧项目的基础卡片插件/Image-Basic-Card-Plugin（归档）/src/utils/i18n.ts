/**
 * 国际化工具
 *
 * ⚠️ 重要说明：
 * 1. 开发时使用词汇key（如 'editor.upload'）
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
  'plugin.initialized': '图片卡片插件已初始化',
  'plugin.already_initialized': '插件已经初始化',
  'plugin.not_initialized': '插件未初始化',
  'plugin.started': '插件已启动',
  'plugin.stopped': '插件已停止',
  'plugin.destroyed': '插件已销毁',

  // 工具栏
  'toolbar.undo': '撤销',
  'toolbar.redo': '重做',

  // 编辑器
  'editor.upload': '上传图片',
  'editor.upload_hint': '点击上传图片，或将图片拖放到此处',
  'editor.upload_sub_hint': '支持 JPG、PNG、GIF、WebP 格式',
  'editor.url_input': '图片URL',
  'editor.url_placeholder': '请粘贴图片链接地址，如 https://...',
  'editor.add_by_url': '添加',
  'editor.remove_image': '删除这张图片',
  'editor.replace_image': '替换图片',
  'editor.move_up': '上移',
  'editor.move_down': '下移',
  'editor.image_alt': '替代文本',
  'editor.image_alt_placeholder': '图片描述（用于无障碍访问，可选）',
  'editor.image_title': '图片标题',
  'editor.image_title_placeholder': '为这张图片添加标题（可选）',
  'editor.image_count': '共 {count} 张图片',
  'editor.max_images_hint': '最多可添加 {max} 张图片',
  'editor.drag_to_sort': '拖拽可调整顺序',
  'editor.clear_all': '清空全部',
  'editor.section_add_images': '添加图片',
  'editor.section_image_list': '图片列表',
  'editor.section_or': '或',
  'editor.empty_hint': '还没有添加图片，请从上方上传或输入链接',
  'editor.image_index': '第 {index} 张',

  // 排版设置
  'layout.title': '排版设置',
  'layout.type': '排版类型',
  'layout.single': '单张图片',
  'layout.grid': '网格排版',
  'layout.long_scroll': '长图拼接',
  'layout.horizontal_scroll': '横向滑动',
  'layout.grid_mode': '网格模式',
  'layout.grid_2x2': '2 × 2 网格',
  'layout.grid_3x3': '3 × 3 网格',
  'layout.grid_3col_infinite': '3 列瀑布流',
  'layout.scroll_mode': '滚动模式',
  'layout.fixed_window': '固定窗口滚动',
  'layout.adaptive': '自适应（无限长）',
  'layout.window_height': '窗口高度',
  'layout.width_percent': '图片宽度',
  'layout.alignment': '对齐方式',
  'layout.align_left': '靠左',
  'layout.align_center': '居中',
  'layout.align_right': '靠右',
  'layout.gap': '图片间距',
  'layout.single_desc': '展示一张图片，可调整宽度和对齐方式',
  'layout.grid_desc': '以网格形式排列展示多张图片',
  'layout.long_scroll_desc': '将图片纵向拼接为长图，可滚动浏览',
  'layout.horizontal_scroll_desc': '图片横向排列，可水平滑动查看',

  // 提示
  'hint.single_auto': '仅有1张图片，自动使用单张排版',
  'hint.grid_overflow': '+{count}',
  'hint.scroll_horizontal': '横向滑动查看更多图片',

  // 消息
  'message.upload_success': '上传成功',
  'message.image_added': '图片已添加',
  'message.image_removed': '图片已删除',
  'message.images_cleared': '已清空所有图片',
  'message.order_updated': '排序已更新',

  // 错误
  'error.invalid_url': '无效的图片地址',
  'error.image_too_large': '图片大小超过 {max}MB',
  'error.unsupported_format': '不支持的图片格式',
  'error.max_images_exceeded': '图片数量已达上限 {max}',
  'error.upload_failed': '图片上传失败',
  'error.load_failed': '图片加载失败',
  'error.image_not_found': '图片未找到: {file}',
  'error.render_failed': '渲染失败',
  'error.editor_not_initialized': '编辑器未初始化',

  // 确认
  'confirm.remove_image': '确定要删除这张图片吗？',
  'confirm.clear_all': '确定要清空所有图片吗？这将移除全部已添加的图片。',

  // 状态
  'status.loading': '加载中...',
  'status.uploading': '正在上传...',

  // 日志
  'log.renderer_created': '渲染器已创建',
  'log.editor_created': '编辑器已创建',
  'log.service_registered': '服务已注册: {service}',
  'log.image_loaded': '图片已加载: {id}',
  'log.image_load_error': '图片加载失败: {id}',

  // 通用
  'common.cancel': '取消',
  'common.confirm': '确定',
  'common.close': '关闭',
  'common.save': '保存',
  'common.delete': '删除',
  'common.pixels': 'px',
  'common.percent': '%',
};

/**
 * 规范化键名
 */
function normalizeKey(key: string): string {
  if (key.startsWith('image.')) {
    return key.slice('image.'.length);
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
 * t('editor.upload')  // → "上传图片"
 *
 * // 构建后
 * t('i18n.plugin.400001')  // → 系统根据当前语言返回翻译
 *
 * // 带变量
 * t('error.image_too_large', { max: 10 })
 * // → "图片大小超过 10MB"
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
