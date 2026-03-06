import { createError } from '../../shared/errors';
import type { NodeBindings, NodeEvents, NodeMap, UINode, UINodeInput } from './types';

const cloneNodeMap = (value?: NodeMap): NodeMap | undefined => {
  if (!value) {
    return undefined;
  }
  return { ...value };
};

const cloneNodeBindings = (value?: NodeBindings): NodeBindings | undefined => {
  if (!value) {
    return undefined;
  }
  return { ...value };
};

const cloneNodeEvents = (value?: NodeEvents): NodeEvents | undefined => {
  if (!value) {
    return undefined;
  }
  return { ...value };
};

const assertNonEmptyString = (value: string, field: string): void => {
  if (value.trim().length === 0) {
    throw createError('DECLARATIVE_UI_NODE_INVALID', `${field} cannot be empty`, { field });
  }
};

const normalizeNode = (input: UINode | UINodeInput): UINode => {
  assertNonEmptyString(input.id, 'id');
  assertNonEmptyString(input.type, 'type');

  const children = input.children?.map((child) => normalizeNode(child));
  return {
    id: input.id,
    type: input.type,
    props: cloneNodeMap(input.props),
    state: cloneNodeMap(input.state),
    bindings: cloneNodeBindings(input.bindings),
    events: cloneNodeEvents(input.events),
    themeScope: input.themeScope,
    children
  };
};

export const createUINode = (input: UINodeInput): UINode => normalizeNode(input);

export const cloneUINode = (node: UINode): UINode => normalizeNode(node);

export const bindNodeEvent = (node: UINode, eventName: string, handlerId: string): UINode => {
  assertNonEmptyString(eventName, 'eventName');
  assertNonEmptyString(handlerId, 'handlerId');
  const events: NodeEvents = {
    ...(node.events ?? {}),
    [eventName]: handlerId
  };
  return {
    ...cloneUINode(node),
    events
  };
};

export const appendChildren = (node: UINode, ...children: ReadonlyArray<UINode | UINodeInput>): UINode => {
  const normalizedChildren = children.map((child) => normalizeNode(child));
  return {
    ...cloneUINode(node),
    children: [...(node.children ?? []), ...normalizedChildren]
  };
};
