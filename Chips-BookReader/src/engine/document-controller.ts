import { AnimationController } from "./animation-controller";
import { computeLayout } from "./layout-calculator";
import { PaginationEngine } from "./pagination-engine";
import { PositionTracker } from "./position-tracker";
import { ReadiumCssManager } from "./readium-css-manager";
import { ScrollEngine } from "./scroll-engine";
import type {
  AnyEngineEvent,
  DocumentDirectionality,
  EngineEventType,
  EngineOptions,
  NavigationResult,
  PageDirection,
  PaginationMetrics,
  ReadingBoundary,
  ReadingMode,
  ReadingPositionAnchor,
  ReadingProgress,
  ScrollBehavior,
  ScrollMetrics,
  SectionKind,
} from "./types";

import { resolveDocumentScrollingElement } from "../utils/dom";

type EventHandler = (event: AnyEngineEvent) => void;

const BOUNDARY_THRESHOLD_RATIO = 0.04;
const MIN_BOUNDARY_THRESHOLD_PX = 24;
const SUB_PIXEL_TOLERANCE = 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function scheduleAnimationFrame(windowRef: Window, callback: () => void): number {
  if (typeof windowRef.requestAnimationFrame === "function") {
    return windowRef.requestAnimationFrame(callback);
  }

  return windowRef.setTimeout(callback, 16);
}

function cancelAnimationFrameSchedule(windowRef: Window, handle: number): void {
  if (typeof windowRef.cancelAnimationFrame === "function") {
    windowRef.cancelAnimationFrame(handle);
    return;
  }

  windowRef.clearTimeout(handle);
}

function waitForAnimationFrame(windowRef: Window): Promise<void> {
  return new Promise((resolve) => {
    scheduleAnimationFrame(windowRef, () => resolve());
  });
}

async function waitForLayoutPasses(document: Document, count = 2): Promise<void> {
  const view = document.defaultView;
  if (!view) {
    return;
  }

  for (let index = 0; index < count; index += 1) {
    await waitForAnimationFrame(view);
  }
}

function normalizeSectionKind(value: string | null | undefined): SectionKind {
  return value === "illustration" || value === "full-page-image" || value === "cover" ? value : "chapter";
}

function findFragmentTarget(document: Document, fragment: string): Element | null {
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(fragment)
      : fragment.replace(/["\\]/g, "\\$&");

  return (
    document.getElementById(fragment) ??
    document.querySelector(`[id="${escaped}"]`) ??
    document.querySelector(`[name="${escaped}"]`)
  );
}

export class DocumentController {
  private readonly cssManager = new ReadiumCssManager();
  private readonly paginationEngine = new PaginationEngine();
  private readonly scrollEngine = new ScrollEngine();
  private readonly positionTracker = new PositionTracker();
  private readonly animationController = new AnimationController();
  private readonly handlers = new Map<EngineEventType, Set<EventHandler>>();

  private resizeObserver: ResizeObserver | null = null;
  private resizeRafHandle: number | null = null;
  private scrollCleanup: (() => void) | null = null;
  private lastSpreadIndex = 0;

  public constructor(
    private readonly document: Document,
    private options: EngineOptions,
  ) {}

  public async mount(): Promise<void> {
    await this.cssManager.injectStyles(this.document);
    this.applyPresentation();
    this.positionTracker.initialize(this.getReadingMode(), this.document, this.getDirectionality());
    this.attachScrollListener();
    this.attachResizeObserver();
    await waitForLayoutPasses(this.document, 2);
    this.alignToViewport("auto");
    this.emitLayoutChanged();
    this.emitProgressUpdated();
  }

  public destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scrollCleanup?.();
    this.scrollCleanup = null;
    this.animationController.destroy();

    if (this.resizeRafHandle !== null && this.document.defaultView) {
      cancelAnimationFrameSchedule(this.document.defaultView, this.resizeRafHandle);
      this.resizeRafHandle = null;
    }
  }

  public async update(options: EngineOptions): Promise<void> {
    const anchor = this.positionTracker.captureAnchor(this.document, this.getReadingMode(), this.getDirectionality());
    this.options = options;
    await this.cssManager.injectStyles(this.document);
    this.applyPresentation();
    await waitForLayoutPasses(this.document, 1);
    this.restoreAnchor(anchor, "auto");
    this.emitLayoutChanged();
    this.emitProgressUpdated();
  }

  public turnPage(direction: PageDirection): NavigationResult {
    const mode = this.getReadingMode();

    if (mode === "paginated") {
      const metrics = this.getPaginationMetrics();
      const currentOffset = this.readOffset();
      const currentSpreadIndex = this.paginationEngine.resolveSpreadIndex(currentOffset, metrics.spreadAdvancePx);
      const next = this.paginationEngine.computeTargetOffset(currentSpreadIndex, direction, metrics);

      if (next.targetIndex === currentSpreadIndex || Math.abs(next.targetOffset - currentOffset) <= SUB_PIXEL_TOLERANCE) {
        const boundary = direction === "previous" ? "start" : "end";
        this.emitBoundary(boundary, direction);
        return { moved: false, reachedBoundary: true, boundary };
      }

      this.writeOffset(next.targetOffset, "smooth");
      this.positionTracker.update(next.targetIndex, metrics, mode);
      this.lastSpreadIndex = next.targetIndex;
      this.emitPageChanged(direction, next.targetIndex, metrics.spreadCount);
      this.emitProgressUpdated();
      return { moved: true, reachedBoundary: false };
    }

    const metrics = this.getScrollMetrics();
    const delta = metrics.viewportSize * (direction === "next" ? 1 : -1);
    const next = this.scrollEngine.computeScrollTarget(metrics.scrollOffset, delta, metrics.maxScrollOffset);
    if (Math.abs(next.target - metrics.scrollOffset) <= 1) {
      const boundary = next.reachedBoundary ?? (direction === "previous" ? "start" : "end");
      this.emitBoundary(boundary, direction);
      return { moved: false, reachedBoundary: true, boundary };
    }

    this.writeOffset(next.target, "smooth");
    this.positionTracker.update(0, {
      ...metrics,
      scrollOffset: next.target,
      scrollFraction: this.scrollEngine.computeScrollFraction(next.target, metrics.maxScrollOffset),
    }, mode);
    this.emitScrollChanged(this.scrollEngine.computeScrollFraction(next.target, metrics.maxScrollOffset));
    this.emitProgressUpdated();
    return {
      moved: true,
      reachedBoundary: next.reachedBoundary !== null,
      boundary: next.reachedBoundary ?? undefined,
    };
  }

  public scrollBy(deltaPx: number): NavigationResult {
    if (this.getReadingMode() !== "scroll") {
      return this.turnPage(deltaPx >= 0 ? "next" : "previous");
    }

    const metrics = this.getScrollMetrics();
    const next = this.scrollEngine.computeScrollTarget(metrics.scrollOffset, deltaPx, metrics.maxScrollOffset);
    if (Math.abs(next.target - metrics.scrollOffset) <= 1) {
      const boundary = next.reachedBoundary ?? (deltaPx < 0 ? "start" : "end");
      this.emitBoundary(boundary, deltaPx < 0 ? "previous" : "next");
      return { moved: false, reachedBoundary: true, boundary };
    }

    this.writeOffset(next.target, "auto");
    this.positionTracker.update(0, {
      ...metrics,
      scrollOffset: next.target,
      scrollFraction: this.scrollEngine.computeScrollFraction(next.target, metrics.maxScrollOffset),
    }, "scroll");
    this.emitScrollChanged(this.scrollEngine.computeScrollFraction(next.target, metrics.maxScrollOffset));
    this.emitProgressUpdated();
    return {
      moved: true,
      reachedBoundary: next.reachedBoundary !== null,
      boundary: next.reachedBoundary ?? undefined,
    };
  }

  public goToSpread(spreadIndex: number, behavior: ScrollBehavior = "auto"): void {
    const metrics = this.getPaginationMetrics();
    const targetOffset = this.paginationEngine.computeOffsetForSpread(
      spreadIndex,
      metrics.spreadAdvancePx,
      metrics.maxScrollOffset,
    );

    this.writeOffset(targetOffset, behavior);
    const nextSpreadIndex = this.paginationEngine.resolveSpreadIndex(targetOffset, metrics.spreadAdvancePx);
    this.positionTracker.update(nextSpreadIndex, metrics, "paginated");
    this.lastSpreadIndex = nextSpreadIndex;
    this.emitProgressUpdated();
  }

  public goToBoundary(boundary: ReadingBoundary, behavior: ScrollBehavior = "smooth"): void {
    const mode = this.getReadingMode();
    const targetOffset =
      mode === "paginated"
        ? this.paginationEngine.computeOffsetForBoundary(boundary, this.getPaginationMetrics())
        : this.scrollEngine.computeBoundaryOffset(boundary, this.getScrollMetrics().maxScrollOffset);

    this.writeOffset(targetOffset, behavior);
    this.syncTrackerFromDocument();
    this.emitProgressUpdated();
  }

  public async goToFragment(fragment?: string): Promise<void> {
    if (!fragment) {
      this.goToBoundary("start", "auto");
      return;
    }

    const target = findFragmentTarget(this.document, fragment);
    if (!target) {
      this.goToBoundary("start", "auto");
      return;
    }

    if (this.getReadingMode() === "paginated") {
      const metrics = this.getPaginationMetrics();
      const targetSpread = this.paginationEngine.resolveFragmentSpread(target, metrics.spreadAdvancePx);
      this.goToSpread(targetSpread, "auto");
      return;
    }

    const targetOffset = this.scrollEngine.resolveFragmentOffset(target, this.getDirectionality());
    this.writeOffset(targetOffset, "auto");
    this.syncTrackerFromDocument();
    this.emitProgressUpdated();
  }

  public goToProgress(fraction: number, behavior: ScrollBehavior = "auto"): void {
    const normalizedFraction = clamp(fraction, 0, 1);
    if (this.getReadingMode() === "paginated") {
      const metrics = this.getPaginationMetrics();
      const spreadIndex =
        metrics.spreadCount > 1 ? Math.round(normalizedFraction * (metrics.spreadCount - 1)) : 0;
      this.goToSpread(spreadIndex, behavior);
      return;
    }

    const metrics = this.getScrollMetrics();
    const targetOffset = Math.round(normalizedFraction * metrics.maxScrollOffset);
    this.writeOffset(targetOffset, behavior);
    this.syncTrackerFromDocument();
    this.emitProgressUpdated();
  }

  public isAtBoundary(direction: PageDirection): boolean {
    if (this.getReadingMode() === "paginated") {
      return this.paginationEngine.isAtBoundary(this.readOffset(), this.getPaginationMetrics(), direction);
    }

    const metrics = this.getScrollMetrics();
    return this.scrollEngine.isAtBoundary(metrics, direction === "previous" ? "start" : "end");
  }

  public isNearBoundary(direction: PageDirection): boolean {
    if (this.getReadingMode() === "scroll") {
      return this.scrollEngine.isNearBoundary(this.getScrollMetrics(), direction);
    }

    const metrics = this.getPaginationMetrics();
    const threshold = Math.max(
      MIN_BOUNDARY_THRESHOLD_PX,
      Math.round(metrics.spreadWidthPx * BOUNDARY_THRESHOLD_RATIO),
    );
    const currentOffset = this.readOffset();

    if (direction === "previous") {
      return currentOffset <= threshold;
    }

    return currentOffset >= Math.max(0, metrics.maxScrollOffset - threshold);
  }

  public getProgress(): ReadingProgress {
    const section = this.options.section;
    return this.positionTracker.computeProgress(
      section?.index ?? 0,
      section?.count ?? 1,
      section?.title ?? "",
      section?.weights,
    );
  }

  public getReadingMode(): ReadingMode {
    return this.options.preferences.readingMode;
  }

  public getCurrentAnchor(): ReadingPositionAnchor {
    return this.positionTracker.getCurrentAnchor();
  }

  public on(event: EngineEventType, handler: (event: AnyEngineEvent) => void): () => void {
    const bucket = this.handlers.get(event) ?? new Set<EventHandler>();
    bucket.add(handler);
    this.handlers.set(event, bucket);

    return () => {
      bucket.delete(handler);
      if (bucket.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  private getDirectionality(): DocumentDirectionality {
    return this.cssManager.resolveDirectionality(this.document);
  }

  private getLayout() {
    return computeLayout({
      viewportWidth: this.document.documentElement.clientWidth || this.document.defaultView?.innerWidth || 0,
      viewportHeight: this.document.documentElement.clientHeight || this.document.defaultView?.innerHeight || 0,
      preferredContentWidth: this.options.preferences.contentWidth,
      readingMode: this.options.preferences.readingMode,
      sectionKind: normalizeSectionKind(this.document.body?.dataset.sectionKind),
      fontScale: this.options.preferences.fontScale,
    });
  }

  private applyPresentation(): void {
    this.cssManager.applySettings(this.document, this.options, this.getLayout());
  }

  private attachResizeObserver(): void {
    const view = this.document.defaultView;
    if (!view || typeof view.ResizeObserver !== "function" || this.resizeObserver) {
      return;
    }

    this.resizeObserver = new view.ResizeObserver(() => {
      if (this.resizeRafHandle !== null) {
        return;
      }

      const anchor = this.positionTracker.captureAnchor(this.document, this.getReadingMode(), this.getDirectionality());
      this.resizeRafHandle = scheduleAnimationFrame(view, async () => {
        this.resizeRafHandle = null;
        this.applyPresentation();
        await waitForLayoutPasses(this.document, 1);
        this.restoreAnchor(anchor, "auto");
        this.emitLayoutChanged();
        this.emitProgressUpdated();
      });
    });
    this.resizeObserver.observe(this.document.documentElement);
  }

  private attachScrollListener(): void {
    const scrollElement = resolveDocumentScrollingElement(this.document);
    const handleScroll = () => {
      this.syncTrackerFromDocument();
      this.emitProgressUpdated();
    };

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    this.scrollCleanup = () => {
      scrollElement.removeEventListener("scroll", handleScroll);
    };
  }

  private getPaginationMetrics(): PaginationMetrics {
    const metrics = this.paginationEngine.measure(this.document, this.getDirectionality());
    metrics.currentSpreadIndex = this.paginationEngine.resolveSpreadIndex(this.readOffset(), metrics.spreadAdvancePx);
    return metrics;
  }

  private getScrollMetrics(): ScrollMetrics {
    return this.scrollEngine.measure(this.document, this.getDirectionality());
  }

  private readOffset(): number {
    const scrollElement = resolveDocumentScrollingElement(this.document);
    const directionality = this.getDirectionality();
    const mode = this.getReadingMode();

    if (mode === "paginated") {
      if (directionality.isVertical) {
        return Math.max(0, scrollElement.scrollTop);
      }

      return Math.max(0, Math.abs(scrollElement.scrollLeft));
    }

    if (directionality.isVertical) {
      return Math.max(0, Math.abs(scrollElement.scrollLeft));
    }

    return Math.max(0, scrollElement.scrollTop);
  }

  private writeOffset(value: number, behavior: ScrollBehavior): void {
    const scrollElement = resolveDocumentScrollingElement(this.document);
    const directionality = this.getDirectionality();
    const mode = this.getReadingMode();
    const target = Math.max(0, value);

    if (mode === "paginated" && behavior === "smooth") {
      const axis = directionality.isVertical ? "y" : "x";
      this.animationController.animateScroll({
        element: scrollElement,
        from: this.readOffset(),
        to: target,
        axis,
        isRtl: directionality.isRtl,
      });
      return;
    }

    this.animationController.cancel();
    if (mode === "paginated") {
      if (directionality.isVertical) {
        scrollElement.scrollTo({ top: target, behavior });
        return;
      }

      scrollElement.scrollTo({
        left: directionality.isRtl ? -target : target,
        behavior,
      });
      return;
    }

    if (directionality.isVertical) {
      scrollElement.scrollTo({
        left: directionality.isRtl ? -target : target,
        behavior,
      });
      return;
    }

    scrollElement.scrollTo({ top: target, behavior });
  }

  private restoreAnchor(anchor: ReadingPositionAnchor, behavior: ScrollBehavior): void {
    const targetOffset = this.positionTracker.restoreAnchor(
      anchor,
      this.document,
      this.getReadingMode(),
      this.getDirectionality(),
    );
    this.writeOffset(targetOffset, behavior);
    this.syncTrackerFromDocument();
  }

  private alignToViewport(behavior: ScrollBehavior): void {
    if (this.getReadingMode() !== "paginated") {
      return;
    }

    const metrics = this.getPaginationMetrics();
    const targetOffset = clamp(
      this.paginationEngine.snapToSpread(this.readOffset(), metrics.spreadAdvancePx),
      0,
      metrics.maxScrollOffset,
    );
    this.writeOffset(targetOffset, behavior);
    this.syncTrackerFromDocument();
  }

  private syncTrackerFromDocument(): void {
    if (this.getReadingMode() === "paginated") {
      const metrics = this.getPaginationMetrics();
      const spreadIndex = this.paginationEngine.resolveSpreadIndex(this.readOffset(), metrics.spreadAdvancePx);
      this.positionTracker.update(spreadIndex, metrics, "paginated");

      if (spreadIndex !== this.lastSpreadIndex) {
        const direction: PageDirection = spreadIndex > this.lastSpreadIndex ? "next" : "previous";
        this.lastSpreadIndex = spreadIndex;
        this.emitPageChanged(direction, spreadIndex, metrics.spreadCount);
      }
      return;
    }

    const metrics = this.getScrollMetrics();
    this.positionTracker.update(0, metrics, "scroll");
    this.emitScrollChanged(metrics.scrollFraction);
  }

  private emit<K extends EngineEventType>(type: K, event: Extract<AnyEngineEvent, { type: K }>): void {
    const bucket = this.handlers.get(type);
    if (!bucket || bucket.size === 0) {
      return;
    }

    for (const handler of bucket) {
      handler(event);
    }
  }

  private emitPageChanged(direction: PageDirection, spreadIndex: number, totalSpreads: number): void {
    this.emit("page-changed", {
      type: "page-changed",
      timestamp: performance.now(),
      direction,
      spreadIndex,
      totalSpreads,
    });
  }

  private emitScrollChanged(scrollFraction: number): void {
    this.emit("scroll-changed", {
      type: "scroll-changed",
      timestamp: performance.now(),
      scrollFraction,
    });
  }

  private emitLayoutChanged(): void {
    this.emit("layout-changed", {
      type: "layout-changed",
      timestamp: performance.now(),
    });
  }

  private emitBoundary(boundary: ReadingBoundary, direction: PageDirection): void {
    this.emit("boundary-reached", {
      type: "boundary-reached",
      timestamp: performance.now(),
      boundary,
      direction,
    });
  }

  private emitProgressUpdated(): void {
    this.emit("progress-updated", {
      type: "progress-updated",
      timestamp: performance.now(),
      progress: this.getProgress(),
    });
  }
}
