import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createError } from '../../../src/shared/errors';
import type { PALFileSystem, PALImage } from '../../pal/src';

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

interface ResourceImageServiceDependencies {
  fs: Pick<PALFileSystem, 'readFile'>;
  image: PALImage;
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

const normalizeResourcePath = (resourceId: string): string => {
  const trimmed = resourceId.trim();
  if (trimmed.startsWith('file://')) {
    return fileURLToPath(trimmed);
  }

  if (/^[a-z]+:\/\//i.test(trimmed)) {
    throw createError('RESOURCE_TIFF_UNSUPPORTED_URI', 'TIFF to PNG conversion only supports local file resources', {
      resourceId
    });
  }

  return path.resolve(trimmed);
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

export class ResourceImageService {
  public constructor(private readonly deps: ResourceImageServiceDependencies) {}

  public async convertTiffToPng(input: ResourceConvertTiffToPngRequest): Promise<ResourceConvertTiffToPngResult> {
    const sourceFile = normalizeResourcePath(input.resourceId);
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
}
