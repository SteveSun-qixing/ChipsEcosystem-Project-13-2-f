import { createError } from '../../../src/shared/errors';
import { toNumber, toRounded } from './helpers';
import type { LayoutFrame, NormalizedNode, PreparedRenderNode, RenderContext, VisibleRange } from './types';

interface LayoutInput {
  node: NormalizedNode;
  resolvedProps: Record<string, unknown>;
  x: number;
  y: number;
  availableWidth: number;
  context: RenderContext;
  children: PreparedRenderNode[];
}

const cpxToPx = (cpx: number, viewportWidth: number): number => {
  return toRounded(cpx * (viewportWidth / 1024));
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
    Math.floor(toNumber(node.props.itemCount, node.children.length > 0 ? node.children.length : toNumber(node.props.totalCount, 0)))
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
    const overscan = Math.max(0, Math.floor(toNumber(node.props.overscan, 2)));
    const firstRow = Math.max(0, Math.floor((viewportTop - frame.y) / rowHeight) - overscan);
    const lastRow = Math.max(firstRow, Math.ceil((viewportBottom - frame.y) / rowHeight) + overscan);
    const start = Math.min(total, firstRow * columns);
    const end = Math.min(total, (lastRow + 1) * columns);
    return { start, end, total };
  }

  const itemHeight = Math.max(1, toNumber(node.props.itemHeightPx, 40));
  const overscan = Math.max(0, Math.floor(toNumber(node.props.overscan, 2)));
  const start = Math.max(0, Math.floor((viewportTop - frame.y) / itemHeight) - overscan);
  const end = Math.min(total, Math.ceil((viewportBottom - frame.y) / itemHeight) + overscan);
  return { start, end: Math.max(start, end), total };
};

const calculateWidth = (resolvedProps: Record<string, unknown>, availableWidth: number, viewportWidth: number): number => {
  if (resolvedProps.widthPx !== undefined) {
    return Math.max(1, toRounded(toNumber(resolvedProps.widthPx, availableWidth)));
  }
  if (resolvedProps.widthCpx !== undefined) {
    return Math.max(1, cpxToPx(toNumber(resolvedProps.widthCpx, 1024), viewportWidth));
  }
  return Math.max(1, toRounded(availableWidth));
};

const calculateHeight = (
  node: NormalizedNode,
  resolvedProps: Record<string, unknown>,
  children: PreparedRenderNode[],
  viewportWidth: number
): number => {
  if (resolvedProps.heightPx !== undefined) {
    return Math.max(1, toRounded(toNumber(resolvedProps.heightPx, 0)));
  }
  if (resolvedProps.heightCpx !== undefined) {
    return Math.max(1, cpxToPx(toNumber(resolvedProps.heightCpx, 0), viewportWidth));
  }

  if (node.type === 'List' || node.type === 'Table') {
    const itemHeight = Math.max(1, toNumber(resolvedProps.itemHeightPx, 40));
    const count = Math.max(children.length, Math.floor(toNumber(resolvedProps.itemCount, children.length)));
    return Math.max(itemHeight, toRounded(itemHeight * Math.max(1, count)));
  }

  if (node.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(resolvedProps.columns, 1)));
    const rowHeight = Math.max(1, toNumber(resolvedProps.rowHeightPx, 64));
    const count = Math.max(children.length, Math.floor(toNumber(resolvedProps.itemCount, children.length)));
    const rows = Math.max(1, Math.ceil(count / columns));
    return toRounded(rows * rowHeight);
  }

  if (children.length === 0) {
    return Math.max(32, toRounded(toNumber(resolvedProps.minHeightPx, 32)));
  }

  const gap = toNumber(resolvedProps.gapPx, toNumber(resolvedProps.gap, 8));
  const childrenHeight = children.reduce((sum, child) => sum + child.layout.height, 0);
  const totalGap = gap * Math.max(0, children.length - 1);
  return Math.max(32, toRounded(childrenHeight + totalGap));
};

export const computeNodeLayout = (input: LayoutInput): { frame: LayoutFrame; visibleRange?: VisibleRange } => {
  if (input.resolvedProps.failAtStage === 'layout-compute') {
    throw createError('RENDER_LAYOUT_COMPUTE_FAILED', 'Node requested layout failure injection', {
      nodeId: input.node.id
    });
  }

  const width = calculateWidth(input.resolvedProps, input.availableWidth, input.context.viewport.width);
  const height = calculateHeight(input.node, input.resolvedProps, input.children, input.context.viewport.width);

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
  return {
    frame,
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
  const gap = toNumber(parentNode.props.gapPx, toNumber(parentNode.props.gap, 8));
  const previousSiblings = siblings.slice(0, childIndex);

  if (parentNode.type === 'Grid') {
    const columns = Math.max(1, Math.floor(toNumber(parentNode.props.columns, 1)));
    const rowHeight = Math.max(child.layout.height, toNumber(parentNode.props.rowHeightPx, child.layout.height));
    const col = childIndex % columns;
    const row = Math.floor(childIndex / columns);
    const colWidth = parent.width / columns;
    return {
      x: toRounded(parent.x + col * colWidth),
      y: toRounded(parent.y + row * (rowHeight + gap))
    };
  }

  if (direction === 'horizontal') {
    const prevWidth =
      parentNode.type === 'Stack'
        ? (parent.width / Math.max(1, siblings.length)) * childIndex
        : previousSiblings.reduce((sum, sibling) => sum + sibling.layout.width, 0);
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
