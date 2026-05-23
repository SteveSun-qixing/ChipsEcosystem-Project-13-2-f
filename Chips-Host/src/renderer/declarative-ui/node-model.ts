import { createError } from '../../shared/errors';
import { UI_MODIFIER_KEYS } from './types';
import type {
  AccessibilityModifier,
  FocusScopeModifier,
  LayoutModifier,
  MotionModifier,
  NodeBindings,
  NodeEvents,
  NodeMap,
  NodeModifiers,
  PermissionModifier,
  PresentationModifier,
  ShortcutKeyModifier,
  ShortcutModifier,
  UINode,
  UINodeInput
} from './types';

const VISUAL_PROP_KEYS = new Set([
  'style',
  'styles',
  'css',
  'sx',
  'class',
  'classname',
  'color',
  'background',
  'backgroundcolor',
  'fill',
  'stroke',
  'opacity',
  'border',
  'bordercolor',
  'borderradius',
  'borderwidth',
  'shadow',
  'boxshadow',
  'font',
  'fontsize',
  'fontfamily',
  'fontweight',
  'lineheight',
  'letterspacing',
  'width',
  'height',
  'minwidth',
  'maxwidth',
  'minheight',
  'maxheight',
  'margin',
  'margintop',
  'marginright',
  'marginbottom',
  'marginleft',
  'padding',
  'paddingtop',
  'paddingright',
  'paddingbottom',
  'paddingleft'
]);

const LAYOUT_MODIFIER_KEYS = ['display', 'direction', 'alignment', 'distribution', 'gap', 'columns', 'priority', 'scrollAxis'] as const;
const ACCESSIBILITY_MODIFIER_KEYS = ['role', 'label', 'labelledBy', 'describedBy', 'hidden', 'live', 'controls', 'current'] as const;
const FOCUS_SCOPE_MODIFIER_KEYS = ['id', 'trap', 'restore', 'order'] as const;
const SHORTCUT_MODIFIER_KEYS = ['key', 'modifiers', 'command', 'when'] as const;
const PERMISSION_MODIFIER_KEYS = ['action', 'resource', 'fallback'] as const;
const PRESENTATION_MODIFIER_KEYS = ['surface', 'mode', 'placement', 'priority'] as const;
const MOTION_MODIFIER_KEYS = ['preset', 'enter', 'exit', 'update', 'reduceMotion'] as const;

const normalizeKey = (key: string): string => key.replace(/[-_]/g, '').toLowerCase();

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const createNodeInvalidError = (message: string, details: Record<string, unknown>) =>
  createError('DECLARATIVE_UI_NODE_INVALID', message, details);

const createModifierInvalidError = (message: string, details: Record<string, unknown>) =>
  createError('DECLARATIVE_UI_MODIFIER_INVALID', message, details);

const assertNonEmptyString = (value: unknown, field: string, nodeId?: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createNodeInvalidError(`${field} cannot be empty`, { field, nodeId });
  }
  return value.trim();
};

const assertPlainRecord = (value: unknown, field: string, nodeId?: string): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    throw createNodeInvalidError(`${field} must be a plain object`, { field, nodeId });
  }
  return value;
};

const assertAllowedKeys = (
  record: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>,
  field: string,
  nodeId?: string
): void => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw createModifierInvalidError(`Unknown modifier field "${key}"`, { field, key, nodeId });
    }
  }
};

const assertPresentModifier = (record: Record<string, unknown>, field: string, nodeId?: string): void => {
  if (Object.keys(record).length === 0) {
    throw createModifierInvalidError(`${field} cannot be empty`, { field, nodeId });
  }
};

const assertVisualPropAllowed = (key: string, field: string, nodeId?: string): void => {
  if (!VISUAL_PROP_KEYS.has(normalizeKey(key))) {
    return;
  }
  throw createError('DECLARATIVE_UI_VISUAL_PROP_FORBIDDEN', `Visual prop "${key}" is not allowed in L8 nodes`, {
    field,
    key,
    nodeId
  });
};

const cloneSerializable = (
  value: unknown,
  field: string,
  nodeId: string | undefined,
  options: { forbidVisualKeys?: boolean } = {}
): unknown => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw createNodeInvalidError(`${field} must be a finite number`, { field, nodeId });
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => cloneSerializable(item, `${field}[${index}]`, nodeId, options));
  }
  if (isPlainRecord(value)) {
    const clone: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      assertNonEmptyString(key, `${field} key`, nodeId);
      if (options.forbidVisualKeys) {
        assertVisualPropAllowed(key, `${field}.${key}`, nodeId);
      }
      clone[key] = cloneSerializable(item, `${field}.${key}`, nodeId, options);
    }
    return clone;
  }
  throw createNodeInvalidError(`${field} must be JSON serializable`, { field, nodeId, valueType: typeof value });
};

const cloneNodeMap = (value: NodeMap | undefined, field: string, nodeId?: string, forbidVisualKeys = false): NodeMap | undefined => {
  if (!value) {
    return undefined;
  }
  const record = assertPlainRecord(value, field, nodeId);
  return cloneSerializable(record, field, nodeId, { forbidVisualKeys }) as NodeMap;
};

const cloneNodeBindings = (value: NodeBindings | undefined, nodeId?: string): NodeBindings | undefined => {
  if (!value) {
    return undefined;
  }
  const record = assertPlainRecord(value, 'bindings', nodeId);
  const bindings: NodeBindings = {};
  for (const [key, binding] of Object.entries(record)) {
    const bindingKey = assertNonEmptyString(key, 'bindings key', nodeId);
    bindings[bindingKey] = assertNonEmptyString(binding, `bindings.${bindingKey}`, nodeId);
  }
  return bindings;
};

const cloneNodeEvents = (value: NodeEvents | undefined, nodeId?: string): NodeEvents | undefined => {
  if (!value) {
    return undefined;
  }
  const record = assertPlainRecord(value, 'events', nodeId);
  const events: NodeEvents = {};
  for (const [key, handlerId] of Object.entries(record)) {
    const eventName = assertNonEmptyString(key, 'events key', nodeId);
    events[eventName] = assertNonEmptyString(handlerId, `events.${eventName}`, nodeId);
  }
  return events;
};

const optionalString = (record: Record<string, unknown>, key: string, field: string, nodeId?: string): string | undefined => {
  if (record[key] === undefined) {
    return undefined;
  }
  return assertNonEmptyString(record[key], `${field}.${key}`, nodeId);
};

const optionalBoolean = (record: Record<string, unknown>, key: string, field: string, nodeId?: string): boolean | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw createModifierInvalidError(`${field}.${key} must be a boolean`, { field: `${field}.${key}`, nodeId });
  }
  return value;
};

const optionalFiniteNumber = (record: Record<string, unknown>, key: string, field: string, nodeId?: string): number | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createModifierInvalidError(`${field}.${key} must be a finite number`, { field: `${field}.${key}`, nodeId });
  }
  return value;
};

const optionalEnum = <T extends string>(
  record: Record<string, unknown>,
  key: string,
  allowedValues: ReadonlyArray<T>,
  field: string,
  nodeId?: string
): T | undefined => {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw createModifierInvalidError(`${field}.${key} must be one of: ${allowedValues.join(', ')}`, {
      field: `${field}.${key}`,
      value,
      nodeId
    });
  }
  return value as T;
};

const cloneStringArray = (value: unknown, field: string, nodeId?: string): string[] => {
  if (!Array.isArray(value)) {
    throw createModifierInvalidError(`${field} must be an array`, { field, nodeId });
  }
  return value.map((item, index) => assertNonEmptyString(item, `${field}[${index}]`, nodeId));
};

const cloneLayoutModifier = (value: unknown, nodeId?: string): LayoutModifier => {
  const record = assertPlainRecord(value, 'modifiers.layout', nodeId);
  assertPresentModifier(record, 'modifiers.layout', nodeId);
  assertAllowedKeys(record, LAYOUT_MODIFIER_KEYS, 'modifiers.layout', nodeId);
  const columns = record.columns;
  if (columns !== undefined && columns !== 'auto') {
    if (typeof columns !== 'number' || !Number.isInteger(columns) || columns < 1) {
      throw createModifierInvalidError('modifiers.layout.columns must be a positive integer or "auto"', {
        field: 'modifiers.layout.columns',
        nodeId
      });
    }
  }
  return {
    display: optionalEnum(record, 'display', ['block', 'inline', 'grid', 'overlay'], 'modifiers.layout', nodeId),
    direction: optionalEnum(record, 'direction', ['vertical', 'horizontal', 'overlay'], 'modifiers.layout', nodeId),
    alignment: optionalEnum(record, 'alignment', ['leading', 'center', 'trailing', 'stretch'], 'modifiers.layout', nodeId),
    distribution: optionalEnum(record, 'distribution', ['leading', 'center', 'trailing', 'spaceBetween', 'spaceAround'], 'modifiers.layout', nodeId),
    gap: optionalEnum(record, 'gap', ['none', 'xs', 'sm', 'md', 'lg', 'xl'], 'modifiers.layout', nodeId),
    columns: columns as LayoutModifier['columns'],
    priority: optionalFiniteNumber(record, 'priority', 'modifiers.layout', nodeId),
    scrollAxis: optionalEnum(record, 'scrollAxis', ['vertical', 'horizontal', 'both'], 'modifiers.layout', nodeId)
  };
};

const cloneAccessibilityModifier = (value: unknown, nodeId?: string): AccessibilityModifier => {
  const record = assertPlainRecord(value, 'modifiers.accessibility', nodeId);
  assertPresentModifier(record, 'modifiers.accessibility', nodeId);
  assertAllowedKeys(record, ACCESSIBILITY_MODIFIER_KEYS, 'modifiers.accessibility', nodeId);
  const current = record.current;
  if (
    current !== undefined &&
    typeof current !== 'boolean' &&
    (typeof current !== 'string' || !['page', 'step', 'location', 'date', 'time'].includes(current))
  ) {
    throw createModifierInvalidError('modifiers.accessibility.current is invalid', {
      field: 'modifiers.accessibility.current',
      value: current,
      nodeId
    });
  }
  return {
    role: optionalString(record, 'role', 'modifiers.accessibility', nodeId),
    label: optionalString(record, 'label', 'modifiers.accessibility', nodeId),
    labelledBy: optionalString(record, 'labelledBy', 'modifiers.accessibility', nodeId),
    describedBy: optionalString(record, 'describedBy', 'modifiers.accessibility', nodeId),
    hidden: optionalBoolean(record, 'hidden', 'modifiers.accessibility', nodeId),
    live: optionalEnum(record, 'live', ['off', 'polite', 'assertive'], 'modifiers.accessibility', nodeId),
    controls: optionalString(record, 'controls', 'modifiers.accessibility', nodeId),
    current: current as AccessibilityModifier['current']
  };
};

const cloneFocusScopeModifier = (value: unknown, nodeId?: string): string | FocusScopeModifier => {
  if (typeof value === 'string') {
    return assertNonEmptyString(value, 'modifiers.focusScope', nodeId);
  }
  const record = assertPlainRecord(value, 'modifiers.focusScope', nodeId);
  assertAllowedKeys(record, FOCUS_SCOPE_MODIFIER_KEYS, 'modifiers.focusScope', nodeId);
  const focusScope: FocusScopeModifier = {
    id: assertNonEmptyString(record.id, 'modifiers.focusScope.id', nodeId),
    trap: optionalBoolean(record, 'trap', 'modifiers.focusScope', nodeId),
    restore: optionalBoolean(record, 'restore', 'modifiers.focusScope', nodeId)
  };
  if (record.order !== undefined) {
    focusScope.order = cloneStringArray(record.order, 'modifiers.focusScope.order', nodeId);
  }
  return focusScope;
};

const cloneShortcutModifier = (value: unknown, nodeId?: string): ShortcutModifier => {
  const record = assertPlainRecord(value, 'modifiers.shortcut', nodeId);
  assertAllowedKeys(record, SHORTCUT_MODIFIER_KEYS, 'modifiers.shortcut', nodeId);
  const shortcut: ShortcutModifier = {
    key: assertNonEmptyString(record.key, 'modifiers.shortcut.key', nodeId),
    command: assertNonEmptyString(record.command, 'modifiers.shortcut.command', nodeId)
  };
  if (record.modifiers !== undefined) {
    if (!Array.isArray(record.modifiers)) {
      throw createModifierInvalidError('modifiers.shortcut.modifiers must be an array', {
        field: 'modifiers.shortcut.modifiers',
        nodeId
      });
    }
    shortcut.modifiers = record.modifiers.map((item, index) => {
      if (typeof item !== 'string' || !['cmd', 'ctrl', 'alt', 'shift', 'meta'].includes(item)) {
        throw createModifierInvalidError('modifiers.shortcut.modifiers contains an invalid key modifier', {
          field: `modifiers.shortcut.modifiers[${index}]`,
          value: item,
          nodeId
        });
      }
      return item as ShortcutKeyModifier;
    });
  }
  if (record.when !== undefined) {
    shortcut.when = assertNonEmptyString(record.when, 'modifiers.shortcut.when', nodeId);
  }
  return shortcut;
};

const cloneShortcutModifiers = (value: unknown, nodeId?: string): ShortcutModifier | ShortcutModifier[] => {
  if (!Array.isArray(value)) {
    return cloneShortcutModifier(value, nodeId);
  }
  if (value.length === 0) {
    throw createModifierInvalidError('modifiers.shortcut cannot be an empty array', {
      field: 'modifiers.shortcut',
      nodeId
    });
  }
  return value.map((item) => cloneShortcutModifier(item, nodeId));
};

const clonePermissionModifier = (value: unknown, nodeId?: string): PermissionModifier => {
  const record = assertPlainRecord(value, 'modifiers.permission', nodeId);
  assertAllowedKeys(record, PERMISSION_MODIFIER_KEYS, 'modifiers.permission', nodeId);
  return {
    action: assertNonEmptyString(record.action, 'modifiers.permission.action', nodeId),
    resource: optionalString(record, 'resource', 'modifiers.permission', nodeId),
    fallback: optionalEnum(record, 'fallback', ['hide', 'disable', 'readonly', 'reject'], 'modifiers.permission', nodeId)
  };
};

const clonePresentationModifier = (value: unknown, nodeId?: string): PresentationModifier => {
  const record = assertPlainRecord(value, 'modifiers.presentation', nodeId);
  assertPresentModifier(record, 'modifiers.presentation', nodeId);
  assertAllowedKeys(record, PRESENTATION_MODIFIER_KEYS, 'modifiers.presentation', nodeId);
  return {
    surface: optionalEnum(record, 'surface', ['window', 'tab', 'route', 'modal', 'sheet', 'fullscreen'], 'modifiers.presentation', nodeId),
    mode: optionalEnum(record, 'mode', ['inline', 'modal', 'popover', 'sheet', 'fullscreen'], 'modifiers.presentation', nodeId),
    placement: optionalEnum(record, 'placement', ['leading', 'trailing', 'top', 'bottom', 'center'], 'modifiers.presentation', nodeId),
    priority: optionalFiniteNumber(record, 'priority', 'modifiers.presentation', nodeId)
  };
};

const cloneMotionModifier = (value: unknown, nodeId?: string): MotionModifier => {
  const record = assertPlainRecord(value, 'modifiers.motion', nodeId);
  assertPresentModifier(record, 'modifiers.motion', nodeId);
  assertAllowedKeys(record, MOTION_MODIFIER_KEYS, 'modifiers.motion', nodeId);
  return {
    preset: optionalString(record, 'preset', 'modifiers.motion', nodeId),
    enter: optionalString(record, 'enter', 'modifiers.motion', nodeId),
    exit: optionalString(record, 'exit', 'modifiers.motion', nodeId),
    update: optionalString(record, 'update', 'modifiers.motion', nodeId),
    reduceMotion: optionalEnum(record, 'reduceMotion', ['respect', 'force', 'none'], 'modifiers.motion', nodeId)
  };
};

const cloneNodeModifiers = (value: NodeModifiers | undefined, nodeId?: string): NodeModifiers | undefined => {
  if (!value) {
    return undefined;
  }
  const record = assertPlainRecord(value, 'modifiers', nodeId);
  assertAllowedKeys(record, UI_MODIFIER_KEYS, 'modifiers', nodeId);
  const modifiers: NodeModifiers = {};
  if (record.themeScope !== undefined) {
    modifiers.themeScope = assertNonEmptyString(record.themeScope, 'modifiers.themeScope', nodeId);
  }
  if (record.i18nKey !== undefined) {
    modifiers.i18nKey = assertNonEmptyString(record.i18nKey, 'modifiers.i18nKey', nodeId);
  }
  if (record.layout !== undefined) {
    modifiers.layout = cloneLayoutModifier(record.layout, nodeId);
  }
  if (record.accessibility !== undefined) {
    modifiers.accessibility = cloneAccessibilityModifier(record.accessibility, nodeId);
  }
  if (record.focusScope !== undefined) {
    modifiers.focusScope = cloneFocusScopeModifier(record.focusScope, nodeId);
  }
  if (record.shortcut !== undefined) {
    modifiers.shortcut = cloneShortcutModifiers(record.shortcut, nodeId);
  }
  if (record.permission !== undefined) {
    modifiers.permission = clonePermissionModifier(record.permission, nodeId);
  }
  if (record.presentation !== undefined) {
    modifiers.presentation = clonePresentationModifier(record.presentation, nodeId);
  }
  if (record.motion !== undefined) {
    modifiers.motion = cloneMotionModifier(record.motion, nodeId);
  }
  if (record.testId !== undefined) {
    modifiers.testId = assertNonEmptyString(record.testId, 'modifiers.testId', nodeId);
  }
  return Object.keys(modifiers).length > 0 ? modifiers : undefined;
};

const normalizeChildren = (
  children: UINodeInput['children'],
  nodeId: string,
  path: string
): UINode[] | undefined => {
  if (children === undefined) {
    return undefined;
  }
  if (!Array.isArray(children)) {
    throw createNodeInvalidError('children must be an array', { field: 'children', nodeId, path });
  }
  return children.map((child, index) => normalizeNode(child, `${path}.children[${index}]`));
};

const normalizeNode = (input: UINode | UINodeInput, path = 'node'): UINode => {
  const record = assertPlainRecord(input, path);
  const id = assertNonEmptyString(record.id, 'id');
  const type = assertNonEmptyString(record.type, 'type', id);
  let modifiers = cloneNodeModifiers(record.modifiers as NodeModifiers | undefined, id);
  const themeScope = record.themeScope === undefined ? undefined : assertNonEmptyString(record.themeScope, 'themeScope', id);
  const modifierThemeScope = modifiers?.themeScope;

  if (themeScope && modifierThemeScope && themeScope !== modifierThemeScope) {
    throw createModifierInvalidError('themeScope and modifiers.themeScope must match', {
      nodeId: id,
      themeScope,
      modifierThemeScope
    });
  }

  const resolvedThemeScope = themeScope ?? modifierThemeScope;
  if (resolvedThemeScope) {
    modifiers = {
      ...(modifiers ?? {}),
      themeScope: resolvedThemeScope
    };
  }

  return {
    id,
    type,
    props: cloneNodeMap(record.props as NodeMap | undefined, 'props', id, true),
    state: cloneNodeMap(record.state as NodeMap | undefined, 'state', id),
    bindings: cloneNodeBindings(record.bindings as NodeBindings | undefined, id),
    events: cloneNodeEvents(record.events as NodeEvents | undefined, id),
    themeScope: resolvedThemeScope,
    modifiers,
    children: normalizeChildren(record.children as UINodeInput['children'], id, path)
  };
};

export const createUINode = (input: UINodeInput): UINode => normalizeNode(input);

export const cloneUINode = (node: UINode): UINode => normalizeNode(node);

export const bindNodeEvent = (node: UINode, eventName: string, handlerId: string): UINode => {
  const normalizedEventName = assertNonEmptyString(eventName, 'eventName', node.id);
  const normalizedHandlerId = assertNonEmptyString(handlerId, 'handlerId', node.id);
  const events: NodeEvents = {
    ...(node.events ?? {}),
    [normalizedEventName]: normalizedHandlerId
  };
  return {
    ...cloneUINode(node),
    events
  };
};

export const appendChildren = (node: UINode, ...children: ReadonlyArray<UINode | UINodeInput>): UINode => {
  const clone = cloneUINode(node);
  const normalizedChildren = children.map((child) => normalizeNode(child));
  return createUINode({
    ...clone,
    children: [...(clone.children ?? []), ...normalizedChildren]
  });
};

const mergeModifierField = (current: unknown, next: unknown): unknown => {
  if (isPlainRecord(current) && isPlainRecord(next)) {
    return {
      ...current,
      ...next
    };
  }
  return next;
};

export const withNodeModifiers = (node: UINode, modifiers: NodeModifiers): UINode => {
  const clone = cloneUINode(node);
  const mergedModifiers: NodeModifiers = {
    ...(clone.modifiers ?? {})
  };
  for (const [key, value] of Object.entries(modifiers) as Array<[keyof NodeModifiers, NodeModifiers[keyof NodeModifiers]]>) {
    mergedModifiers[key] = mergeModifierField(mergedModifiers[key], value) as never;
  }
  return createUINode({
    ...clone,
    themeScope: modifiers.themeScope ?? clone.themeScope,
    modifiers: mergedModifiers
  });
};
