/**
 * 错误代码定义
 */

/**
 * 富文本卡片错误代码
 */
export enum RichTextErrorCode {
  // === 配置错误 (1xxx) ===
  INVALID_CONFIG = 'RICHTEXT-E1001',
  MISSING_CONTENT_SOURCE = 'RICHTEXT-E1002',
  CONTENT_REQUIRED = 'RICHTEXT-E1003',
  CONTENT_TOO_LONG = 'RICHTEXT-E1004',

  // === 资源错误 (2xxx) ===
  FILE_NOT_FOUND = 'RICHTEXT-E2001',
  LOAD_FAILED = 'RICHTEXT-E2002',
  RESOURCE_NOT_FOUND = 'RICHTEXT-E2003',

  // === 安全错误 (3xxx) ===
  XSS_BLOCKED = 'RICHTEXT-E3001',
  INVALID_URL = 'RICHTEXT-E3002',
  UNSAFE_PROTOCOL = 'RICHTEXT-E3003',

  // === 运行时错误 (4xxx) ===
  RENDER_FAILED = 'RICHTEXT-E4001',
  FORMAT_FAILED = 'RICHTEXT-E4002',
  INSERT_FAILED = 'RICHTEXT-E4003',
  EDITOR_NOT_INITIALIZED = 'RICHTEXT-E4004',

  // === 上传错误 (5xxx) ===
  UPLOAD_FAILED = 'RICHTEXT-E5001',
  IMAGE_TOO_LARGE = 'RICHTEXT-E5002',
  UNSUPPORTED_FORMAT = 'RICHTEXT-E5003',
}

/**
 * 薯片错误基类
 */
export class ChipsError extends Error {
  constructor(
    public readonly code: RichTextErrorCode | string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ChipsError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends ChipsError {
  constructor(message: string, details?: unknown) {
    super(RichTextErrorCode.INVALID_CONFIG, message, details);
    this.name = 'ConfigError';
  }
}

/**
 * 资源错误
 */
export class ResourceError extends ChipsError {
  constructor(code: RichTextErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'ResourceError';
  }
}

/**
 * 安全错误
 */
export class SecurityError extends ChipsError {
  constructor(code: RichTextErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'SecurityError';
  }
}
