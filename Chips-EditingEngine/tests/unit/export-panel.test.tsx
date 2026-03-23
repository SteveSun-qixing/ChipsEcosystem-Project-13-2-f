// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExportPanel } from '../../src/components/CardSettings/panels/ExportPanel';

const { saveCard, packCard, saveFile, statFile, moduleInvoke, moduleJobGet, moduleListProviders } = vi.hoisted(() => ({
  saveCard: vi.fn(async () => undefined),
  packCard: vi.fn(async () => '/exports/story-board.card'),
  saveFile: vi.fn(async () => '/exports/story-board.card'),
  statFile: vi.fn(async () => ({
    isFile: true,
    isDirectory: false,
    size: 1024,
    mtimeMs: Date.now(),
  })),
  moduleInvoke: vi.fn(async () => ({ mode: 'job', jobId: 'job-1' })),
  moduleJobGet: vi.fn(async () => ({
    jobId: 'job-1',
    pluginId: 'chips.module.file-conversion',
    capability: 'converter.file.convert',
    method: 'convert',
    status: 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    output: {
      outputPath: '/exports/story-board.zip',
    },
  })),
  moduleListProviders: vi.fn(async () => [
    {
      status: 'enabled',
    },
  ]),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    locale: 'zh-CN',
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
        'card_settings.export_save_html': '保存 HTML 导出包',
        'card_settings.export_save_pdf': '保存 PDF 文件',
        'card_settings.export_save_image': '保存图片文件',
        'card_settings.export_prepare': '正在准备导出任务…',
        'card_settings.export_launch_conversion': '正在启动导出任务…',
        'card_settings.export_render_html': '正在生成 HTML 页面…',
        'card_settings.export_rewrite_assets': '正在整理资源文件…',
        'card_settings.export_write_output': '正在写入导出文件…',
        'card_settings.export_package_html': '正在打包 HTML 导出内容…',
        'card_settings.export_render_pdf': '正在生成 PDF…',
        'card_settings.export_render_image': '正在生成图片…',
        'card_settings.export_cleanup': '正在清理临时文件…',
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
        (result, [paramKey, value]) => result.split(`{${paramKey}}`).join(String(value)),
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
        themeId: 'theme-sample',
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
    module: {
      listProviders: moduleListProviders,
      invoke: moduleInvoke,
      job: {
        get: moduleJobGet,
      },
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
    saveCard.mockReset();
    saveCard.mockImplementation(async () => undefined);
    packCard.mockReset();
    packCard.mockImplementation(async () => '/exports/story-board.card');
    saveFile.mockReset();
    saveFile.mockImplementation(async () => '/exports/story-board.card');
    statFile.mockReset();
    statFile.mockImplementation(async () => ({
      isFile: true,
      isDirectory: false,
      size: 1024,
      mtimeMs: Date.now(),
    }));
    moduleInvoke.mockReset();
    moduleInvoke.mockImplementation(async () => ({ mode: 'job', jobId: 'job-1' }));
    moduleJobGet.mockReset();
    moduleJobGet.mockImplementation(async () => ({
      jobId: 'job-1',
      pluginId: 'chips.module.file-conversion',
      capability: 'converter.file.convert',
      method: 'convert',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      output: {
        outputPath: '/exports/story-board.zip',
      },
    }));
    moduleListProviders.mockReset();
    moduleListProviders.mockImplementation(async () => [
      {
        status: 'enabled',
      },
    ]);
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

  it('exports HTML through the formal converter.file.convert module pipeline', async () => {
    saveFile.mockResolvedValueOnce('/exports/story-board');
    moduleInvoke.mockResolvedValueOnce({ mode: 'job', jobId: 'job-html' });
    moduleJobGet.mockResolvedValueOnce({
      jobId: 'job-html',
      pluginId: 'chips.module.file-conversion',
      capability: 'converter.file.convert',
      method: 'convert',
      status: 'completed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      output: {
        outputPath: '/exports/story-board.zip',
      },
    });
    statFile.mockResolvedValueOnce({
      isFile: true,
      isDirectory: false,
      size: 2048,
      mtimeMs: Date.now(),
    });

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-html"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveFile).toHaveBeenCalledWith({
      title: '保存 HTML 导出包',
      defaultPath: '/workspace/card-1.zip',
    });
    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(moduleInvoke).toHaveBeenCalledWith({
      capability: 'converter.file.convert',
      method: 'convert',
      input: {
        source: {
          type: 'card',
          path: '/workspace/card-1.card',
        },
        target: {
          type: 'html',
        },
        output: {
          path: '/exports/story-board.zip',
          overwrite: true,
        },
        options: {
          locale: 'zh-CN',
          themeId: 'theme-sample',
          html: {
            packageMode: 'zip',
            includeAssets: true,
            includeManifest: true,
          },
        },
      },
    });
    expect(moduleJobGet).toHaveBeenCalledWith('job-html');
    expect(statFile).toHaveBeenCalledWith('/exports/story-board.zip');
    expect(document.body.textContent).toContain('导出完成：/exports/story-board.zip');
  });

  it('exports PDF through the formal converter.file.convert module pipeline', async () => {
    saveFile.mockResolvedValueOnce('/exports/story-board');
    moduleInvoke.mockResolvedValueOnce({
      mode: 'sync',
      output: {
        outputPath: '/exports/story-board.pdf',
      },
    } as never);

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-pdf"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveFile).toHaveBeenCalledWith({
      title: '保存 PDF 文件',
      defaultPath: '/workspace/card-1.pdf',
    });
    expect(moduleInvoke).toHaveBeenCalledWith({
      capability: 'converter.file.convert',
      method: 'convert',
      input: {
        source: {
          type: 'card',
          path: '/workspace/card-1.card',
        },
        target: {
          type: 'pdf',
        },
        output: {
          path: '/exports/story-board.pdf',
          overwrite: true,
        },
        options: {
          locale: 'zh-CN',
          themeId: 'theme-sample',
        },
      },
    });
    expect(statFile).toHaveBeenCalledWith('/exports/story-board.pdf');
    expect(document.body.textContent).toContain('导出完成：/exports/story-board.pdf');
  });

  it('exports PNG images through the formal converter.file.convert module pipeline', async () => {
    saveFile.mockResolvedValueOnce('/exports/story-board');
    moduleInvoke.mockResolvedValueOnce({
      mode: 'sync',
      output: {
        outputPath: '/exports/story-board.png',
      },
    } as never);

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-image"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveFile).toHaveBeenCalledWith({
      title: '保存图片文件',
      defaultPath: '/workspace/card-1.png',
    });
    expect(moduleInvoke).toHaveBeenCalledWith({
      capability: 'converter.file.convert',
      method: 'convert',
      input: {
        source: {
          type: 'card',
          path: '/workspace/card-1.card',
        },
        target: {
          type: 'image',
        },
        output: {
          path: '/exports/story-board.png',
          overwrite: true,
        },
        options: {
          locale: 'zh-CN',
          themeId: 'theme-sample',
          image: {
            format: 'png',
          },
        },
      },
    });
    expect(statFile).toHaveBeenCalledWith('/exports/story-board.png');
    expect(document.body.textContent).toContain('导出完成：/exports/story-board.png');
  });

  it('stops cleanly when the user cancels the save dialog', async () => {
    saveFile.mockResolvedValueOnce(null as never);

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

  it('shows an error when the conversion module job fails', async () => {
    saveFile.mockResolvedValueOnce('/exports/story-board');
    moduleInvoke.mockResolvedValueOnce({ mode: 'job', jobId: 'job-pdf' });
    moduleJobGet.mockResolvedValueOnce({
      jobId: 'job-pdf',
      pluginId: 'chips.module.file-conversion',
      capability: 'converter.file.convert',
      method: 'convert',
      status: 'failed',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      error: {
        code: 'CONVERTER_PDF_PRINT_FAILED',
        message: 'pdf export failed',
      },
    } as never);

    await act(async () => {
      root.render(<ExportPanel cardId="card-1" />);
    });

    await act(async () => {
      (document.body.querySelector('[data-testid="export-format-pdf"]') as HTMLButtonElement).click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(document.body.textContent).toContain('导出失败：pdf export failed');
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
