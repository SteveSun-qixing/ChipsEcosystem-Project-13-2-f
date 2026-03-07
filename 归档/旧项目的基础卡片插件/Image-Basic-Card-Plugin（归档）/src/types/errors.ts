/**
 * 错误代码定义
 */

/**
 * 图片卡片错误代码
 */
export enum ImageErrorCode {
  // === 配置错误 (1xxx) ===
  INVALID_CONFIG = 'IMAGE-E1001',
  MISSING_IMAGES = 'IMAGE-E1002',
  INVALID_LAYOUT_TYPE = 'IMAGE-E1003',
  INVALID_GRID_MODE = 'IMAGE-E1004',
  INVALID_SCROLL_MODE = 'IMAGE-E1005',
  INVALID_ALIGNMENT = 'IMAGE-E1006',
  INVALID_WIDTH_PERCENT = 'IMAGE-E1007',

  // === 资源错误 (2xxx) ===
  IMAGE_NOT_FOUND = 'IMAGE-E2001',
  LOAD_FAILED = 'IMAGE-E2002',
  RESOURCE_NOT_FOUND = 'IMAGE-E2003',

  // === 上传错误 (3xxx) ===
  UPLOAD_FAILED = 'IMAGE-E3001',
  IMAGE_TOO_LARGE = 'IMAGE-E3002',
  UNSUPPORTED_FORMAT = 'IMAGE-E3003',
  MAX_IMAGES_EXCEEDED = 'IMAGE-E3004',

  // === 运行时错误 (4xxx) ===
  RENDER_FAILED = 'IMAGE-E4001',
  EDITOR_NOT_INITIALIZED = 'IMAGE-E4002',
  INVALID_IMAGE_ID = 'IMAGE-E4003',
  DRAG_FAILED = 'IMAGE-E4004',
}

/**
 * 薯片错误基类
 */
export class ChipsError extends Error {
  constructor(
    public readonly code: ImageErrorCode | string,
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
    super(ImageErrorCode.INVALID_CONFIG, message, details);
    this.name = 'ConfigError';
  }
}

/**
 * 资源错误
 */
export class ResourceError extends ChipsError {
  constructor(code: ImageErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'ResourceError';
  }
}

/**
 * 上传错误
 */
export class UploadError extends ChipsError {
  constructor(code: ImageErrorCode, message: string, details?: unknown) {
    super(code, message, details);
    this.name = 'UploadError';
  }
}
