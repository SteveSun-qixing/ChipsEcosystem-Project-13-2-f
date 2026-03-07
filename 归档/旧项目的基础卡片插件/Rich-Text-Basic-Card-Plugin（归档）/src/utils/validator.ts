/**
 * 配置验证器
 */

import type { RichTextCardConfig } from '../types/config';
import type { ValidationResult, ValidationError } from '../types/validation';
import { DEFAULT_CONFIG } from '../types/constants';

/**
 * 验证富文本卡片配置
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
  if (cfg.card_type !== 'RichTextCard') {
    errors.push({
      field: 'card_type',
      message: 'card_type必须为RichTextCard',
      code: 'INVALID_CARD_TYPE',
    });
  }

  // 验证content_source
  if (!['file', 'inline'].includes(cfg.content_source as string)) {
    errors.push({
      field: 'content_source',
      message: 'content_source必须为file或inline',
      code: 'INVALID_CONTENT_SOURCE',
    });
  }

  // 验证条件必需字段
  if (cfg.content_source === 'file') {
    if (!cfg.content_file || typeof cfg.content_file !== 'string') {
      errors.push({
        field: 'content_file',
        message: 'file模式下content_file必需',
        code: 'MISSING_CONTENT_FILE',
      });
    }
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

  // 验证toolbar
  if (cfg.toolbar !== undefined && typeof cfg.toolbar !== 'boolean') {
    errors.push({
      field: 'toolbar',
      message: 'toolbar必须是布尔值',
      code: 'INVALID_TOOLBAR',
    });
  }

  // 验证read_only
  if (cfg.read_only !== undefined && typeof cfg.read_only !== 'boolean') {
    errors.push({
      field: 'read_only',
      message: 'read_only必须是布尔值',
      code: 'INVALID_READ_ONLY',
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): Partial<RichTextCardConfig> {
  return { ...DEFAULT_CONFIG };
}

/**
 * 合并默认值
 *
 * @param config - 用户配置
 * @returns 完整配置
 */
export function mergeDefaults(config: Partial<RichTextCardConfig>): RichTextCardConfig {
  const defaults = getDefaultConfig();

  return {
    card_type: 'RichTextCard',
    content_source: config.content_source || 'inline',
    ...defaults,
    ...config,
    layout: {
      ...defaults.layout,
      ...config.layout,
    },
  } as RichTextCardConfig;
}
