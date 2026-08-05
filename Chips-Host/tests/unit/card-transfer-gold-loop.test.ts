import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { StoreZipService } from '../../packages/zip-service/src';
import { CardPacker } from '../../packages/card-packer/src';

interface GoldResource {
  originalRelativePath: string;
  publicUrl: string;
  bytes: Buffer;
}

const buildCompleteOfflineCard = async (cardDir: string): Promise<GoldResource[]> => {
  await fs.mkdir(path.join(cardDir, '.card'), { recursive: true });
  await fs.mkdir(path.join(cardDir, 'content'), { recursive: true });
  await fs.mkdir(path.join(cardDir, 'assets'), { recursive: true });

  await fs.writeFile(
    path.join(cardDir, '.card', 'metadata.yaml'),
    'card_id: "abc123def0"\nname: "黄金回环卡片"\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(cardDir, '.card', 'structure.yaml'),
    'structure:\n  - id: node-1\n    card_type: base.image\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(cardDir, '.card', 'cover.html'),
    '<html><body><img src="./assets/cover.png"></body></html>',
    'utf-8',
  );
  await fs.writeFile(
    path.join(cardDir, 'content', 'node-1.yaml'),
    'card_type: base.image\nsource: file\nfile_path: assets/hero.png\n',
    'utf-8',
  );

  const heroBytes = Buffer.from('hero-image-bytes-1234567890');
  const coverBytes = Buffer.from('cover-image-bytes-abcdefghij');
  await fs.writeFile(path.join(cardDir, 'assets', 'hero.png'), heroBytes);
  await fs.writeFile(path.join(cardDir, 'assets', 'cover.png'), coverBytes);

  return [
    { originalRelativePath: 'assets/hero.png', publicUrl: 'https://cdn.example/hero.png', bytes: heroBytes },
    { originalRelativePath: 'assets/cover.png', publicUrl: 'https://cdn.example/cover.png', bytes: coverBytes },
  ];
};

const rewriteCardToNetworkCard = async (
  cardDir: string,
  resources: GoldResource[],
): Promise<void> => {
  const contentPath = path.join(cardDir, 'content', 'node-1.yaml');
  const coverPath = path.join(cardDir, '.card', 'cover.html');

  await fs.writeFile(
    contentPath,
    'card_type: base.image\nsource: url\nurl: https://cdn.example/hero.png\n',
    'utf-8',
  );
  await fs.writeFile(
    coverPath,
    '<html><body><img src="https://cdn.example/cover.png"></body></html>',
    'utf-8',
  );

  for (const resource of resources) {
    await fs.rm(path.join(cardDir, resource.originalRelativePath), { force: true });
  }
};

const restoreCardToOfflineCard = async (
  cardDir: string,
  resources: GoldResource[],
): Promise<void> => {
  const contentPath = path.join(cardDir, 'content', 'node-1.yaml');
  const coverPath = path.join(cardDir, '.card', 'cover.html');

  await fs.writeFile(
    contentPath,
    'card_type: base.image\nsource: file\nfile_path: assets/hero.png\n',
    'utf-8',
  );
  await fs.writeFile(
    coverPath,
    '<html><body><img src="./assets/cover.png"></body></html>',
    'utf-8',
  );

  for (const resource of resources) {
    await fs.mkdir(path.dirname(path.join(cardDir, resource.originalRelativePath)), { recursive: true });
    await fs.writeFile(path.join(cardDir, resource.originalRelativePath), resource.bytes);
  }
};

describe('黄金回环：完整离线卡片 -> 网络资源卡片 -> 完整离线卡片', () => {
  it('恢复后文件路径、配置内容、资源字节、条目顺序和条目时间保持一致', async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-gold-loop-'));
    const originalDir = path.join(workspace, 'original');
    const originalCard = path.join(workspace, 'original.card');
    const unpackedNetworkDir = path.join(workspace, 'unpacked-network');
    const networkCard = path.join(workspace, 'network.card');
    const restoredDir = path.join(workspace, 'restored');
    const restoredCard = path.join(workspace, 'restored.card');

    const zip = new StoreZipService();
    const packer = new CardPacker(zip);

    const resources = await buildCompleteOfflineCard(originalDir);
    await packer.pack(originalDir, originalCard);
    const originalEntries = await zip.list(originalCard);
    const entryPlan = originalEntries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => ({ path: entry.path, modifiedTime: entry.modifiedTime }));

    // 上传转换：解包 -> URL 改写 -> 删除资源 -> 打包为网络资源卡片
    await zip.extract(originalCard, unpackedNetworkDir);
    await rewriteCardToNetworkCard(unpackedNetworkDir, resources);
    await packer.pack(unpackedNetworkDir, networkCard);

    const networkEntries = await zip.list(networkCard);
    const networkEntryPaths = networkEntries.map((entry) => entry.path);
    expect(networkEntryPaths).not.toContain('assets/hero.png');
    expect(networkEntryPaths).not.toContain('assets/cover.png');
    expect(networkEntryPaths).toContain('content/node-1.yaml');
    expect(networkEntryPaths).toContain('.card/cover.html');

    // 下载恢复：解包网络资源卡片 -> 恢复相对路径 -> 写回资源 -> 按原条目顺序/时间重新打包
    await zip.extract(networkCard, restoredDir);
    await restoreCardToOfflineCard(restoredDir, resources);
    await packer.pack(restoredDir, restoredCard, { entryPlan });

    const restoredEntries = await zip.list(restoredCard);
    const restoredPaths = restoredEntries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.path);

    const originalPaths = originalEntries
      .filter((entry) => !entry.isDirectory)
      .map((entry) => entry.path);

    // 文件路径与条目顺序一致
    expect(restoredPaths).toEqual(originalPaths);

    // 资源字节一致
    for (const resource of resources) {
      await expect(zip.readEntry(restoredCard, resource.originalRelativePath)).resolves.toEqual(resource.bytes);
    }

    // 配置内容一致（URL 恢复为原始相对路径）
    const restoredContent = await zip.readEntry(restoredCard, 'content/node-1.yaml');
    expect(restoredContent.toString('utf-8')).toContain('file_path: assets/hero.png');
    expect(restoredContent.toString('utf-8')).not.toContain('https://cdn.example');
    const restoredCover = await zip.readEntry(restoredCard, '.card/cover.html');
    expect(restoredCover.toString('utf-8')).toContain('./assets/cover.png');
    expect(restoredCover.toString('utf-8')).not.toContain('https://cdn.example');

    // 条目修改时间一致（DOS 时间粒度为 2 秒，比较原始毫秒时间戳）
    for (const planEntry of entryPlan) {
      const originalEntry = originalEntries.find((entry) => entry.path === planEntry.path);
      const restoredEntry = restoredEntries.find((entry) => entry.path === planEntry.path);
      expect(restoredEntry?.modifiedTime).toBe(originalEntry?.modifiedTime);
    }

    // ZIP 条目 Store 模式一致
    for (const restoredEntry of restoredEntries) {
      expect(restoredEntry.compressionMethod).toBe(0);
      expect(restoredEntry.compressedSize).toBe(restoredEntry.size);
    }

    await fs.rm(workspace, { recursive: true, force: true });
  });
});
