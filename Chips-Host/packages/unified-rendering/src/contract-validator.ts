import { createError } from '../../../src/shared/errors';
import type { NormalizedNode, RenderTargetAdapter } from './types';

const ALLOWED_NODE_TYPES = new Set(['View', 'Stack', 'Grid', 'Form', 'List', 'Table', 'Text', 'Image', 'Field']);

const BANNED_VISUAL_PROPS = new Set([
  'color',
  'background',
  'backgroundColor',
  'borderColor',
  'boxShadow',
  'borderRadius',
  'opacity',
  'fontSize',
  'lineHeight'
]);

export const validateSingleNodeContract = (node: NormalizedNode, adapter: RenderTargetAdapter): void => {
  if (!ALLOWED_NODE_TYPES.has(node.type) && !node.type.startsWith('Custom:')) {
    throw createError('RENDER_CONTRACT_NODE_TYPE_INVALID', `Unsupported node type: ${node.type}`, {
      nodeId: node.id,
      nodeType: node.type
    });
  }

  for (const key of Object.keys(node.props)) {
    if (BANNED_VISUAL_PROPS.has(key)) {
      throw createError('RENDER_CONTRACT_VISUAL_PROP_FORBIDDEN', `Visual prop is not allowed: ${key}`, {
        nodeId: node.id,
        prop: key
      });
    }
  }

  for (const effect of node.effects) {
    if (effect.kind === 'runtime-effect' && effect.trigger === 'render') {
      throw createError('RENDER_CONTRACT_RUNTIME_EFFECT_FORBIDDEN', 'runtime-effect cannot trigger in render phase', {
        nodeId: node.id,
        effectName: effect.name
      });
    }
  }

  for (const required of node.contract.requires) {
    if (!adapter.capabilities.has(required)) {
      throw createError('RENDER_CONTRACT_CAPABILITY_MISSING', `Adapter ${adapter.target} does not support capability: ${required}`, {
        nodeId: node.id,
        required,
        target: adapter.target
      });
    }
  }
};

const validateNode = (node: NormalizedNode, adapter: RenderTargetAdapter): void => {
  validateSingleNodeContract(node, adapter);
  for (const child of node.children) {
    validateNode(child, adapter);
  }
};

export const validateNodeContract = (root: NormalizedNode, adapter: RenderTargetAdapter): void => {
  validateNode(root, adapter);
};
