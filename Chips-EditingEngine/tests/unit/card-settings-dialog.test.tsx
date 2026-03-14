// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardSettingsDialog } from '../../src/components/CardSettings/CardSettingsDialog';

const updateCardMetadata = vi.fn();
const saveCard = vi.fn(async () => undefined);

vi.mock('@chips/component-library', () => ({
  ChipsTabs: ({ items }: { items: Array<{ value: string; content: React.ReactNode }> }) => (
    <div>{items.map((item) => <div key={item.value}>{item.content}</div>)}</div>
  ),
}));

vi.mock('../../src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'card_settings.title': '卡片设置',
      'card_settings.close': '关闭',
      'card_settings.cancel': '取消',
      'card_settings.save': '保存',
      'card_settings.tab_basic': '基础信息',
      'card_settings.tab_cover': '封面',
      'card_settings.tab_theme': '主题',
      'card_settings.tab_export': '导出',
    }[key] ?? key),
  }),
}));

vi.mock('../../src/context/CardContext', () => ({
  useCard: () => ({
    getCard: () => ({
      id: 'card-1',
      metadata: {
        name: 'Demo Card',
        themeId: 'chips-official.default-theme',
        tags: ['demo'],
        createdAt: '2026-03-13T10:00:00.000Z',
        modifiedAt: '2026-03-13T11:00:00.000Z',
      },
      structure: {
        basicCards: [],
      },
    }),
    updateCardMetadata,
    saveCard,
  }),
}));

vi.mock('../../src/components/CardSettings/panels/BasicInfoPanel', () => ({
  BasicInfoPanel: ({
    cardInfo,
    onUpdateName,
    onUpdateTags,
  }: {
    cardInfo: { metadata: { createdAt?: string } };
    onUpdateName?: (name: string) => void;
    onUpdateTags?: (tags: string[]) => void;
  }) => (
    <div>
      <button type="button" data-testid="rename-card" onClick={() => onUpdateName?.('Renamed Card')}>
        rename
      </button>
      <button type="button" data-testid="retag-card" onClick={() => onUpdateTags?.(['alpha', 'beta'])}>
        retag
      </button>
      <span data-testid="created-at">{cardInfo.metadata.createdAt}</span>
    </div>
  ),
}));

vi.mock('../../src/components/CardSettings/panels/CoverPanel', () => ({
  CoverPanel: () => <div>cover-panel</div>,
}));

vi.mock('../../src/components/CardSettings/panels/ThemePanel', () => ({
  ThemePanel: ({ onChange }: { onChange: (themeId: string) => void }) => (
    <button type="button" data-testid="apply-theme" onClick={() => onChange('chips-official.default-dark-theme')}>
      theme
    </button>
  ),
}));

vi.mock('../../src/components/CardSettings/panels/ExportPanel', () => ({
  ExportPanel: () => <div>export-panel</div>,
}));

describe('CardSettingsDialog', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    updateCardMetadata.mockClear();
    saveCard.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('routes metadata edits through the formal card-service update API', async () => {
    await act(async () => {
      root.render(
        <CardSettingsDialog
          cardId="card-1"
          visible
          onClose={() => undefined}
          onSave={() => undefined}
        />,
      );
    });

    expect(document.body.querySelector('[data-testid="created-at"]')?.textContent).toBe('2026-03-13T10:00:00.000Z');

    await act(async () => {
      (document.body.querySelector('[data-testid="rename-card"]') as HTMLButtonElement).click();
      (document.body.querySelector('[data-testid="retag-card"]') as HTMLButtonElement).click();
      (document.body.querySelector('[data-testid="apply-theme"]') as HTMLButtonElement).click();
    });

    expect(updateCardMetadata).toHaveBeenCalledWith('card-1', { name: 'Renamed Card' });
    expect(updateCardMetadata).toHaveBeenCalledWith('card-1', { tags: ['alpha', 'beta'] });
    expect(updateCardMetadata).toHaveBeenCalledWith('card-1', { themeId: 'chips-official.default-dark-theme' });
  });

  it('saves through the formal saveCard API when the user confirms', async () => {
    const onSave = vi.fn();

    await act(async () => {
      root.render(
        <CardSettingsDialog
          cardId="card-1"
          visible
          onClose={() => undefined}
          onSave={onSave}
        />,
      );
    });

    await act(async () => {
      const buttons = Array.from(document.body.querySelectorAll('button'));
      const saveButton = buttons.find((button) => button.textContent === '保存');
      saveButton?.click();
      await Promise.resolve();
    });

    expect(saveCard).toHaveBeenCalledWith('card-1');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('can transition from hidden to visible without breaking hook order and renders into document.body', async () => {
    await act(async () => {
      root.render(
        <CardSettingsDialog
          cardId="card-1"
          visible={false}
          onClose={() => undefined}
          onSave={() => undefined}
        />,
      );
    });

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      root.render(
        <CardSettingsDialog
          cardId="card-1"
          visible
          onClose={() => undefined}
          onSave={() => undefined}
        />,
      );
    });

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.querySelector('.card-settings-overlay')).not.toBeNull();
  });
});
