import { createUINode } from './node-model';
import type { NodeBindings, NodeEvents, NodeMap, SemanticPrimitiveType, UINode, UINodeInput } from './types';

export interface PrimitiveNodeOptions {
  id: string;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: NodeBindings;
  events?: NodeEvents;
  themeScope?: string;
  children?: ReadonlyArray<UINode | UINodeInput>;
}

export type PrimitiveFactory = (options: PrimitiveNodeOptions) => UINode;

const createPrimitiveFactory = (type: SemanticPrimitiveType): PrimitiveFactory => {
  return (options) =>
    createUINode({
      id: options.id,
      type,
      props: options.props,
      state: options.state,
      bindings: options.bindings,
      events: options.events,
      themeScope: options.themeScope,
      children: options.children
    });
};

export const View = createPrimitiveFactory('View');
export const Stack = createPrimitiveFactory('Stack');
export const Grid = createPrimitiveFactory('Grid');
export const Form = createPrimitiveFactory('Form');
export const List = createPrimitiveFactory('List');

export const SemanticPrimitives = {
  View,
  Stack,
  Grid,
  Form,
  List
} as const;
