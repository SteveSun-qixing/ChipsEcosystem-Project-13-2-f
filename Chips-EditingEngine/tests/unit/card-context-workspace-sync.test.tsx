// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardProvider, useCard, type CardContextType } from '../../src/context/CardContext';
import { resetCardService } from '../../src/core/card-service';

const { workspaceServiceMock } = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();

  return {
    workspaceServiceMock: {
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        if (!listeners.has(event)) {
          listeners.set(event, new Set());
        }
        listeners.get(event)?.add(handler);
      }),
      off: vi.fn((event: string, handler: (payload: unknown) => void) => {
        listeners.get(event)?.delete(handler);
      }),
      emit(event: string, payload: unknown) {
        listeners.get(event)?.forEach((handler) => handler(payload));
      },
      clear() {
        listeners.clear();
      },
    },
  };
});

vi.mock('../../src/services/workspace-service', () => ({
  workspaceService: workspaceServiceMock,
}));

describe('CardProvider workspace rename sync', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestCardContext: CardContextType | null = null;

  function Probe() {
    latestCardContext = useCard();
    const activeCard = latestCardContext.activeCardId
      ? latestCardContext.openCards.get(latestCardContext.activeCardId)
      : null;

    return (
      <div data-testid="card-name">
        {activeCard?.metadata.name ?? ''}
      </div>
    );
  }

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    latestCardContext = null;
    resetCardService();
    workspaceServiceMock.on.mockClear();
    workspaceServiceMock.off.mockClear();
    workspaceServiceMock.clear();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    latestCardContext = null;
    resetCardService();
    workspaceServiceMock.clear();
  });

  it('syncs opened card metadata when the workspace emits a card rename', async () => {
    await act(async () => {
      root.render(
        <CardProvider>
          <Probe />
        </CardProvider>,
      );
    });

    expect(latestCardContext).not.toBeNull();

    let cardId = '';
    await act(async () => {
      const card = await latestCardContext!.createCard('原始名称');
      cardId = card.id;
    });

    expect(container.querySelector('[data-testid="card-name"]')?.textContent).toBe('原始名称');

    await act(async () => {
      workspaceServiceMock.emit('workspace:file-renamed', {
        file: {
          id: cardId,
          type: 'card',
          name: '更新后的名称.card',
          path: `/${cardId}.card`,
          modifiedAt: '2026-03-14T12:34:56.000Z',
        },
      });
    });

    expect(container.querySelector('[data-testid="card-name"]')?.textContent).toBe('更新后的名称');
    expect(latestCardContext?.openCards.get(cardId)?.metadata.modifiedAt).toBe('2026-03-14T12:34:56.000Z');
  });
});
