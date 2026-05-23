import { createError } from '../../shared/errors';
import { createUINode } from './node-model';
import type {
  DeclarativeUIDiagnostic,
  NodeMap,
  NodeModifiers,
  SlotSchema,
  SlotSchemaEntry,
  UINode,
  UINodeInput,
  UINodeType
} from './types';

const BOOLEAN_MODE_KEY_PATTERN = /^(is|has|show|with)[A-Z]/;

const asArray = <T>(value: T | ReadonlyArray<T>): T[] => {
  return Array.isArray(value) ? [...value] : [value as T];
};

export interface CompoundSlotSpec extends SlotSchemaEntry {
  type?: UINodeType | ReadonlyArray<UINodeType>;
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
  modifiers?: NodeModifiers;
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
  validate(input: CompoundComposeInput): DeclarativeUIDiagnostic[];
}

export const StandardCompoundSlotSchemas = {
  Dialog: {
    trigger: { type: 'Command', required: false, multiple: false, part: 'trigger' },
    content: { type: 'Section', required: true, multiple: false, part: 'content', role: 'dialog' },
    header: { type: 'Section', required: false, multiple: false, part: 'header' },
    body: { type: ['View', 'Stack', 'Section'], required: true, multiple: false, part: 'body' },
    footer: { type: 'Toolbar', required: false, multiple: false, part: 'footer' },
    actions: { type: 'Toolbar', required: false, multiple: false, part: 'actions' },
    close: { type: 'Command', required: false, multiple: false, part: 'close' }
  },
  Tabs: {
    list: { type: 'Toolbar', required: true, multiple: false, part: 'list', role: 'tablist' },
    trigger: { type: 'Command', required: true, multiple: true, part: 'trigger', role: 'tab' },
    panel: { type: 'Section', required: true, multiple: true, part: 'panel', role: 'tabpanel' }
  },
  Menu: {
    trigger: { type: 'Command', required: false, multiple: false, part: 'trigger' },
    content: { type: 'Section', required: true, multiple: false, part: 'content', role: 'menu' },
    item: { type: 'Command', required: true, multiple: true, part: 'item', role: 'menuitem' },
    group: { type: 'Section', required: false, multiple: true, part: 'group' },
    separator: { type: 'View', required: false, multiple: true, part: 'separator' }
  },
  Form: {
    section: { type: 'Section', required: false, multiple: true, part: 'section' },
    field: { type: 'Form', required: true, multiple: true, part: 'field' },
    label: { type: 'Text', required: false, multiple: true, part: 'label' },
    control: { type: ['View', 'Command'], required: true, multiple: true, part: 'control' },
    error: { type: 'Text', required: false, multiple: true, part: 'error' },
    hint: { type: 'Text', required: false, multiple: true, part: 'hint' }
  },
  DataGrid: {
    toolbar: { type: 'Toolbar', required: false, multiple: false, part: 'toolbar' },
    header: { type: 'Table', required: true, multiple: false, part: 'header' },
    row: { type: 'Table', required: true, multiple: true, part: 'row' },
    cell: { type: 'Table', required: true, multiple: true, part: 'cell' },
    pagination: { type: 'Toolbar', required: false, multiple: false, part: 'pagination' }
  }
} as const satisfies Record<string, SlotSchema>;

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

const expectedTypesToArray = (expectedType: UINodeType | ReadonlyArray<UINodeType> | undefined): UINodeType[] => {
  if (!expectedType) {
    return [];
  }
  return Array.isArray(expectedType) ? [...expectedType] : [expectedType as UINodeType];
};

const createSlotDiagnostic = (
  definition: CompoundComponentDefinition,
  slotName: string,
  code: string,
  message: string,
  details: Record<string, unknown>,
  suggestion: string,
  node?: UINode,
  severity: DeclarativeUIDiagnostic['severity'] = 'error'
): DeclarativeUIDiagnostic => ({
  nodeId: node?.id ?? definition.name,
  type: node?.type ?? definition.rootType,
  path: `slots.${slotName}`,
  stage: 'slot-validate',
  severity,
  code,
  message,
  suggestion,
  details: {
    componentName: definition.name,
    slotName,
    ...details
  }
});

const enforceSlotType = (slotName: string, expectedType: UINodeType | ReadonlyArray<UINodeType> | undefined, node: UINode): void => {
  const expectedTypes = expectedTypesToArray(expectedType);
  if (expectedTypes.length === 0) {
    return;
  }
  if (expectedTypes.includes(node.type)) {
    return;
  }
  throw createError('DECLARATIVE_UI_SLOT_TYPE_MISMATCH', `Slot "${slotName}" expects "${expectedTypes.join(' | ')}" but got "${node.type}"`, {
    slotName,
    expectedType: expectedTypes.length === 1 ? expectedTypes[0] : expectedTypes,
    actualType: node.type
  });
};

export const createCompoundComponent = (definition: CompoundComponentDefinition): CompoundComponent => {
  const validate = (input: CompoundComposeInput): DeclarativeUIDiagnostic[] => {
    const diagnostics: DeclarativeUIDiagnostic[] = [];
    const slotEntries = Object.entries(definition.slots);
    for (const [slotName, slotSpec] of slotEntries) {
      const payload = input.slots[slotName];
      if (!payload) {
        if (slotSpec.required) {
          diagnostics.push(
            createSlotDiagnostic(
              definition,
              slotName,
              'DECLARATIVE_UI_SLOT_REQUIRED',
              `Required slot "${slotName}" is missing in "${definition.name}"`,
              { required: true },
              'Provide this slot explicitly or make the slot optional in the component contract.'
            )
          );
        }
        continue;
      }

      const slotPayloads = asArray(payload);
      if (!slotSpec.multiple && slotPayloads.length > 1) {
        diagnostics.push(
          createSlotDiagnostic(
            definition,
            slotName,
            'DECLARATIVE_UI_SLOT_MULTIPLE_FORBIDDEN',
            `Slot "${slotName}" only accepts a single node`,
            { count: slotPayloads.length },
            'Use a wrapper node for grouped content or mark this slot as multiple in the component contract.'
          )
        );
      }

      for (const [index, nodeInput] of slotPayloads.entries()) {
        try {
          const node = createUINode(nodeInput as UINodeInput);
          const expectedTypes = expectedTypesToArray(slotSpec.type);
          if (expectedTypes.length > 0 && !expectedTypes.includes(node.type)) {
            diagnostics.push(
              createSlotDiagnostic(
                definition,
                slotName,
                'DECLARATIVE_UI_SLOT_TYPE_MISMATCH',
                `Slot "${slotName}" expects "${expectedTypes.join(' | ')}" but got "${node.type}"`,
                {
                  expectedType: expectedTypes.length === 1 ? expectedTypes[0] : expectedTypes,
                  actualType: node.type,
                  index
                },
                'Use the declared semantic primitive for this slot or update the slot schema.',
                node
              )
            );
          }
        } catch (error) {
          const standard = error && typeof error === 'object' && 'code' in error
            ? (error as { code?: string; message?: string; details?: unknown })
            : undefined;
          diagnostics.push(
            createSlotDiagnostic(
              definition,
              slotName,
              standard?.code ?? 'DECLARATIVE_UI_SLOT_NODE_INVALID',
              standard?.message ?? `Slot "${slotName}" contains an invalid node`,
              { error: standard?.details ?? error, index },
              'Create slot content with a valid L8 node factory before composing it.'
            )
          );
        }
      }
    }

    for (const slotName of Object.keys(input.slots)) {
      if (definition.slots[slotName]) {
        continue;
      }
      diagnostics.push(
        createSlotDiagnostic(
          definition,
          slotName,
          'DECLARATIVE_UI_SLOT_UNDEFINED',
          `Slot "${slotName}" is not declared in "${definition.name}"`,
          {},
          'Declare the slot in the component schema before passing content to it.'
        )
      );
    }

    return diagnostics;
  };

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
    const diagnostics = validate(input);
    const fatalDiagnostic = diagnostics.find((item) => item.severity === 'error');
    if (fatalDiagnostic) {
      throw createError(fatalDiagnostic.code, fatalDiagnostic.message, fatalDiagnostic.details);
    }

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
      modifiers: input.root.modifiers,
      children
    });
  };

  return {
    name: definition.name,
    definition,
    createSlot,
    compose,
    validate
  };
};
