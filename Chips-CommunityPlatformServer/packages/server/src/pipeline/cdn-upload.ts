import { uploadFile } from '../storage/s3';
import { Bucket } from '../storage/buckets';
import type { ResourceFile } from '../types/card';

/** 单次并发上传数量上限 */
const CONCURRENCY = 5;

export interface CdnUploadResult {
  /** 相对路径 → CDN URL */
  urlMap: Map<string, string>;
}

/**
 * 并发上传资源文件到 MinIO，返回卡片内规范相对路径 → CDN URL 的映射表
 */
export async function uploadResourcesToCdn(
  resourceFiles: ResourceFile[],
  userId: string,
  cardDbId: string,
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  // 分批并发上传
  for (let i = 0; i < resourceFiles.length; i += CONCURRENCY) {
    const batch = resourceFiles.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        const key = `${userId}/${cardDbId}/${file.relativePath}`;
        const url = await uploadFile({
          bucket: Bucket.CARD_RESOURCES,
          key,
          filePath: file.absolutePath,
        });
        urlMap.set(file.relativePath, url);
      }),
    );
  }

  return urlMap;
}
