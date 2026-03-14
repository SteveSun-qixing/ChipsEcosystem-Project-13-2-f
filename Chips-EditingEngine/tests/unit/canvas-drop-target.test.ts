// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { resolveCompositeCardDropTarget } from '../../src/layouts/InfiniteCanvas/canvas-drop-target';
import type { CompositeCard } from '../../src/core/card-service';

function createOpenCards(cardId: string, baseCardCount: number): Map<string, CompositeCard> {
  const basicCards = Array.from({ length: baseCardCount }, (_, index) => ({
    id: `base-${index + 1}`,
    type: 'RichTextCard',
    data: {},
    createdAt: '2026-03-14T00:00:00.000Z',
    modifiedAt: '2026-03-14T00:00:00.000Z',
  }));

  return new Map([
    [cardId, {
      id: cardId,
      path: `/workspace/${cardId}.card`,
      metadata: {
        name: cardId,
        createdAt: '2026-03-14T00:00:00.000Z',
        modifiedAt: '2026-03-14T00:00:00.000Z',
      },
      structure: {
        basicCards,
      },
      isDirty: false,
      isEditing: true,
    } as CompositeCard],
  ]);
}

function attachPreviewSurface(cardId: string, rect: { left: number; top: number; width: number; height: number }) {
  const preview = document.createElement('div');
  preview.dataset.chipsDropSurface = 'composite-preview';
  preview.dataset.chipsCardId = cardId;

  const child = document.createElement('div');
  preview.appendChild(child);
  document.body.appendChild(preview);

  Object.defineProperty(preview, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => null,
    }),
  });

  return { preview, child };
}

describe('resolveCompositeCardDropTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns null when the dragged payload is not a base card from the library', () => {
    const { child } = attachPreviewSurface('card-1', { left: 40, top: 60, width: 300, height: 360 });

    const target = resolveCompositeCardDropTarget({
      dragData: {
        type: 'workspace-file',
        fileId: 'card-1',
        fileType: 'card',
        filePath: '/workspace/card-1.card',
        name: 'card-1.card',
      },
      eventTarget: child,
      screenPosition: { x: 120, y: 140 },
      openCards: createOpenCards('card-1', 3),
    });

    expect(target).toBeNull();
  });

  it('projects the upper half of a preview segment to the insertion slot before that base card', () => {
    const { child } = attachPreviewSurface('card-1', { left: 40, top: 60, width: 300, height: 360 });

    const target = resolveCompositeCardDropTarget({
      dragData: {
        type: 'card',
        typeId: 'RichTextCard',
        name: 'Rich Text',
      },
      eventTarget: child,
      screenPosition: { x: 180, y: 170 },
      openCards: createOpenCards('card-1', 3),
    });

    expect(target).toEqual({
      type: 'composite-card-insert',
      cardId: 'card-1',
      insertionIndex: 1,
      indicator: {
        left: 58,
        top: 180,
        width: 264,
      },
    });
  });

  it('projects the lower half of the last preview segment to the composite tail slot', () => {
    const { child } = attachPreviewSurface('card-2', { left: 10, top: 20, width: 260, height: 300 });

    const target = resolveCompositeCardDropTarget({
      dragData: {
        type: 'card',
        typeId: 'RichTextCard',
        name: 'Rich Text',
      },
      eventTarget: child,
      screenPosition: { x: 180, y: 280 },
      openCards: createOpenCards('card-2', 3),
    });

    expect(target).toEqual({
      type: 'composite-card-insert',
      cardId: 'card-2',
      insertionIndex: 3,
      indicator: {
        left: 28,
        top: 320,
        width: 224,
      },
    });
  });
});
