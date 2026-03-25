import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cards } from '../db/schema/cards.js';
import { unpackCard } from './card-unpack.js';
import { uploadResourcesToCdn } from './cdn-upload.js';
import { replaceContentUrls, replaceCoverHtmlUrls } from './url-replace.js';
import { Bucket } from '../storage/buckets.js';
import { uploadFile } from '../storage/s3.js';
import { hostIntegration } from '../services/host-integration.js';

function writeYamlFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, yaml.dump(value, { noRefs: true }), 'utf-8');
}

function persistRewrittenCard(params: {
  tempDir: string;
  contentMap: Map<string, Record<string, unknown>>;
  coverHtml?: string;
  resourceFiles: Array<{ absolutePath: string }>;
}): void {
  const { tempDir, contentMap, coverHtml, resourceFiles } = params;

  for (const [id, content] of contentMap) {
    writeYamlFile(path.join(tempDir, 'content', `${id}.yaml`), content);
  }

  if (coverHtml !== undefined) {
    fs.writeFileSync(path.join(tempDir, '.card', 'cover.html'), coverHtml, 'utf-8');
  }

  for (const resourceFile of resourceFiles) {
    fs.rmSync(resourceFile.absolutePath, { force: true });
  }
}

function listFilesRecursive(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(path.relative(rootDir, absolutePath).split(path.sep).join('/'));
      }
    }
  }

  files.sort();
  return files;
}

function readYamlFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as T;
}

/**
 * 卡片上传处理流水线编排器
 *
 * 执行顺序：
 *   1. 解包
 *   2. 上传卡片资源到 CDN
 *   3. 替换 content / cover 内资源链接
 *   4. 删除原始本地资源并重新打包为新的 .card
 *   5. 删除原始上传包
 *   6. 通过正式文件转换模块输出 HTML 目录
 *   7. 上传 HTML 目录到 CDN
 *   8. 更新数据库
 *   9. finally 清理临时目录
 */
export async function runCardPipeline(params: {
  cardFilePath: string;
  cardDbId: string;
  userId: string;
}): Promise<void> {
  const { cardFilePath, cardDbId, userId } = params;

  let tempDir: string | null = null;
  let rewrittenCardPath: string | null = null;
  let htmlOutputDir: string | null = null;
  let originalCardRemoved = false;

  try {
    console.log(`[Pipeline] Starting for card ${cardDbId}...`);
    await db
      .update(cards)
      .set({ status: 'processing', updatedAt: new Date() })
      .where(eq(cards.id, cardDbId));

    console.log(`[Pipeline] Step 1: Unpacking ${cardFilePath}...`);
    const unpackResult = await unpackCard(cardFilePath);
    tempDir = unpackResult.tempDir;

    const duplicate = await db.query.cards.findFirst({
      where: and(
        eq(cards.userId, userId),
        eq(cards.cardFileId, unpackResult.metadata.id),
        ne(cards.id, cardDbId),
        ne(cards.status, 'error'),
      ),
    });

    if (duplicate) {
      throw new Error(`Duplicate card upload detected for card file id ${unpackResult.metadata.id}`);
    }

    console.log(`[Pipeline] Step 2: Uploading resources for card ${cardDbId}...`);
    const cdnUrlMap = await uploadResourcesToCdn(unpackResult.resourceFiles, userId, cardDbId);

    console.log(`[Pipeline] Step 3: Rewriting card resource URLs...`);
    const replacedContentMap = replaceContentUrls(unpackResult.contentMap, cdnUrlMap);
    const replacedCoverHtml = unpackResult.coverHtml
      ? replaceCoverHtmlUrls(unpackResult.coverHtml, cdnUrlMap)
      : undefined;

    console.log(`[Pipeline] Step 4: Repacking rewritten card...`);
    persistRewrittenCard({
      tempDir,
      contentMap: replacedContentMap,
      coverHtml: replacedCoverHtml,
      resourceFiles: unpackResult.resourceFiles,
    });

    rewrittenCardPath = path.join(os.tmpdir(), `ccps-card-repacked-${cardDbId}.card`);
    await hostIntegration.packCard(tempDir, rewrittenCardPath);

    fs.rmSync(cardFilePath, { force: true });
    originalCardRemoved = true;

    console.log(`[Pipeline] Step 5: Converting rewritten card through file conversion plugin...`);
    htmlOutputDir = path.join(os.tmpdir(), `ccps-card-html-${cardDbId}`);
    const convertResult = await hostIntegration.convertCardToHtml({
      cardFile: rewrittenCardPath,
      outputPath: htmlOutputDir,
      overwrite: true,
    });

    const htmlRootDir = convertResult.outputPath;
    const htmlFiles = listFilesRecursive(htmlRootDir);

    console.log(`[Pipeline] Step 6: Uploading converted HTML directory to CDN...`);
    let indexHtmlUrl = '';
    for (const relativePath of htmlFiles) {
      const absolutePath = path.join(htmlRootDir, relativePath);
      const url = await uploadFile({
        bucket: Bucket.CARD_HTML,
        key: `${userId}/${cardDbId}/${relativePath}`,
        filePath: absolutePath,
      });
      if (relativePath === 'index.html') {
        indexHtmlUrl = url;
      }
    }

    if (replacedCoverHtml) {
      await uploadFile({
        bucket: Bucket.CARD_HTML,
        key: `${userId}/${cardDbId}/cover.html`,
        filePath: path.join(tempDir, '.card', 'cover.html'),
      });
    }

    const repackedMetadata = readYamlFile<Record<string, unknown>>(path.join(tempDir, '.card', 'metadata.yaml'));
    const repackedStructure = readYamlFile<Record<string, unknown>>(path.join(tempDir, '.card', 'structure.yaml'));

    let coverUrl: string | undefined;
    for (const [, url] of cdnUrlMap) {
      if (
        !coverUrl &&
        (url.endsWith('.jpg') ||
          url.endsWith('.jpeg') ||
          url.endsWith('.png') ||
          url.endsWith('.webp'))
      ) {
        coverUrl = url;
      }
    }

    console.log(`[Pipeline] Step 7: Updating database status to ready for card ${cardDbId}...`);
    await db
      .update(cards)
      .set({
        cardFileId: String(repackedMetadata.id ?? unpackResult.metadata.id),
        title: String(repackedMetadata.name ?? unpackResult.metadata.name),
        htmlUrl: indexHtmlUrl,
        coverUrl: coverUrl ?? null,
        cardMetadata: repackedMetadata,
        cardStructure: repackedStructure,
        status: 'ready',
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, cardDbId));

    console.log(`[Pipeline] Successfully processed card ${cardDbId}`);
  } catch (err: unknown) {
    console.error(`[Pipeline] Error processing card ${cardDbId}:`, err);
    const errorMessage =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : JSON.stringify(err, null, 2);

    try {
      await db
        .update(cards)
        .set({ status: 'error', errorMessage, updatedAt: new Date() })
        .where(eq(cards.id, cardDbId));
    } catch (dbErr) {
      console.error('Failed to update card error status:', dbErr);
    }
  } finally {
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error('Failed to clean up temp directory:', cleanupErr);
      }
    }

    if (rewrittenCardPath) {
      try {
        fs.rmSync(rewrittenCardPath, { force: true });
      } catch {
        // ignore
      }
    }

    if (htmlOutputDir) {
      try {
        fs.rmSync(htmlOutputDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    if (!originalCardRemoved) {
      try {
        fs.rmSync(cardFilePath, { force: true });
      } catch {
        // ignore
      }
    }
  }
}
