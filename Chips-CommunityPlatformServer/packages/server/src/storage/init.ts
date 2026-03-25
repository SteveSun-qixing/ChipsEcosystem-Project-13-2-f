import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getS3Client } from './s3';
import { PUBLIC_BUCKETS, BucketName } from './buckets';

/**
 * 构建 S3 公开读 bucket policy（MinIO 兼容）
 */
function buildPublicReadPolicy(bucketName: string): string {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`],
      },
    ],
  });
}

/**
 * 确保 bucket 存在，若不存在则创建并设置公开读策略
 */
async function ensureBucket(bucketName: BucketName): Promise<void> {
  const s3 = getS3Client();

  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
    // bucket 已存在，无需操作
  } catch (err: unknown) {
    const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    const isNotFound =
      error.name === 'NotFound' ||
      error.name === 'NoSuchBucket' ||
      error.$metadata?.httpStatusCode === 404;

    if (!isNotFound) throw err;

    // 创建 bucket
    await s3.send(new CreateBucketCommand({ Bucket: bucketName }));

    // 设置公开读策略
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: buildPublicReadPolicy(bucketName),
      }),
    );

    console.info(`Storage bucket created: ${bucketName}`);
  }
}

/**
 * 服务启动时初始化所有必要的 bucket
 */
export async function initStorageBuckets(): Promise<void> {
  console.info('Initializing storage buckets...');
  await Promise.all(PUBLIC_BUCKETS.map(ensureBucket));
  console.info(`Storage buckets ready: ${PUBLIC_BUCKETS.join(', ')}`);
}
