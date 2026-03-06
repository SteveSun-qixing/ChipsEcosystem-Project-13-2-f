import type { DeclarativeNode, NormalizedNode } from './types';
import { createNodeId } from './helpers';

const DEFAULT_PROPS_BY_TYPE: Record<string, Record<string, unknown>> = {
  View: {
    widthCpx: 1024,
    heightCpx: 0
  },
  Stack: {
    direction: 'vertical',
    gapCpx: 12
  },
  Grid: {
    columns: 1,
    gapCpx: 12
  },
  Form: {
    submitMode: 'manual'
  },
  List: {
    incremental: true,
    itemHeightPx: 40,
    overscan: 2
  },
  Table: {
    incremental: true,
    rowHeightPx: 40,
    overscan: 4
  }
};

const cloneRecord = <T>(value: Record<string, T> | undefined): Record<string, T> => ({ ...(value ?? {}) });

const normalizeNode = (node: DeclarativeNode, path: string): NormalizedNode => {
  const type = typeof node.type === 'string' && node.type.trim().length > 0 ? node.type.trim() : 'View';
  const defaults = DEFAULT_PROPS_BY_TYPE[type] ?? {};
  const normalizedChildren = (node.children ?? []).map((child, index) => normalizeNode(child, `${path}.${index}`));

  return {
    id: createNodeId(node.id, path),
    type,
    props: {
      ...defaults,
      ...cloneRecord(node.props)
    },
    state: cloneRecord(node.state),
    bindings: cloneRecord(node.bindings),
    events: cloneRecord(node.events),
    themeScope: node.themeScope,
    effects: [...(node.effects ?? [])],
    contract: {
      requires: [...(node.contract?.requires ?? [])]
    },
    errorBoundary: node.errorBoundary,
    children: normalizedChildren
  };
};

export const normalizeDeclarationTree = (root: DeclarativeNode): NormalizedNode => normalizeNode(root, 'root');
