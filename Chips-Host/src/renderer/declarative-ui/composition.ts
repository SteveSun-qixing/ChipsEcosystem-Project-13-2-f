import { createError } from '../../shared/errors';
import { createUINode } from './node-model';
import type { NodeMap, UINode, UINodeInput, UINodeType } from './types';

const BOOLEAN_MODE_KEY_PATTERN = /^(is|has|show|with)[A-Z]/;

const asArray = <T>(value: T | ReadonlyArray<T>): T[] => {
  return Array.isArray(value) ? [...value] : [value as T];
};

export interface CompoundSlotSpec {
  type?: UINodeType;
  required?: boolean;
  multiple?: boolean;
}

export interface CompoundComponentDefinition {
  name: string;
  rootType: UINodeType;
  slots: Record<string, CompoundSlotSpec>;
  allowBooleanProps?: string[];
}

export interface CompoundRootInput {
  id: string;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: Record<string, string>;
  events?: Record<string, string>;
  themeScope?: string;
}

export interface CompoundComposeInput {
  root: CompoundRootInput;
  slots: Record<string, UINode | UINodeInput | ReadonlyArray<UINode | UINodeInput>>;
}

export interface CompoundComponent {
  readonly name: string;
  readonly definition: CompoundComponentDefinition;
  createSlot(slotName: string, node: UINodeInput): UINode;
  compose(input: CompoundComposeInput): UINode;
}

export const guardAgainstBooleanModeProps = (
  props: NodeMap | undefined,
  componentName: string,
  allowList: ReadonlyArray<string> = []
): void => {
  if (!props) {
    return;
  }

  for (const [key, value] of Object.entries(props)) {
    if (typeof value !== 'boolean') {
      continue;
    }
    if (!BOOLEAN_MODE_KEY_PATTERN.test(key)) {
      continue;
    }
    if (allowList.includes(key)) {
      continue;
    }
    throw createError(
      'DECLARATIVE_UI_BOOLEAN_MODE_FORBIDDEN',
      `Boolean mode prop "${key}" is not allowed in compound component "${componentName}"`,
      {
        componentName,
        prop: key
      }
    );
  }
};

const enforceSlotType = (slotName: string, expectedType: UINodeType | undefined, node: UINode): void => {
  if (!expectedType) {
    return;
  }
  if (node.type === expectedType) {
    return;
  }
  throw createError('DECLARATIVE_UI_SLOT_TYPE_MISMATCH', `Slot "${slotName}" expects "${expectedType}" but got "${node.type}"`, {
    slotName,
    expectedType,
    actualType: node.type
  });
};

export const createCompoundComponent = (definition: CompoundComponentDefinition): CompoundComponent => {
  const createSlot = (slotName: string, nodeInput: UINodeInput): UINode => {
    const slotSpec = definition.slots[slotName];
    if (!slotSpec) {
      throw createError('DECLARATIVE_UI_SLOT_UNDEFINED', `Slot "${slotName}" is not declared in "${definition.name}"`, {
        componentName: definition.name,
        slotName
      });
    }
    const node = createUINode(nodeInput);
    enforceSlotType(slotName, slotSpec.type, node);
    return {
      ...node,
      props: {
        ...(node.props ?? {}),
        slot: slotName
      }
    };
  };

  const compose = (input: CompoundComposeInput): UINode => {
    guardAgainstBooleanModeProps(input.root.props, definition.name, definition.allowBooleanProps);

    const children: UINode[] = [];
    const slotEntries = Object.entries(definition.slots);
    for (const [slotName, slotSpec] of slotEntries) {
      const payload = input.slots[slotName];
      if (!payload) {
        if (slotSpec.required) {
          throw createError(
            'DECLARATIVE_UI_SLOT_REQUIRED',
            `Required slot "${slotName}" is missing in "${definition.name}"`,
            { componentName: definition.name, slotName }
          );
        }
        continue;
      }

      const slotNodes = asArray(payload).map((item) => createSlot(slotName, item as UINodeInput));
      if (!slotSpec.multiple && slotNodes.length > 1) {
        throw createError(
          'DECLARATIVE_UI_SLOT_MULTIPLE_FORBIDDEN',
          `Slot "${slotName}" only accepts a single node`,
          { componentName: definition.name, slotName }
        );
      }
      children.push(...slotNodes);
    }

    return createUINode({
      id: input.root.id,
      type: definition.rootType,
      props: input.root.props,
      state: input.root.state,
      bindings: input.root.bindings,
      events: input.root.events,
      themeScope: input.root.themeScope,
      children
    });
  };

  return {
    name: definition.name,
    definition,
    createSlot,
    compose
  };
};
