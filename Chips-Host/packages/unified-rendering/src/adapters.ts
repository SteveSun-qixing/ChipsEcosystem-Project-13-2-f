import { stableSerialize } from './helpers';
import type { PreparedRenderNode, RenderCommitInput, RenderCommitOutput, RenderTarget, RenderTargetAdapter } from './types';

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderNode = (node: PreparedRenderNode): string => {
  const serializedProps = escapeHtml(stableSerialize(node.props));
  const semanticAttrs = `data-node-id="${escapeHtml(node.id)}" data-node-type="${escapeHtml(node.type)}" data-node-props="${serializedProps}"`;

  if (node.type === 'Text') {
    const text = typeof node.props.text === 'string' ? node.props.text : '';
    return `<span ${semanticAttrs}>${escapeHtml(text)}</span>`;
  }

  const children = node.children.map((child) => renderNode(child)).join('');
  return `<section ${semanticAttrs}>${children}</section>`;
};

const createOutput = (
  target: RenderTarget,
  wrapperAttributes: Record<string, string>,
  input: RenderCommitInput,
  metadata?: Record<string, unknown>
): RenderCommitOutput => {
  const attrs = Object.entries(wrapperAttributes)
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');
  const html = `<div ${attrs}>${renderNode(input.root)}</div>`;
  return {
    target,
    html,
    metadata
  };
};

const createAdapter = (
  target: RenderTarget,
  capabilities: string[],
  commit: (input: RenderCommitInput) => RenderCommitOutput
): RenderTargetAdapter => {
  return {
    target,
    capabilities: new Set(capabilities),
    commit
  };
};

export const appRootAdapter = createAdapter(
  'app-root',
  ['dom', 'window', 'slot', 'runtime-effect', 'telemetry-effect'],
  (input) =>
    createOutput(
      'app-root',
      {
        'data-target': 'app-root',
        'data-semantic-hash': input.semanticHash
      },
      input,
      {
        mountMode: 'app-root'
      }
    )
);

export const cardIframeAdapter = createAdapter(
  'card-iframe',
  ['dom', 'iframe', 'slot', 'telemetry-effect'],
  (input) =>
    createOutput(
      'card-iframe',
      {
        'data-target': 'card-iframe',
        'data-semantic-hash': input.semanticHash,
        'data-isolated': 'true'
      },
      input,
      {
        mountMode: 'iframe'
      }
    )
);

export const moduleSlotAdapter = createAdapter(
  'module-slot',
  ['dom', 'slot', 'module', 'telemetry-effect'],
  (input) =>
    createOutput(
      'module-slot',
      {
        'data-target': 'module-slot',
        'data-semantic-hash': input.semanticHash
      },
      input,
      {
        mountMode: 'slot'
      }
    )
);

export const offscreenRenderAdapter = createAdapter(
  'offscreen-render',
  ['offscreen', 'snapshot', 'telemetry-effect'],
  (input) =>
    createOutput(
      'offscreen-render',
      {
        'data-target': 'offscreen-render',
        'data-semantic-hash': input.semanticHash,
        'data-offscreen': 'true'
      },
      input,
      {
        offscreen: true,
        semanticHash: input.semanticHash
      }
    )
);

export const createDefaultAdapters = (): RenderTargetAdapter[] => {
  return [appRootAdapter, cardIframeAdapter, moduleSlotAdapter, offscreenRenderAdapter];
};
