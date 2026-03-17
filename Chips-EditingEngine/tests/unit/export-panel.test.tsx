// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportPanel } from '../../src/components/CardSettings/panels/ExportPanel';

const { saveCard, packCard, saveFile, statFile } = vi.hoisted(() => ({
  saveCard: vi.fn(async () => undefined),
  packCard: vi.fn(async () => '/exports/story-board.card'),
  saveFile: vi.fn(async () => '/exports/story-board.card'),
  statFile: vi.fn(async () => ({
    isFile: true,
    isDirectory: false,
    size: 1024,
    mtimeMs: Date.now(),
  })),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const text = ({
        'card_settings.export_card': '导出为 .card',
        'card_settings.export_html': '导出为 HTML',
        'card_settings.export_pdf': '导出为 PDF',
        'card_settings.export_image': '导出为图片',
        'card_settings.export_format': '导出格式',
        'card_settings.export_start': '开始导出',
        'card_settings.export_done': '导出完成',
        'card_settings.export_done_with_path': '导出完成：{path}',
        'card_settings.export_failed': '导出失败：{error}',
        'card_settings.export_unknown_error': '未知错误',
        'card_settings.export_no_card': '没有可导出的内容',
        'card_settings.export_save_card': '保存 .card 文件',
        'card_settings.export_saving_card_state': '正在保存卡片状态...',
        'card_settings.export_create_package': '正在打包…',
        'card_settings.export_verify_output': '正在校验导出文件...',
        'card_settings.export_output_missing': '导出目标文件未生成',
        'card_settings.export_unavailable': '当前导出格式尚未接入正式链路',
      }[key] ?? key);

      if (!params) {
        return text;
      }

      return Object.entries(params).reduce(
        (result, [paramKey, value]) => result.replaceAll(`{${paramKey}}`, String(value)),
        text,
      );
    },
  }),
}));

vi.mock('../../src/context/CardContext', () => ({
  useCard: () => ({
    getCard: () => ({
      id: 'card-1',
      path: '/workspace/card-1.card',
      metadata: {
        name: 'card-1',
      },
    }),
    saveCard,
  }),
}));

vi.mock('../../src/services/bridge-client', () => ({
  getChipsClient: () => ({
    platform: {
      saveFile,
    },
    card: {
      pack: packCard,
    },
    file: {
      stat: statFile,
    },
  }),
}));

describe('ExportPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    saveCard.mockClear();
    packCard.mockClear();
    saveFile.mockClear();
    statFile.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('exports the current unpacked card directory through the formal save and card.pack chain', async () => {
    const onBeforeExport = vi.fn();

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" onBeforeExport={onBeforeExport} />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-card"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveFile).toHaveBeenCalledWith({
      title: '保存 .card 文件',
      defaultPath: '/workspace/card-1-export.card',
    });
    expect(onBeforeExport).toHaveBeenCalledTimes(1);
    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(packCard).toHaveBeenCalledWith('/workspace/card-1.card', '/exports/story-board.card');
    expect(statFile).toHaveBeenCalledWith('/exports/story-board.card');
    expect(document.body.textContent).toContain('导出完成：/exports/story-board.card');
  });

  it('stops cleanly when the user cancels the save dialog', async () => {
    saveFile.mockResolvedValueOnce(null);

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-card"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(saveCard).not.toHaveBeenCalled();
    expect(packCard).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('导出完成');
  });

  it('shows an error when Host packing fails after the card has been saved', async () => {
    packCard.mockRejectedValueOnce(new Error('pack failed'));

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-card"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(document.body.textContent).toContain('导出失败：pack failed');
  });

  it('shows an error when the save dialog route itself fails', async () => {
    saveFile.mockRejectedValueOnce(new Error('dialog unavailable'));

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-card"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveCard).not.toHaveBeenCalled();
    expect(packCard).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('导出失败：dialog unavailable');
  });

  it('treats a missing packaged file as a real export failure instead of a false success', async () => {
    statFile.mockResolvedValueOnce({
      isFile: false,
      isDirectory: false,
      size: 0,
      mtimeMs: Date.now(),
    });

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-card"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(packCard).toHaveBeenCalledWith('/workspace/card-1.card', '/exports/story-board.card');
    expect(statFile).toHaveBeenCalledWith('/exports/story-board.card');
    expect(document.body.textContent).toContain('导出失败：导出目标文件未生成');
  });
});
