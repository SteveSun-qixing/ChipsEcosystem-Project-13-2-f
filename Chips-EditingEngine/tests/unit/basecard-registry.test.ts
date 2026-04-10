import { describe, expect, it } from 'vitest';
import {
  createInitialBasecardConfig,
  getBasecardDescriptor,
  normalizeBasecardConfig,
} from '../../src/basecard-runtime/registry';

describe('basecard registry', () => {
  it('creates richtext starter content through the descriptor for new base cards', () => {
    expect(createInitialBasecardConfig('RichTextCard', 'base-1')).toMatchObject({
      card_type: 'RichTextCard',
      content_format: 'markdown',
      content_source: 'inline',
      content_text: '123456789',
      locale: 'zh-CN',
    });
  });

  it('creates an empty image config through the descriptor for new image base cards', () => {
    expect(createInitialBasecardConfig('ImageCard', 'base-2')).toMatchObject({
      card_type: 'ImageCard',
      images: [],
      layout_type: 'single',
      layout_options: {
        grid_mode: '2x2',
        single_width_percent: 100,
        single_alignment: 'center',
        spacing_mode: 'comfortable',
      },
    });
  });

  it('creates webpage starter config through the descriptor and resolves the alias', () => {
    expect(createInitialBasecardConfig('WebPageCard', 'base-3')).toMatchObject({
      card_type: 'WebPageCard',
      source_type: 'url',
      source_url: '',
      bundle_root: '',
      entry_file: 'index.html',
      resource_paths: [],
      display_mode: 'fixed',
      fixed_ratio: '7:16',
      max_height_ratio: 20,
    });
    expect(getBasecardDescriptor('base.webpage')?.pluginId).toBe('chips.basecard.webpage');
    expect(getBasecardDescriptor('base.webpage')?.previewPointerEvents).toBe('shielded');
  });

  it('normalizes image resource paths and collects only card-root file references', () => {
    const descriptor = getBasecardDescriptor('base.image');
    if (!descriptor?.collectResourcePaths) {
      throw new Error('图片基础卡片描述符未注册资源路径收集器');
    }

    const normalized = normalizeBasecardConfig('base.image', 'base-3', {
      card_type: 'ImageCard',
      images: [
        {
          id: 'image-1',
          source: 'file',
          file_path: './cover.png',
        },
        {
          id: 'image-2',
          source: 'url',
          url: 'https://example.com/photo.png',
        },
      ],
      layout_type: 'grid',
    });

    expect(normalized.card_type).toBe('ImageCard');
    expect((normalized.images as Array<Record<string, unknown>>)[0]).toMatchObject({
      id: 'image-1',
      source: 'file',
      file_path: 'cover.png',
    });
    expect(descriptor.collectResourcePaths(normalized)).toEqual(['cover.png']);
  });
});
