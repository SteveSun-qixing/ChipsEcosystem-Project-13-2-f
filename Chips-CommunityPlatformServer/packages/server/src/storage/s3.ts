import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { env } from '../config/env';

let s3Instance: S3Client | null = null;

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getPublicBucketBaseUrl(bucket: string): string {
  if (env.S3_PUBLIC_URL) {
    return `${trimTrailingSlash(env.S3_PUBLIC_URL)}/${bucket}`;
  }

  return `${trimTrailingSlash(env.BASE_URL)}/cdn/${bucket}`;
}

export function getS3Client(): S3Client {
  if (!s3Instance) {
    s3Instance = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  return s3Instance;
}

/**
 * 上传文件到对象存储
 * @returns 对象的公开访问 URL
 */
export async function uploadFile(params: {
  bucket: string;
  key: string;
  filePath: string;
  contentType?: string;
}): Promise<string> {
  const { bucket, key, filePath, contentType } = params;
  const s3 = getS3Client();

  const fileStream = fs.createReadStream(filePath);
  const stat = fs.statSync(filePath);

  const detectedContentType = contentType ?? detectContentType(filePath);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentLength: stat.size,
      ContentType: detectedContentType,
    }),
  );

  return buildObjectUrl(bucket, key);
}

/**
 * 上传 Buffer / string 内容到对象存储
 * @returns 对象的公开访问 URL
 */
export async function uploadBuffer(params: {
  bucket: string;
  key: string;
  body: Buffer | string;
  contentType: string;
}): Promise<string> {
  const { bucket, key, body, contentType } = params;
  const s3 = getS3Client();

  const buffer = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentLength: buffer.byteLength,
      ContentType: contentType,
    }),
  );

  return buildObjectUrl(bucket, key);
}

/**
 * 删除单个对象
 */
export async function deleteObject(bucket: string, key: string): Promise<void> {
  const s3 = getS3Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * 批量删除指定前缀下的所有对象（用于清理卡片资源）
 */
export async function deleteObjectsByPrefix(bucket: string, prefix: string): Promise<void> {
  const s3 = getS3Client();

  let continuationToken: string | undefined;

  do {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = list.Contents ?? [];
    if (objects.length > 0) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        }),
      );
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined;
  } while (continuationToken);
}

/**
 * 检查对象是否存在
 */
export async function objectExists(bucket: string, key: string): Promise<boolean> {
  const s3 = getS3Client();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'NotFound') return false;
    throw err;
  }
}

/**
 * 构造对象公开访问 URL
 * Nginx 将 /cdn/* 路由到 MinIO
 */
export function buildObjectUrl(bucket: string, key: string): string {
  return `${getPublicBucketBaseUrl(bucket)}/${key}`;
}

/**
 * 从 URL 中解析出 bucket 和 key（用于删除时比对）
 */
export function parseObjectUrl(url: string): { bucket: string; key: string } | null {
  const prefixes = [trimTrailingSlash(env.BASE_URL) + '/cdn/'];

  if (env.S3_PUBLIC_URL) {
    prefixes.unshift(trimTrailingSlash(env.S3_PUBLIC_URL) + '/');
  }

  for (const prefix of prefixes) {
    if (!url.startsWith(prefix)) {
      continue;
    }

    const rest = url.slice(prefix.length);
    const slashIdx = rest.indexOf('/');
    if (slashIdx === -1) {
      return null;
    }

    return {
      bucket: rest.slice(0, slashIdx),
      key: rest.slice(slashIdx + 1),
    };
  }

  return null;
}

/**
 * 根据文件扩展名检测 Content-Type
 */
function detectContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.pdf': 'application/pdf',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.txt': 'text/plain',
    '.vtt': 'text/vtt',
    '.srt': 'application/x-subrip',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * 计算文件的 SHA-256 哈希（用于完整性验证）
 */
export async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
