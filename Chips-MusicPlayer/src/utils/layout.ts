const MOBILE_PAGER_MAX_WIDTH = 960;
const MOBILE_PAGER_MIN_HEIGHT_RATIO = 1.08;
const MOBILE_PAGER_SWIPE_THRESHOLD_RATIO = 0.16;
const MOBILE_PAGER_MAX_SWIPE_THRESHOLD = 120;

export function shouldUseMobilePagerLayout(viewportWidth: number, viewportHeight: number): boolean {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return false;
  }

  return viewportWidth <= MOBILE_PAGER_MAX_WIDTH && viewportHeight / viewportWidth >= MOBILE_PAGER_MIN_HEIGHT_RATIO;
}

export function resolveMobilePagerTargetPage(
  startPageIndex: number,
  deltaX: number,
  pageWidth: number,
  pageCount: number = 2,
): number {
  const maxPageIndex = Math.max(0, pageCount - 1);
  const normalizedStartPageIndex = Math.max(0, Math.min(maxPageIndex, startPageIndex));

  if (pageWidth <= 0) {
    return normalizedStartPageIndex;
  }

  const swipeThreshold = Math.min(MOBILE_PAGER_MAX_SWIPE_THRESHOLD, pageWidth * MOBILE_PAGER_SWIPE_THRESHOLD_RATIO);

  if (Math.abs(deltaX) < swipeThreshold) {
    return normalizedStartPageIndex;
  }

  const nextPageIndex = deltaX < 0 ? normalizedStartPageIndex + 1 : normalizedStartPageIndex - 1;
  return Math.max(0, Math.min(maxPageIndex, nextPageIndex));
}
