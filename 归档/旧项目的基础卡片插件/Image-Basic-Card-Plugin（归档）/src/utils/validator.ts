/**
 * 配置验证器
 */

import type { ImageCardConfig, ImageItem, LayoutOptions } from '../types/config';
import type { ValidationResult, ValidationError } from '../types/validation';
import { DEFAULT_CONFIG, ACCEPTED_IMAGE_FORMATS } from '../types/constants';

/**
 * 验证图片卡片配置
 *
 * @param config - 待验证的配置
 * @returns 验证结果
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // 检查是否为对象
  if (!config || typeof config !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'config',
          message: '配置必须是对象',
          code: 'INVALID_TYPE',
        },
      ],
    };
  }

  const cfg = config as Record<string, unknown>;

  // 验证card_type
  if (cfg.card_type !== 'ImageCard') {
    errors.push({
      field: 'card_type',
      message: 'card_type必须为ImageCard',
      code: 'INVALID_CARD_TYPE',
    });
  }

  // 验证images
  if (!Array.isArray(cfg.images)) {
    errors.push({
      field: 'images',
      message: 'images必须是数组',
      code: 'INVALID_IMAGES',
    });
  } else {
    // 验证每张图片
    (cfg.images as unknown[]).forEach((img, index) => {
      const imgErrors = validateImageItem(img, index);
      errors.push(...imgErrors);
    });
  }

  // 验证layout_type
  const validLayoutTypes = ['single', 'grid', 'long-scroll', 'horizontal-scroll'];
  if (cfg.layout_type !== undefined && !validLayoutTypes.includes(cfg.layout_type as string)) {
    errors.push({
      field: 'layout_type',
      message: 'layout_type必须为single、grid、long-scroll或horizontal-scroll',
      code: 'INVALID_LAYOUT_TYPE',
    });
  }

  // 验证layout_options
  if (cfg.layout_options !== undefined) {
    const optErrors = validateLayoutOptions(
      cfg.layout_options as Record<string, unknown>,
      cfg.layout_type as string
    );
    errors.push(...optErrors);
  }

  // 验证layout
  if (cfg.layout !== undefined) {
    if (typeof cfg.layout !== 'object' || cfg.layout === null) {
      errors.push({
        field: 'layout',
        message: 'layout必须是对象',
        code: 'INVALID_LAYOUT',
      });
    } else {
      const layout = cfg.layout as Record<string, unknown>;

      if (
        layout.height_mode !== undefined &&
        !['auto', 'fixed'].includes(layout.height_mode as string)
      ) {
        errors.push({
          field: 'layout.height_mode',
          message: 'height_mode必须为auto或fixed',
          code: 'INVALID_HEIGHT_MODE',
        });
      }

      if (layout.fixed_height !== undefined) {
        if (typeof layout.fixed_height !== 'number' || layout.fixed_height <= 0) {
          errors.push({
            field: 'layout.fixed_height',
            message: 'fixed_height必须为正整数',
            code: 'INVALID_FIXED_HEIGHT',
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 验证单张图片项
 */
function validateImageItem(item: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!item || typeof item !== 'object') {
    errors.push({
      field: `images[${index}]`,
      message: '图片项必须是对象',
      code: 'INVALID_IMAGE_ITEM',
    });
    return errors;
  }

  const img = item as Record<string, unknown>;

  // 验证id
  if (!img.id || typeof img.id !== 'string') {
    errors.push({
      field: `images[${index}].id`,
      message: '图片id必须是字符串',
      code: 'MISSING_IMAGE_ID',
    });
  }

  // 验证source
  if (!['file', 'url'].includes(img.source as string)) {
    errors.push({
      field: `images[${index}].source`,
      message: 'source必须为file或url',
      code: 'INVALID_IMAGE_SOURCE',
    });
  }

  // 验证条件必需字段
  if (img.source === 'file') {
    if (!img.file_path || typeof img.file_path !== 'string') {
      errors.push({
        field: `images[${index}].file_path`,
        message: 'file模式下file_path必需',
        code: 'MISSING_FILE_PATH',
      });
    }
  }

  if (img.source === 'url') {
    if (!img.url || typeof img.url !== 'string') {
      errors.push({
        field: `images[${index}].url`,
        message: 'url模式下url必需',
        code: 'MISSING_URL',
      });
    }
  }

  return errors;
}

/**
 * 验证排版选项
 */
function validateLayoutOptions(
  options: Record<string, unknown>,
  layoutType: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 网格模式验证
  if (layoutType === 'grid' && options.grid_mode !== undefined) {
    if (!['2x2', '3x3', '3-column-infinite'].includes(options.grid_mode as string)) {
      errors.push({
        field: 'layout_options.grid_mode',
        message: 'grid_mode必须为2x2、3x3或3-column-infinite',
        code: 'INVALID_GRID_MODE',
      });
    }
  }

  // 长图滚动模式验证
  if (layoutType === 'long-scroll' && options.scroll_mode !== undefined) {
    if (!['fixed-window', 'adaptive'].includes(options.scroll_mode as string)) {
      errors.push({
        field: 'layout_options.scroll_mode',
        message: 'scroll_mode必须为fixed-window或adaptive',
        code: 'INVALID_SCROLL_MODE',
      });
    }
  }

  // 固定窗口高度验证
  if (options.fixed_window_height !== undefined) {
    if (typeof options.fixed_window_height !== 'number' || options.fixed_window_height <= 0) {
      errors.push({
        field: 'layout_options.fixed_window_height',
        message: 'fixed_window_height必须为正整数',
        code: 'INVALID_WINDOW_HEIGHT',
      });
    }
  }

  // 单张图片宽度百分比验证
  if (options.single_width_percent !== undefined) {
    const pct = options.single_width_percent as number;
    if (typeof pct !== 'number' || pct < 10 || pct > 100) {
      errors.push({
        field: 'layout_options.single_width_percent',
        message: 'single_width_percent必须为10-100之间的整数',
        code: 'INVALID_WIDTH_PERCENT',
      });
    }
  }

  // 对齐方式验证
  if (options.single_alignment !== undefined) {
    if (!['left', 'center', 'right'].includes(options.single_alignment as string)) {
      errors.push({
        field: 'layout_options.single_alignment',
        message: 'single_alignment必须为left、center或right',
        code: 'INVALID_ALIGNMENT',
      });
    }
  }

  // 间距验证
  if (options.gap !== undefined) {
    if (typeof options.gap !== 'number' || options.gap < 0) {
      errors.push({
        field: 'layout_options.gap',
        message: 'gap必须为非负整数',
        code: 'INVALID_GAP',
      });
    }
  }

  return errors;
}

/**
 * 验证图片URL
 */
export function validateImageUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url, 'http://example.com');
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 验证图片文件类型
 */
export function validateImageFormat(mimeType: string, acceptedFormats?: string[]): boolean {
  const formats = acceptedFormats || ACCEPTED_IMAGE_FORMATS;
  return formats.includes(mimeType);
}

/**
 * 验证图片文件大小
 */
export function validateImageSize(sizeInBytes: number, maxSizeMB: number): boolean {
  return sizeInBytes <= maxSizeMB * 1024 * 1024;
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): ImageCardConfig {
  return {
    ...DEFAULT_CONFIG,
    images: [],
    layout_options: { ...DEFAULT_CONFIG.layout_options },
    layout: { ...DEFAULT_CONFIG.layout },
  };
}

/**
 * 合并默认值
 *
 * @param config - 用户配置
 * @returns 完整配置
 */
export function mergeDefaults(config: Partial<ImageCardConfig>): ImageCardConfig {
  const defaults = getDefaultConfig();

  return {
    ...defaults,
    ...config,
    images: config.images || defaults.images,
    layout_options: {
      ...defaults.layout_options,
      ...config.layout_options,
    },
    layout: {
      ...defaults.layout,
      ...config.layout,
    },
  };
}
