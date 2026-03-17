import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodePalAdapter } from '../../packages/pal/src';

const ELECTRON_MOCK_KEY = '__chipsElectronMock';

afterEach(() => {
  const globalValue = globalThis as Record<string, unknown>;
  delete globalValue[ELECTRON_MOCK_KEY];
  vi.restoreAllMocks();
});

describe('Node PAL dialog chain', () => {
  it('routes saveFile through the Electron save dialog and keeps defaultPath as a suggestion', async () => {
    const showSaveDialog = vi.fn(async (options: Record<string, unknown>) => ({
      canceled: false,
      filePath: '/Users/demo/Desktop/story-board.card'
    }));

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      dialog: {
        showSaveDialog
      }
    };

    const pal = new NodePalAdapter();
    const selectedPath = await pal.dialog.saveFile({
      title: '保存 .card 文件',
      defaultPath: '/tmp/story-board.card'
    });

    expect(showSaveDialog).toHaveBeenCalledWith({
      title: '保存 .card 文件',
      defaultPath: '/tmp/story-board.card'
    });
    expect(selectedPath).toBe('/Users/demo/Desktop/story-board.card');
  });

  it('routes openFile through the Electron open dialog and returns null when the user cancels', async () => {
    const showOpenDialog = vi.fn(async (options: Record<string, unknown>) => ({
      canceled: true,
      filePaths: ['/tmp/unused.card']
    }));

    (globalThis as Record<string, unknown>)[ELECTRON_MOCK_KEY] = {
      dialog: {
        showOpenDialog
      }
    };

    const pal = new NodePalAdapter();
    const selectedPaths = await pal.dialog.openFile({
      title: '选择卡片',
      defaultPath: '/tmp/story-board.card',
      allowMultiple: true
    });

    expect(showOpenDialog).toHaveBeenCalledWith({
      title: '选择卡片',
      defaultPath: '/tmp/story-board.card',
      properties: ['openFile', 'multiSelections']
    });
    expect(selectedPaths).toBeNull();
  });
});
