/**
 * 验证类型定义
 */

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段名 */
  field: string;
  /** 错误信息 */
  message: string;
  /** 错误码 */
  code: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors?: ValidationError[];
}
