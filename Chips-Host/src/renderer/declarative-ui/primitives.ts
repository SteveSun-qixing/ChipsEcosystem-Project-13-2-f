import { createUINode } from './node-model';
import type { NodeBindings, NodeEvents, NodeMap, NodeModifiers, SemanticPrimitiveType, UINode, UINodeInput } from './types';

export interface PrimitiveNodeOptions {
  id: string;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: NodeBindings;
  events?: NodeEvents;
  themeScope?: string;
  modifiers?: NodeModifiers;
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
      modifiers: options.modifiers,
      children: options.children
    });
};

export const View = createPrimitiveFactory('View');
export const Stack = createPrimitiveFactory('Stack');
export const Grid = createPrimitiveFactory('Grid');
export const Form = createPrimitiveFactory('Form');
export const List = createPrimitiveFactory('List');
export const Section = createPrimitiveFactory('Section');
export const ScrollView = createPrimitiveFactory('ScrollView');
export const Text = createPrimitiveFactory('Text');
export const Image = createPrimitiveFactory('Image');
export const Media = createPrimitiveFactory('Media');
export const Table = createPrimitiveFactory('Table');
export const Navigation = createPrimitiveFactory('Navigation');
export const Toolbar = createPrimitiveFactory('Toolbar');
export const Command = createPrimitiveFactory('Command');
export const Slot = createPrimitiveFactory('Slot');

export const SemanticPrimitives = {
  View,
  Stack,
  Grid,
  Form,
  List,
  Section,
  ScrollView,
  Text,
  Image,
  Media,
  Table,
  Navigation,
  Toolbar,
  Command,
  Slot
} as const;
