/**
 * 工具函数统一导出
 */

// HTML安全过滤
export { sanitizeHtml, isSafeHtml } from './sanitizer';

// 配置验证
export { validateConfig, getDefaultConfig, mergeDefaults } from './validator';

// 国际化
export { t, hasKey, getAllKeys } from './i18n';

// DOM工具
export {
  parseHtml,
  walkNodes,
  extractText,
  countWords,
  isEmpty,
  getFirstImage,
  getAllLinks,
  getBlockParent,
  escapeHtml,
  capitalize,
  debounce,
  throttle,
} from './dom';
