import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const testingRoot = path.resolve(scriptDir, '..');
const outputRoot = path.join(testingRoot, 'generated-box-samples');

const now = new Date().toISOString();

function createLayoutConfig(columnCount, gap, assetRefs = []) {
  return {
    schema_version: '1.0.0',
    props: {
      column_count: columnCount,
      gap,
    },
    asset_refs: assetRefs,
  };
}

async function resetDirectory(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.mkdir(targetPath, { recursive: true });
}

async function writeText(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf-8');
}

async function writeBinary(targetPath, content) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content);
}

async function writeYaml(targetPath, value) {
  const yaml = (await import('yaml')).default;
  await writeText(targetPath, yaml.stringify(value));
}

async function packageBoxIfAvailable(sourceDir, outputFile) {
  const probe = spawnSync('zip', ['-v'], { stdio: 'ignore' });
  if (probe.error || probe.status !== 0) {
    return {
      packaged: false,
      reason: 'zip command unavailable',
    };
  }

  await fs.rm(outputFile, { force: true });
  const result = spawnSync(
    'zip',
    ['-0', '-r', outputFile, '.box', 'assets'],
    {
      cwd: sourceDir,
      stdio: 'ignore',
    },
  );

  return {
    packaged: result.status === 0,
    reason: result.status === 0 ? 'ok' : `zip exited with ${result.status ?? 'unknown'}`,
  };
}

function createEntry({ entryId, url, enabled, title, summary, group, priority, coverAssetPath, contentType = 'chips/card' }) {
  return {
    entry_id: entryId,
    url,
    enabled,
    snapshot: {
      title,
      summary,
      cover: coverAssetPath
        ? {
            mode: 'asset',
            asset_path: coverAssetPath,
            mime_type: 'image/webp',
            width: 640,
            height: 360,
          }
        : {
            mode: 'none',
          },
      content_type: contentType,
      last_known_modified_at: now,
    },
    layout_hints: {
      group,
      priority,
      sort_key: priority,
    },
  };
}

async function buildHybridSample(cards) {
  const sourceDir = path.join(outputRoot, '01-混合条目网格箱-source');
  await fs.mkdir(sourceDir, { recursive: true });

  const previewAsset = 'assets/previews/intro-cover.webp';
  const backgroundAsset = 'assets/layouts/grid/background.webp';

  await writeYaml(path.join(sourceDir, '.box/metadata.yaml'), {
    chip_standards_version: '1.0.0',
    box_id: 'BxMix00001',
    name: '混合条目网格箱',
    created_at: now,
    modified_at: now,
    active_layout_type: 'chips.layout.grid',
    description: '覆盖 file://、https://、启用禁用与箱子自有资源的正式样例',
    cover_asset: previewAsset,
    tags: ['样例', ['阶段', '八']],
  });

  await writeYaml(path.join(sourceDir, '.box/structure.yaml'), {
    entries: [
      createEntry({
        entryId: 'EnMix00001',
        url: pathToFileURL(cards[0]).href,
        enabled: true,
        title: '薯片生态介绍',
        summary: '工作区内 file:// 卡片引用',
        group: '本地卡片',
        priority: 1,
        coverAssetPath: previewAsset,
      }),
      createEntry({
        entryId: 'EnMix00002',
        url: pathToFileURL(cards[1]).href,
        enabled: false,
        title: '美食笔记',
        summary: '禁用状态的本地卡片引用',
        group: '本地卡片',
        priority: 2,
      }),
      createEntry({
        entryId: 'EnMix00003',
        url: 'https://chips.example.com/demo/travel',
        enabled: true,
        title: '远程旅行案例',
        summary: '远程 https:// 条目样例',
        group: '远程条目',
        priority: 3,
      }),
    ],
  });

  await writeYaml(path.join(sourceDir, '.box/content.yaml'), {
    active_layout_type: 'chips.layout.grid',
    layout_configs: {
      'chips.layout.grid': createLayoutConfig(4, 16, [backgroundAsset]),
    },
  });

  await writeBinary(path.join(sourceDir, previewAsset), Buffer.from('sample-preview'));
  await writeBinary(path.join(sourceDir, backgroundAsset), Buffer.from('sample-background'));

  return {
    name: '混合条目网格箱',
    sourceDir,
    outputFile: path.join(outputRoot, '01-混合条目网格箱.box'),
  };
}

async function buildEmptySample() {
  const sourceDir = path.join(outputRoot, '02-空箱子-source');
  await fs.mkdir(sourceDir, { recursive: true });

  await writeYaml(path.join(sourceDir, '.box/metadata.yaml'), {
    chip_standards_version: '1.0.0',
    box_id: 'BxEmpty001',
    name: '空箱子样例',
    created_at: now,
    modified_at: now,
    active_layout_type: 'chips.layout.grid',
    description: '空箱子正式样例',
    tags: ['样例', '空箱子'],
  });

  await writeYaml(path.join(sourceDir, '.box/structure.yaml'), {
    entries: [],
  });

  await writeYaml(path.join(sourceDir, '.box/content.yaml'), {
    active_layout_type: 'chips.layout.grid',
    layout_configs: {
      'chips.layout.grid': createLayoutConfig(3, 18, []),
    },
  });

  return {
    name: '空箱子样例',
    sourceDir,
    outputFile: path.join(outputRoot, '02-空箱子.box'),
  };
}

async function buildLargeSample(cards) {
  const sourceDir = path.join(outputRoot, '03-大列表箱-source');
  await fs.mkdir(sourceDir, { recursive: true });

  const entries = Array.from({ length: 60 }, (_, index) => {
    const cardPath = cards[index % cards.length];
    return createEntry({
      entryId: `EnLg${String(index + 1).padStart(6, '0')}`,
      url: index % 5 === 0 ? 'https://chips.example.com/feed/item-' + (index + 1) : pathToFileURL(cardPath).href,
      enabled: index % 7 !== 0,
      title: `样例条目 ${index + 1}`,
      summary: `用于分页与滚动联调的条目 ${index + 1}`,
      group: index % 2 === 0 ? '偶数' : '奇数',
      priority: index + 1,
    });
  });

  await writeYaml(path.join(sourceDir, '.box/metadata.yaml'), {
    chip_standards_version: '1.0.0',
    box_id: 'BxLarge001',
    name: '大列表箱样例',
    created_at: now,
    modified_at: now,
    active_layout_type: 'chips.layout.grid',
    description: '用于分页、懒加载和长列表联调的正式样例',
    tags: ['样例', '分页', '长列表'],
  });

  await writeYaml(path.join(sourceDir, '.box/structure.yaml'), {
    entries,
  });

  await writeYaml(path.join(sourceDir, '.box/content.yaml'), {
    active_layout_type: 'chips.layout.grid',
    layout_configs: {
      'chips.layout.grid': createLayoutConfig(5, 12, []),
    },
  });

  return {
    name: '大列表箱样例',
    sourceDir,
    outputFile: path.join(outputRoot, '03-大列表箱.box'),
  };
}

async function buildMissingFileSample() {
  const sourceDir = path.join(outputRoot, '04-缺失资源箱-source');
  await fs.mkdir(sourceDir, { recursive: true });

  await writeYaml(path.join(sourceDir, '.box/metadata.yaml'), {
    chip_standards_version: '1.0.0',
    box_id: 'BxMiss0001',
    name: '缺失资源箱样例',
    created_at: now,
    modified_at: now,
    active_layout_type: 'chips.layout.grid',
    description: '用于缺失 file:// 资源联调的正式样例',
    tags: ['样例', '异常'],
  });

  await writeYaml(path.join(sourceDir, '.box/structure.yaml'), {
    entries: [
      createEntry({
        entryId: 'EnMiss0001',
        url: pathToFileURL(path.join(testingRoot, '不存在的卡片.card')).href,
        enabled: true,
        title: '缺失卡片',
        summary: '用于 Host 缺失资源处理联调',
        group: '异常',
        priority: 1,
      }),
    ],
  });

  await writeYaml(path.join(sourceDir, '.box/content.yaml'), {
    active_layout_type: 'chips.layout.grid',
    layout_configs: {
      'chips.layout.grid': createLayoutConfig(2, 24, []),
    },
  });

  return {
    name: '缺失资源箱样例',
    sourceDir,
    outputFile: path.join(outputRoot, '04-缺失资源箱.box'),
  };
}

async function main() {
  await resetDirectory(outputRoot);
  await writeText(path.join(outputRoot, '.gitignore'), '*\n!.gitignore\n');

  const cards = [
    path.join(testingRoot, '薯片生态介绍.card'),
    path.join(testingRoot, '美食笔记.card'),
  ];

  const samples = [
    await buildHybridSample(cards),
    await buildEmptySample(),
    await buildLargeSample(cards),
    await buildMissingFileSample(),
  ];

  const manifest = [];
  for (const sample of samples) {
    const packaged = await packageBoxIfAvailable(sample.sourceDir, sample.outputFile);
    manifest.push({
      name: sample.name,
      sourceDir: path.relative(testingRoot, sample.sourceDir),
      boxFile: packaged.packaged ? path.relative(testingRoot, sample.outputFile) : null,
      packaged: packaged.packaged,
      packagingReason: packaged.reason,
    });
  }

  await writeText(
    path.join(outputRoot, 'manifest.json'),
    JSON.stringify(
      {
        generatedAt: now,
        testingRoot,
        samples: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`已生成 ${samples.length} 组箱子样例到: ${outputRoot}`);
}

main().catch((error) => {
  console.error('[generate-box-samples] 生成失败', error);
  process.exitCode = 1;
});
