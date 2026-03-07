/**
 * 验证类型定义
 */

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code: string;
  /** 额外详情 */
  details?: Record<string, unknown>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表（如果有的话） */
  errors?: ValidationError[];
}
