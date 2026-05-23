import { createError } from '../../../src/shared/errors';
import { toNumber, toRounded } from './helpers';
import type {
  LayoutAxis,
  LayoutBreakpoint,
  LayoutConstraints,
  LayoutFrame,
  LayoutOverflow,
  LayoutScrollAxis,
  NormalizedNode,
  PreparedRenderNode,
  RenderContext,
  ResponsiveLayoutState,
  VisibleRange
} from './types';

interface LayoutInput {
  node: NormalizedNode;
  resolvedProps: Record<string, unknown>;
  x: number;
  y: number;
  availableWidth: number;
  context: RenderContext;
  children: PreparedRenderNode[];
}

const cpxToPx = (cpx: number, containerWidth: number): number => {
  return toRounded(cpx * (containerWidth / 1024));
};

const getBreakpoint = (viewportWidth: number): LayoutBreakpoint => {
  if (viewportWidth < 640) {
    return 'compact';
  }
  if (viewportWidth < 1024) {
    return 'regular';
  }
  return 'expanded';
};

const getLayoutAxis = (node: NormalizedNode): LayoutAxis => {
  if (node.type === 'Grid') {
    return 'grid';
  }
  if (node.type === 'Table') {
    return 'table';
  }
  if (node.type === 'Form') {
    return 'form';
  }
  if (node.type === 'Navigation') {
    return 'navigation';
  }
  if (node.type === 'Stack') {
    return node.props.direction === 'horizontal' ? 'horizontal' : 'vertical';
  }
  if (['View', 'List', 'Section', 'ScrollView'].includes(node.type)) {
    return 'vertical';
  }
  return 'none';
};

const getOverflow = (node: NormalizedNode): LayoutOverflow => {
  if (node.props.overflow === 'clip') {
    return 'clip';
  }
  if (node.props.overflow === 'visible') {
    return 'visible';
  }
  if (node.type === 'ScrollView') {
    return 'scroll';
  }
  return 'visible';
};

const getScrollAxis = (node: NormalizedNode): LayoutScrollAxis => {
  if (node.type !== 'ScrollView') {
    return 'none';
  }
  if (node.props.scrollAxis === 'horizontal') {
    return 'horizontal';
  }
  if (node.props.scrollAxis === 'both') {
    return 'both';
  }
  return 'vertical';
};

const getGapPx = (props: Record<string, unknown>, containerWidth: number): number | undefined => {
  if (props.gapPx !== undefined || props.gap !== undefined) {
    return Math.max(0, toRounded(toNumber(props.gapPx, toNumber(props.gap, 0))));
  }
  if (props.gapCpx !== undefined) {
    return Math.max(0, cpxToPx(toNumber(props.gapCpx, 0), containerWidth));
  }
  return undefined;
};

const getItemCount = (node: NormalizedNode, children: PreparedRenderNode[]): number => {
  return Math.max(
    children.length,
    Math.floor(toNumber(node.props.itemCount, toNumber(node.props.totalCount, children.length)))
  );
};

const getItemExtentPx = (node: NormalizedNode, props: Record<string, unknown>): number | undefined => {
  if (node.type === 'Table') {
    return Math.max(1, toNumber(props.rowHeightPx, 40));
  }
  if (node.type === 'Grid') {
    return Math.max(1, toNumber(props.rowHeightPx, 64));
  }
  if (node.type === 'List') {
    return Math.max(1, toNumber(props.itemHeightPx, 40));
  }
  return undefined;
};

const calculateVisibleRange = (node: NormalizedNode, frame: LayoutFrame, context: RenderContext): VisibleRange | undefined => {
  if (!['List', 'Grid', 'Table'].includes(node.type)) {
    return undefined;
  }

  const incremental = node.props.incremental;
  if (incremental === false) {
    return undefined;
  }

  const total = Math.max(
    0,
    Math.max(
      node.children.length,
      Math.floor(toNumber(node.props.itemCount, toNumber(node.props.totalCount, node.children.length)))
    )
  );
  if (total === 0) {
    return {
      start: 0,
      end: 0,
      total: 0
    };
  }

  const viewportTop = context.viewport.scrollTop ?? 0;
  const viewportBottom = viewportTop + context.viewport.height;

  if (node.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(node.props.columns, 1)));
    const rowHeight = Math.max(1, toNumber(node.props.rowHeightPx, 64));
    const gap = getGapPx(node.props, frame.width) ?? 0;
    const overscan = Math.max(0, Math.floor(toNumber(node.props.overscan, 2)));
    const rowExtent = rowHeight + gap;
    const firstRow = Math.max(0, Math.floor((viewportTop - frame.y) / rowExtent) - overscan);
    const lastRow = Math.max(firstRow, Math.ceil((viewportBottom - frame.y) / rowExtent) + overscan);
    const start = Math.min(total, firstRow * columns);
    const end = Math.min(total, (lastRow + 1) * columns);
    return { start, end, total };
  }

  const itemHeight = node.type === 'Table'
    ? Math.max(1, toNumber(node.props.rowHeightPx, 40))
    : Math.max(1, toNumber(node.props.itemHeightPx, 40));
  const gap = getGapPx(node.props, frame.width) ?? 0;
  const itemExtent = itemHeight + gap;
  const overscan = Math.max(0, Math.floor(toNumber(node.props.overscan, 2)));
  const start = Math.max(0, Math.floor((viewportTop - frame.y) / itemExtent) - overscan);
  const end = Math.min(total, Math.ceil((viewportBottom - frame.y) / itemExtent) + overscan);
  return { start, end: Math.max(start, end), total };
};

const resolveSizeConstraintPx = (
  props: Record<string, unknown>,
  pxKey: string,
  cpxKey: string,
  containerWidth: number
): number | undefined => {
  if (props[pxKey] !== undefined) {
    return toRounded(toNumber(props[pxKey], 0));
  }
  if (props[cpxKey] !== undefined) {
    return cpxToPx(toNumber(props[cpxKey], 0), containerWidth);
  }
  return undefined;
};

const calculateWidth = (resolvedProps: Record<string, unknown>, availableWidth: number): number => {
  if (resolvedProps.widthPx !== undefined) {
    return clampSize(toRounded(toNumber(resolvedProps.widthPx, availableWidth)), resolvedProps, 'width', availableWidth);
  }
  if (resolvedProps.widthCpx !== undefined) {
    return clampSize(cpxToPx(toNumber(resolvedProps.widthCpx, 1024), availableWidth), resolvedProps, 'width', availableWidth);
  }
  return clampSize(toRounded(availableWidth), resolvedProps, 'width', availableWidth);
};

export const computeNodeLayoutWidth = (resolvedProps: Record<string, unknown>, availableWidth: number): number =>
  calculateWidth(resolvedProps, availableWidth);

export const computeChildAvailableWidth = (parentNode: NormalizedNode, parentWidth: number, childCount: number): number => {
  const gap = getGapPx(parentNode.props, parentWidth) ?? 0;
  if (parentNode.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(parentNode.props.columns, 1)));
    const available = parentWidth - gap * Math.max(0, columns - 1);
    return Math.max(1, toRounded(available / columns));
  }

  if (parentNode.type === 'Stack' && parentNode.props.direction === 'horizontal') {
    const available = parentWidth - gap * Math.max(0, childCount - 1);
    return Math.max(1, toRounded(available / Math.max(1, childCount)));
  }

  return parentWidth;
};

const clampSize = (
  value: number,
  props: Record<string, unknown>,
  axis: 'width' | 'height',
  containerWidth: number
): number => {
  const min = resolveSizeConstraintPx(props, `min${axis === 'width' ? 'Width' : 'Height'}Px`, `min${axis === 'width' ? 'Width' : 'Height'}Cpx`, containerWidth);
  const max = resolveSizeConstraintPx(props, `max${axis === 'width' ? 'Width' : 'Height'}Px`, `max${axis === 'width' ? 'Width' : 'Height'}Cpx`, containerWidth);
  const clampedMin = min === undefined ? value : Math.max(value, min);
  const clampedMax = max === undefined ? clampedMin : Math.min(clampedMin, max);
  return Math.max(1, toRounded(clampedMax));
};

const calculateHeight = (
  node: NormalizedNode,
  resolvedProps: Record<string, unknown>,
  children: PreparedRenderNode[],
  containerWidth: number
): number => {
  if (resolvedProps.heightPx !== undefined) {
    return clampSize(toRounded(toNumber(resolvedProps.heightPx, 0)), resolvedProps, 'height', containerWidth);
  }
  if (resolvedProps.heightCpx !== undefined) {
    return clampSize(cpxToPx(toNumber(resolvedProps.heightCpx, 0), containerWidth), resolvedProps, 'height', containerWidth);
  }

  if (node.type === 'List' || node.type === 'Table') {
    const itemHeight = node.type === 'Table'
      ? Math.max(1, toNumber(resolvedProps.rowHeightPx, 40))
      : Math.max(1, toNumber(resolvedProps.itemHeightPx, 40));
    const count = getItemCount(node, children);
    const gap = getGapPx(resolvedProps, containerWidth) ?? 0;
    const totalGap = gap * Math.max(0, count - 1);
    return clampSize(Math.max(itemHeight, toRounded(itemHeight * Math.max(1, count) + totalGap)), resolvedProps, 'height', containerWidth);
  }

  if (node.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(resolvedProps.columns, 1)));
    const rowHeight = Math.max(1, toNumber(resolvedProps.rowHeightPx, 64));
    const count = getItemCount(node, children);
    const rows = Math.max(1, Math.ceil(count / columns));
    const gap = getGapPx(resolvedProps, containerWidth) ?? 0;
    const totalGap = gap * Math.max(0, rows - 1);
    return clampSize(toRounded(rows * rowHeight + totalGap), resolvedProps, 'height', containerWidth);
  }

  if (children.length === 0) {
    return clampSize(Math.max(32, toRounded(toNumber(resolvedProps.minHeightPx, 32))), resolvedProps, 'height', containerWidth);
  }

  const direction = typeof resolvedProps.direction === 'string' ? resolvedProps.direction : 'vertical';
  const gap = getGapPx(resolvedProps, containerWidth) ?? 8;
  const measuredHeight = node.type === 'Stack' && direction === 'horizontal'
    ? Math.max(...children.map((child) => child.layout.height))
    : children.reduce((sum, child) => sum + child.layout.height, 0) + gap * Math.max(0, children.length - 1);
  return clampSize(Math.max(32, toRounded(measuredHeight)), resolvedProps, 'height', containerWidth);
};

export const computeNodeLayout = (input: LayoutInput): {
  frame: LayoutFrame;
  constraints: LayoutConstraints;
  responsive: ResponsiveLayoutState;
  visibleRange?: VisibleRange;
} => {
  if (input.resolvedProps.failAtStage === 'layout-compute') {
    throw createError('RENDER_LAYOUT_COMPUTE_FAILED', 'Node requested layout failure injection', {
      nodeId: input.node.id
    });
  }

  const width = calculateWidth(input.resolvedProps, input.availableWidth);
  const height = calculateHeight(input.node, input.resolvedProps, input.children, input.availableWidth);
  const gapPx = getGapPx(input.resolvedProps, input.availableWidth);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw createError('RENDER_LAYOUT_INVALID_SIZE', 'Layout computed an invalid frame', {
      nodeId: input.node.id,
      width,
      height
    });
  }

  const frame: LayoutFrame = {
    x: toRounded(input.x),
    y: toRounded(input.y),
    width,
    height
  };

  const visibleRange = calculateVisibleRange(input.node, frame, input.context);
  const columns = input.node.type === 'Grid'
    ? Math.max(1, Math.floor(toNumber(input.resolvedProps.columns, 1)))
    : undefined;
  const itemCount = getItemCount(input.node, input.children);
  const rows = columns === undefined ? undefined : Math.max(1, Math.ceil(itemCount / columns));
  const columnWidthPx = columns === undefined
    ? undefined
    : toRounded((frame.width - (gapPx ?? 0) * Math.max(0, columns - 1)) / columns);
  const constraints: LayoutConstraints = {
    unit: 'px',
    axis: getLayoutAxis(input.node),
    overflow: getOverflow(input.node),
    scrollAxis: getScrollAxis(input.node),
    containerWidthPx: toRounded(input.availableWidth),
    widthPx: frame.width,
    heightPx: frame.height,
    minWidthPx: resolveSizeConstraintPx(input.resolvedProps, 'minWidthPx', 'minWidthCpx', input.availableWidth),
    minHeightPx: resolveSizeConstraintPx(input.resolvedProps, 'minHeightPx', 'minHeightCpx', input.availableWidth),
    maxWidthPx: resolveSizeConstraintPx(input.resolvedProps, 'maxWidthPx', 'maxWidthCpx', input.availableWidth),
    maxHeightPx: resolveSizeConstraintPx(input.resolvedProps, 'maxHeightPx', 'maxHeightCpx', input.availableWidth),
    gapPx,
    columns,
    rows,
    columnWidthPx,
    itemCount: ['List', 'Grid', 'Table'].includes(input.node.type) ? itemCount : undefined,
    itemExtentPx: getItemExtentPx(input.node, input.resolvedProps)
  };
  const responsive: ResponsiveLayoutState = {
    breakpoint: getBreakpoint(input.context.viewport.width),
    scale: toRounded(input.context.viewport.width / 1024, 4),
    viewportWidthPx: input.context.viewport.width,
    viewportHeightPx: input.context.viewport.height
  };
  return {
    frame,
    constraints,
    responsive,
    visibleRange
  };
};

export const computeChildOrigin = (
  parent: LayoutFrame,
  childIndex: number,
  siblings: PreparedRenderNode[],
  child: PreparedRenderNode,
  parentNode: NormalizedNode
): { x: number; y: number } => {
  const direction = typeof parentNode.props.direction === 'string' ? parentNode.props.direction : 'vertical';
  const gap = getGapPx(parentNode.props, parent.width) ?? 8;
  const previousSiblings = siblings.slice(0, childIndex);

  if (parentNode.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(parentNode.props.columns, 1)));
    const rowHeight = Math.max(child.layout.height, toNumber(parentNode.props.rowHeightPx, child.layout.height));
    const col = childIndex % columns;
    const row = Math.floor(childIndex / columns);
    const colWidth = (parent.width - gap * Math.max(0, columns - 1)) / columns;
    return {
      x: toRounded(parent.x + col * (colWidth + gap)),
      y: toRounded(parent.y + row * (rowHeight + gap))
    };
  }

  if (direction === 'horizontal') {
    const prevWidth = previousSiblings.reduce((sum, sibling) => sum + sibling.layout.width, 0);
    return {
      x: toRounded(parent.x + prevWidth + childIndex * gap),
      y: parent.y
    };
  }

  const consumedHeight = previousSiblings.reduce((sum, sibling) => sum + sibling.layout.height, 0);
  const y = toRounded(parent.y + consumedHeight + childIndex * gap);
  return {
    x: parent.x,
    y
  };
};
