import type { DragData } from '../../components/CardBoxLibrary/types';
import type { CompositeCard } from '../../core/card-service';

const COMPOSITE_DROP_SURFACE_SELECTOR = '[data-chips-drop-surface="composite-preview"]';
const COMPOSITE_DROP_HORIZONTAL_PADDING_PX = 18;

export interface CanvasDropPoint {
    x: number;
    y: number;
}

export interface CanvasInsertIndicator {
    left: number;
    top: number;
    width: number;
}

export interface CompositeCardInsertDropTarget {
    type: 'composite-card-insert';
    cardId: string;
    insertionIndex: number;
    indicator: CanvasInsertIndicator;
}

export type CanvasDropTarget = CompositeCardInsertDropTarget;

export interface ResolveCompositeCardDropTargetOptions {
    dragData: DragData | null;
    eventTarget: EventTarget | null;
    screenPosition: CanvasDropPoint;
    openCards: Map<string, CompositeCard>;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}

function asElement(target: EventTarget | null): Element | null {
    return target instanceof Element ? target : null;
}

function resolvePreviewSurface(
    eventTarget: EventTarget | null,
    screenPosition: CanvasDropPoint,
): HTMLElement | null {
    const directTarget = asElement(eventTarget)?.closest<HTMLElement>(COMPOSITE_DROP_SURFACE_SELECTOR);
    if (directTarget) {
        return directTarget;
    }

    if (typeof document.elementFromPoint !== 'function') {
        return null;
    }

    return document
        .elementFromPoint(screenPosition.x, screenPosition.y)
        ?.closest<HTMLElement>(COMPOSITE_DROP_SURFACE_SELECTOR) ?? null;
}

export function resolveCompositeCardDropTarget({
    dragData,
    eventTarget,
    screenPosition,
    openCards,
}: ResolveCompositeCardDropTargetOptions): CanvasDropTarget | null {
    if (!dragData || dragData.type !== 'card') {
        return null;
    }

    const previewSurface = resolvePreviewSurface(eventTarget, screenPosition);
    const cardId = previewSurface?.dataset.chipsCardId;
    if (!previewSurface || !cardId) {
        return null;
    }

    const targetCard = openCards.get(cardId);
    const baseCardCount = targetCard?.structure.basicCards.length ?? 0;
    if (baseCardCount <= 0) {
        return null;
    }

    const previewRect = previewSurface.getBoundingClientRect();
    if (previewRect.width <= 0 || previewRect.height <= 0) {
        return null;
    }

    const clampedOffsetY = clamp(
        screenPosition.y - previewRect.top,
        0,
        previewRect.height,
    );
    const segmentHeight = previewRect.height / baseCardCount;
    const projectedCardIndex = clamp(
        Math.floor(clampedOffsetY / Math.max(segmentHeight, 1)),
        0,
        baseCardCount - 1,
    );
    const projectedSegmentStart = projectedCardIndex * segmentHeight;
    const withinSegmentOffset = clampedOffsetY - projectedSegmentStart;
    const insertionIndex = withinSegmentOffset < segmentHeight / 2
        ? projectedCardIndex
        : projectedCardIndex + 1;

    const indicatorWidth = Math.max(
        24,
        previewRect.width - COMPOSITE_DROP_HORIZONTAL_PADDING_PX * 2,
    );
    const indicatorLeft = previewRect.left + (previewRect.width - indicatorWidth) / 2;
    const indicatorTop = previewRect.top + segmentHeight * insertionIndex;

    return {
        type: 'composite-card-insert',
        cardId,
        insertionIndex,
        indicator: {
            left: indicatorLeft,
            top: indicatorTop,
            width: indicatorWidth,
        },
    };
}
