import { createError } from '../../../src/shared/errors';
import { createRenderDiagnosticForNode } from './diagnostics';
import type { NormalizedNode, RenderNodeDiagnostic, RenderTargetAdapter } from './types';

const ALLOWED_NODE_TYPES = new Set([
  'View',
  'Stack',
  'Grid',
  'Form',
  'List',
  'Section',
  'ScrollView',
  'Text',
  'Image',
  'Media',
  'Table',
  'Navigation',
  'Toolbar',
  'Command',
  'Slot',
  'Field'
]);

const BANNED_VISUAL_PROPS = new Set([
  'color',
  'background',
  'backgroundColor',
  'borderRadius',
  'borderColor',
  'boxShadow',
  'shadow',
  'opacity',
  'fontSize',
  'lineHeight',
  'width',
  'height',
  'margin',
  'padding',
  'className',
  'style',
  'css',
  'sx'
]);

const A11Y_INTERACTIVE_TYPES = new Set(['Command', 'Form']);

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const hasAccessibleName = (node: NormalizedNode): boolean => {
  const accessibility = node.props.accessibility;
  if (accessibility && typeof accessibility === 'object') {
    const candidate = accessibility as Record<string, unknown>;
    if (
      isNonEmptyString(candidate.label) ||
      isNonEmptyString(candidate['aria-label']) ||
      isNonEmptyString(candidate.labelledBy) ||
      isNonEmptyString(candidate['aria-labelledby'])
    ) {
      return true;
    }
  }

  return (
    isNonEmptyString(node.props.label) ||
    isNonEmptyString(node.props['aria-label']) ||
    isNonEmptyString(node.props.text) ||
    isNonEmptyString(node.props.title)
  );
};

export const collectSingleNodeContractDiagnostics = (node: NormalizedNode, adapter: RenderTargetAdapter): RenderNodeDiagnostic[] => {
  const diagnostics: RenderNodeDiagnostic[] = [];

  if (!ALLOWED_NODE_TYPES.has(node.type) && !node.type.startsWith('Custom:')) {
    diagnostics.push(
      createRenderDiagnosticForNode(node, {
        stage: 'contract-validate',
        severity: 'P0',
        code: 'RENDER_CONTRACT_NODE_TYPE_INVALID',
        message: `Unsupported node type: ${node.type}`,
        suggestion: 'Use a registered L8 semantic primitive or declare a Custom:* component contract before rendering.',
        details: {
          nodeId: node.id,
          nodeType: node.type
        }
      })
    );
  }

  for (const key of Object.keys(node.props)) {
    if (BANNED_VISUAL_PROPS.has(key)) {
      diagnostics.push(
        createRenderDiagnosticForNode(node, {
          stage: 'contract-validate',
          severity: 'P1',
          code: 'RENDER_CONTRACT_VISUAL_PROP_FORBIDDEN',
          message: `Visual prop is not allowed: ${key}`,
          suggestion: 'Move visual values into component contract, theme tokens, or semantic layout modifiers.',
          details: {
            nodeId: node.id,
            prop: key
          }
        })
      );
    }
  }

  for (const effect of node.effects) {
    if (effect.kind === 'runtime-effect' && effect.trigger === 'render') {
      diagnostics.push(
        createRenderDiagnosticForNode(node, {
          stage: 'contract-validate',
          severity: 'P0',
          code: 'RENDER_CONTRACT_RUNTIME_EFFECT_FORBIDDEN',
          message: 'runtime-effect cannot trigger in render phase',
          suggestion: 'Move runtime-effect execution to event or commit phase through the Runtime Client effect queue.',
          details: {
            nodeId: node.id,
            effectName: effect.name
          }
        })
      );
    }
  }

  for (const required of node.contract.requires) {
    if (!adapter.capabilities.has(required)) {
      diagnostics.push(
        createRenderDiagnosticForNode(node, {
          stage: 'contract-validate',
          severity: 'P0',
          code: 'RENDER_CONTRACT_CAPABILITY_MISSING',
          message: `Adapter ${adapter.target} does not support capability: ${required}`,
          suggestion: 'Choose a target adapter with this capability or remove the incompatible contract requirement.',
          details: {
            nodeId: node.id,
            required,
            target: adapter.target
          }
        })
      );
    }
  }

  for (const [eventName, handlerId] of Object.entries(node.events)) {
    if (!isNonEmptyString(eventName) || !isNonEmptyString(handlerId)) {
      diagnostics.push(
        createRenderDiagnosticForNode(node, {
          stage: 'contract-validate',
          severity: 'P1',
          code: 'RENDER_CONTRACT_EVENT_HANDLER_INVALID',
          message: `Event "${eventName}" must reference a non-empty handler id`,
          suggestion: 'Register executable logic outside the declaration tree and reference only its handler id.',
          details: {
            nodeId: node.id,
            eventName,
            handlerIdType: typeof handlerId
          }
        })
      );
    }
  }

  if (A11Y_INTERACTIVE_TYPES.has(node.type) && !hasAccessibleName(node)) {
    diagnostics.push(
      createRenderDiagnosticForNode(node, {
        stage: 'contract-validate',
        severity: 'P1',
        code: 'RENDER_CONTRACT_A11Y_NAME_REQUIRED',
        message: `${node.type} node requires an accessible name`,
        suggestion: 'Provide text, title, label, aria-label, or accessibility.label for interactive nodes.',
        details: {
          nodeId: node.id,
          nodeType: node.type
        }
      })
    );
  }

  return diagnostics;
};

export const collectContractDiagnostics = (root: NormalizedNode, adapter: RenderTargetAdapter): RenderNodeDiagnostic[] => {
  const diagnostics: RenderNodeDiagnostic[] = [];
  const visit = (node: NormalizedNode): void => {
    diagnostics.push(...collectSingleNodeContractDiagnostics(node, adapter));
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return diagnostics;
};

export const validateSingleNodeContract = (node: NormalizedNode, adapter: RenderTargetAdapter): void => {
  const diagnostics = collectSingleNodeContractDiagnostics(node, adapter);
  const fatal = diagnostics.find((diagnostic) => diagnostic.qualityGateBlocking);
  if (fatal) {
    throw createError(fatal.code, fatal.message, {
      nodeId: fatal.nodeId,
      path: fatal.path,
      severity: fatal.severity,
      suggestion: fatal.suggestion,
      details: fatal.details
    });
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
