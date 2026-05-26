import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createError } from '../../../src/shared/errors';
import type { ExtractVideoFrameFormat, PALFileSystem, PALImage, PALOffscreenRender } from '../../pal/src';

export interface ResourceConvertTiffToPngRequest {
  resourceId: string;
  outputFile: string;
  overwrite?: boolean;
}

export interface ResourceConvertTiffToPngResult {
  outputFile: string;
  mimeType: 'image/png';
  sourceMimeType: 'image/tiff';
  width?: number;
  height?: number;
}

export interface ResourceExtractVideoFrameOptions {
  timeSeconds?: number;
  format?: ExtractVideoFrameFormat;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover';
  quality?: number;
}

export interface ResourceExtractVideoFrameRequest {
  resourceId: string;
  outputFile: string;
  overwrite?: boolean;
  options?: ResourceExtractVideoFrameOptions;
}

export interface ResourceExtractVideoFrameResult {
  outputFile: string;
  mimeType: 'image/png' | 'image/jpeg';
  sourceMimeType: string;
  width: number;
  height: number;
  format: ExtractVideoFrameFormat;
  frameTimeSeconds: number;
  durationSeconds?: number;
}

interface ResourceImageServiceDependencies {
  fs: Pick<PALFileSystem, 'readFile'>;
  image: PALImage;
  offscreenRender?: PALOffscreenRender;
}

const TIFF_SIGNATURES = [
  Buffer.from([0x49, 0x49, 0x2a, 0x00]),
  Buffer.from([0x4d, 0x4d, 0x00, 0x2a]),
  Buffer.from([0x49, 0x49, 0x2b, 0x00]),
  Buffer.from([0x4d, 0x4d, 0x00, 0x2b])
];

const isTiffBuffer = (buffer: Buffer): boolean => {
  return TIFF_SIGNATURES.some((signature) => buffer.subarray(0, signature.length).equals(signature));
};

const VIDEO_SIGNATURES: Array<{ mimeType: string; test: (buffer: Buffer) => boolean }> = [
  {
    mimeType: 'video/mp4',
    test(buffer) {
      return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
    }
  },
  {
    mimeType: 'video/webm',
    test(buffer) {
      return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    }
  },
  {
    mimeType: 'video/ogg',
    test(buffer) {
      return buffer.subarray(0, 4).toString('ascii') === 'OggS';
    }
  },
  {
    mimeType: 'video/quicktime',
    test(buffer) {
      return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp' && /qt  /.test(buffer.subarray(8, 32).toString('latin1'));
    }
  }
];

const sniffVideoMimeType = (buffer: Buffer): string | null => {
  return VIDEO_SIGNATURES.find((signature) => signature.test(buffer))?.mimeType ?? null;
};

const normalizeLocalResourcePath = (
  resourceId: string,
  options: {
    unsupportedUriCode: string;
    unsupportedUriMessage: string;
  }
): string => {
  const trimmed = resourceId.trim();
  if (trimmed.startsWith('file://')) {
    return fileURLToPath(trimmed);
  }

  if (/^[a-z]+:\/\//i.test(trimmed)) {
    throw createError(options.unsupportedUriCode, options.unsupportedUriMessage, {
      resourceId
    });
  }

  return path.resolve(trimmed);
};

const normalizeTiffResourcePath = (resourceId: string): string => {
  return normalizeLocalResourcePath(resourceId, {
    unsupportedUriCode: 'RESOURCE_TIFF_UNSUPPORTED_URI',
    unsupportedUriMessage: 'TIFF to PNG conversion only supports local file resources'
  });
};

const normalizeVideoResourcePath = (resourceId: string): string => {
  return normalizeLocalResourcePath(resourceId, {
    unsupportedUriCode: 'RESOURCE_VIDEO_FRAME_UNSUPPORTED_URI',
    unsupportedUriMessage: 'Video frame extraction only supports local file resources'
  });
};

const normalizeConversionError = (error: unknown, details: Record<string, unknown>) => {
  if (!error || typeof error !== 'object') {
    throw error;
  }

  const code = typeof (error as { code?: unknown }).code === 'string' ? String((error as { code: string }).code) : undefined;
  if (!code) {
    throw error;
  }

  if (code === 'PAL_IMAGE_SOURCE_NOT_FOUND') {
    throw createError('RESOURCE_TIFF_SOURCE_NOT_FOUND', 'TIFF source file does not exist', details);
  }
  if (code === 'PAL_IMAGE_INVALID_OUTPUT') {
    throw createError('RESOURCE_TIFF_INVALID_OUTPUT', 'TIFF conversion output path is invalid', details);
  }
  if (code === 'PAL_IMAGE_OUTPUT_EXISTS') {
    throw createError('RESOURCE_TIFF_OUTPUT_EXISTS', 'TIFF conversion output already exists', details);
  }
  if (code === 'PAL_IMAGE_UNSUPPORTED') {
    throw createError('RESOURCE_TIFF_CONVERSION_UNSUPPORTED', 'Current Host runtime does not support TIFF to PNG conversion', details);
  }
  if (code === 'PAL_COMMAND_NOT_FOUND' || code === 'PAL_COMMAND_FAILED') {
    throw createError('RESOURCE_TIFF_CONVERSION_FAILED', 'TIFF to PNG conversion failed in the current Host runtime', details);
  }

  throw error;
};

const normalizeVideoFrameError = (error: unknown, details: Record<string, unknown>) => {
  if (!error || typeof error !== 'object') {
    throw error;
  }

  const code = typeof (error as { code?: unknown }).code === 'string' ? String((error as { code: string }).code) : undefined;
  if (!code) {
    throw error;
  }

  if (code === 'PAL_VIDEO_FRAME_SOURCE_NOT_FOUND') {
    throw createError('RESOURCE_VIDEO_FRAME_SOURCE_NOT_FOUND', 'Video source file does not exist', details);
  }
  if (code === 'PAL_VIDEO_FRAME_INVALID_OUTPUT') {
    throw createError('RESOURCE_VIDEO_FRAME_INVALID_OUTPUT', 'Video frame output path is invalid', details);
  }
  if (code === 'PAL_VIDEO_FRAME_OUTPUT_EXISTS') {
    throw createError('RESOURCE_VIDEO_FRAME_OUTPUT_EXISTS', 'Video frame output already exists', details);
  }
  if (code === 'PLATFORM_UNSUPPORTED') {
    throw createError('RESOURCE_VIDEO_FRAME_UNSUPPORTED', 'Current Host runtime does not support video frame extraction', details);
  }
  if (code === 'PAL_VIDEO_FRAME_EXTRACTION_FAILED') {
    throw createError('RESOURCE_VIDEO_FRAME_EXTRACTION_FAILED', 'Video frame extraction failed in the current Host runtime', details);
  }

  throw error;
};

export class ResourceImageService {
  public constructor(private readonly deps: ResourceImageServiceDependencies) {}

  public async convertTiffToPng(input: ResourceConvertTiffToPngRequest): Promise<ResourceConvertTiffToPngResult> {
    const sourceFile = normalizeTiffResourcePath(input.resourceId);
    const sourceBuffer = await this.deps.fs.readFile(sourceFile);
    const buffer = Buffer.isBuffer(sourceBuffer) ? sourceBuffer : Buffer.from(sourceBuffer, 'utf-8');

    if (!isTiffBuffer(buffer)) {
      throw createError('RESOURCE_TIFF_INVALID_SOURCE', 'Input resource is not a valid TIFF file', {
        resourceId: input.resourceId,
        sourceFile
      });
    }

    const details = {
      resourceId: input.resourceId,
      sourceFile,
      outputFile: input.outputFile
    };

    try {
      const converted = await this.deps.image.convertTiffToPng({
        sourceFile,
        outputFile: input.outputFile,
        overwrite: input.overwrite
      });

      return {
        outputFile: converted.outputFile,
        mimeType: 'image/png',
        sourceMimeType: 'image/tiff',
        width: converted.width,
        height: converted.height
      };
    } catch (error) {
      normalizeConversionError(error, details);
      throw error;
    }
  }

  public async extractVideoFrame(input: ResourceExtractVideoFrameRequest): Promise<ResourceExtractVideoFrameResult> {
    if (!this.deps.offscreenRender) {
      throw createError('RESOURCE_VIDEO_FRAME_UNSUPPORTED', 'Host offscreen render capability is not available for video frame extraction', {
        resourceId: input.resourceId,
        outputFile: input.outputFile
      });
    }

    const sourceFile = normalizeVideoResourcePath(input.resourceId);
    let sourceBuffer: string | Buffer;
    try {
      sourceBuffer = await this.deps.fs.readFile(sourceFile);
    } catch (error) {
      throw createError('RESOURCE_VIDEO_FRAME_SOURCE_NOT_FOUND', 'Video source file does not exist', {
        resourceId: input.resourceId,
        sourceFile,
        cause: error
      });
    }

    const buffer = Buffer.isBuffer(sourceBuffer) ? sourceBuffer : Buffer.from(sourceBuffer, 'utf-8');
    const sourceMimeType = sniffVideoMimeType(buffer);
    if (!sourceMimeType) {
      throw createError('RESOURCE_VIDEO_FRAME_INVALID_SOURCE', 'Input resource is not a supported local video file', {
        resourceId: input.resourceId,
        sourceFile
      });
    }

    const details = {
      resourceId: input.resourceId,
      sourceFile,
      outputFile: input.outputFile
    };

    try {
      const extracted = await this.deps.offscreenRender.extractVideoFrame({
        videoFile: sourceFile,
        outputFile: input.outputFile,
        overwrite: input.overwrite,
        options: input.options
      });

      return {
        outputFile: extracted.outputFile,
        mimeType: extracted.mimeType,
        sourceMimeType,
        width: extracted.width,
        height: extracted.height,
        format: extracted.format,
        frameTimeSeconds: extracted.frameTimeSeconds,
        durationSeconds: extracted.durationSeconds
      };
    } catch (error) {
      normalizeVideoFrameError(error, details);
      throw error;
    }
  }
}
