/**
 * 错误类型测试
 */

import { describe, it, expect } from 'vitest';
import {
  ImageErrorCode,
  ChipsError,
  ConfigError,
  ResourceError,
  UploadError,
} from '../../src/types/errors';

describe('ImageErrorCode', () => {
  it('should have config error codes', () => {
    expect(ImageErrorCode.INVALID_CONFIG).toBe('IMAGE-E1001');
    expect(ImageErrorCode.MISSING_IMAGES).toBe('IMAGE-E1002');
    expect(ImageErrorCode.INVALID_LAYOUT_TYPE).toBe('IMAGE-E1003');
  });

  it('should have resource error codes', () => {
    expect(ImageErrorCode.IMAGE_NOT_FOUND).toBe('IMAGE-E2001');
    expect(ImageErrorCode.LOAD_FAILED).toBe('IMAGE-E2002');
  });

  it('should have upload error codes', () => {
    expect(ImageErrorCode.UPLOAD_FAILED).toBe('IMAGE-E3001');
    expect(ImageErrorCode.IMAGE_TOO_LARGE).toBe('IMAGE-E3002');
    expect(ImageErrorCode.UNSUPPORTED_FORMAT).toBe('IMAGE-E3003');
    expect(ImageErrorCode.MAX_IMAGES_EXCEEDED).toBe('IMAGE-E3004');
  });

  it('should have runtime error codes', () => {
    expect(ImageErrorCode.RENDER_FAILED).toBe('IMAGE-E4001');
    expect(ImageErrorCode.EDITOR_NOT_INITIALIZED).toBe('IMAGE-E4002');
  });
});

describe('ChipsError', () => {
  it('should create error with code and message', () => {
    const error = new ChipsError(ImageErrorCode.INVALID_CONFIG, 'test message');
    expect(error.code).toBe('IMAGE-E1001');
    expect(error.message).toBe('test message');
    expect(error.name).toBe('ChipsError');
  });

  it('should create error with details', () => {
    const details = { field: 'images' };
    const error = new ChipsError(ImageErrorCode.INVALID_CONFIG, 'test', details);
    expect(error.details).toEqual(details);
  });
});

describe('ConfigError', () => {
  it('should create config error', () => {
    const error = new ConfigError('Invalid configuration');
    expect(error.name).toBe('ConfigError');
    expect(error.code).toBe(ImageErrorCode.INVALID_CONFIG);
    expect(error.message).toBe('Invalid configuration');
  });
});

describe('ResourceError', () => {
  it('should create resource error', () => {
    const error = new ResourceError(
      ImageErrorCode.IMAGE_NOT_FOUND,
      'Image not found',
      { path: '/images/test.jpg' }
    );
    expect(error.name).toBe('ResourceError');
    expect(error.code).toBe(ImageErrorCode.IMAGE_NOT_FOUND);
  });
});

describe('UploadError', () => {
  it('should create upload error', () => {
    const error = new UploadError(
      ImageErrorCode.IMAGE_TOO_LARGE,
      'Image too large'
    );
    expect(error.name).toBe('UploadError');
    expect(error.code).toBe(ImageErrorCode.IMAGE_TOO_LARGE);
  });
});
