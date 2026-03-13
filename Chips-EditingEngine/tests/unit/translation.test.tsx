// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '../../src/i18n';
import { useTranslation } from '../../src/hooks/useTranslation';

function TranslationProbe() {
  const { t } = useTranslation();
  return <div data-testid="translation-probe">{t('common.save')}</div>;
}

describe('useTranslation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    setLocale('zh-CN');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    setLocale('zh-CN');
  });

  it('re-renders when the active locale changes', async () => {
    await act(async () => {
      root.render(<TranslationProbe />);
    });

    expect(container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('保存');

    await act(async () => {
      setLocale('en-US');
    });

    expect(container.querySelector('[data-testid="translation-probe"]')?.textContent).toBe('Save');
  });
});
