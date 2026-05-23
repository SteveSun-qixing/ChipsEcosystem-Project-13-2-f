export const SEMANTIC_PRIMITIVE_TYPES = [
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
  'Slot'
] as const;

export const UI_MODIFIER_KEYS = [
  'themeScope',
  'i18nKey',
  'layout',
  'accessibility',
  'focusScope',
  'shortcut',
  'permission',
  'presentation',
  'motion',
  'testId'
] as const;

export type SemanticPrimitiveType = (typeof SEMANTIC_PRIMITIVE_TYPES)[number];
export type UIModifierKey = (typeof UI_MODIFIER_KEYS)[number];
export type UINodeType = SemanticPrimitiveType | (string & {});
export type NodeMap = Record<string, unknown>;
export type NodeBindings = Record<string, string>;
export type NodeEvents = Record<string, string>;

export type LayoutModifierValue =
  | 'none'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'stretch'
  | 'leading'
  | 'center'
  | 'trailing'
  | 'spaceBetween'
  | 'spaceAround'
  | 'vertical'
  | 'horizontal'
  | 'overlay'
  | 'inline'
  | 'block'
  | 'grid'
  | 'auto';

export interface LayoutModifier {
  display?: Extract<LayoutModifierValue, 'block' | 'inline' | 'grid' | 'overlay'>;
  direction?: Extract<LayoutModifierValue, 'vertical' | 'horizontal' | 'overlay'>;
  alignment?: Extract<LayoutModifierValue, 'leading' | 'center' | 'trailing' | 'stretch'>;
  distribution?: Extract<LayoutModifierValue, 'leading' | 'center' | 'trailing' | 'spaceBetween' | 'spaceAround'>;
  gap?: Extract<LayoutModifierValue, 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'>;
  columns?: number | 'auto';
  priority?: number;
  scrollAxis?: Extract<LayoutModifierValue, 'vertical' | 'horizontal'> | 'both';
}

export interface AccessibilityModifier {
  role?: string;
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  hidden?: boolean;
  live?: 'off' | 'polite' | 'assertive';
  controls?: string;
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}

export interface FocusScopeModifier {
  id: string;
  trap?: boolean;
  restore?: boolean;
  order?: string[];
}

export type ShortcutKeyModifier = 'cmd' | 'ctrl' | 'alt' | 'shift' | 'meta';

export interface ShortcutModifier {
  key: string;
  modifiers?: ShortcutKeyModifier[];
  command: string;
  when?: string;
}

export interface PermissionModifier {
  action: string;
  resource?: string;
  fallback?: 'hide' | 'disable' | 'readonly' | 'reject';
}

export interface PresentationModifier {
  surface?: 'window' | 'tab' | 'route' | 'modal' | 'sheet' | 'fullscreen';
  mode?: 'inline' | 'modal' | 'popover' | 'sheet' | 'fullscreen';
  placement?: 'leading' | 'trailing' | 'top' | 'bottom' | 'center';
  priority?: number;
}

export interface MotionModifier {
  preset?: string;
  enter?: string;
  exit?: string;
  update?: string;
  reduceMotion?: 'respect' | 'force' | 'none';
}

export interface NodeModifiers {
  themeScope?: string;
  i18nKey?: string;
  layout?: LayoutModifier;
  accessibility?: AccessibilityModifier;
  focusScope?: string | FocusScopeModifier;
  shortcut?: ShortcutModifier | ShortcutModifier[];
  permission?: PermissionModifier;
  presentation?: PresentationModifier;
  motion?: MotionModifier;
  testId?: string;
}

export type DeclarativeUIDiagnosticSeverity = 'error' | 'warning' | 'info';
export type DeclarativeUIDiagnosticStage =
  | 'node-normalize'
  | 'slot-validate'
  | 'event-bind'
  | 'effect-dispatch';

export interface DeclarativeUIDiagnostic {
  nodeId: string;
  type: UINodeType;
  path: string;
  stage: DeclarativeUIDiagnosticStage;
  severity: DeclarativeUIDiagnosticSeverity;
  code: string;
  message: string;
  suggestion?: string;
  details?: unknown;
}

export interface SlotSchemaEntry {
  type?: UINodeType | ReadonlyArray<UINodeType>;
  required?: boolean;
  multiple?: boolean;
  part?: string;
  role?: string;
  description?: string;
}

export type SlotSchema = Record<string, SlotSchemaEntry>;

export interface UINode {
  id: string;
  type: UINodeType;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: NodeBindings;
  events?: NodeEvents;
  themeScope?: string;
  modifiers?: NodeModifiers;
  children?: UINode[];
}

export interface UINodeInput {
  id: string;
  type: UINodeType;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: NodeBindings;
  events?: NodeEvents;
  themeScope?: string;
  modifiers?: NodeModifiers;
  children?: ReadonlyArray<UINode | UINodeInput>;
}

export type EffectType = 'ui-effect' | 'runtime-effect' | 'telemetry-effect';
export type EffectDispatchPhase = 'render' | 'commit' | 'event' | 'background';

export interface EffectDescriptor {
  id: string;
  type: EffectType;
  action: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

export interface EffectDispatchContext {
  node: UINode;
  eventName?: string;
  phase: EffectDispatchPhase;
}

export interface EventHandlerContext {
  node: UINode;
  eventName: string;
  payload?: unknown;
  phase: EffectDispatchPhase;
}

export interface EventHandlerResult {
  effects?: EffectDescriptor[];
  nextState?: NodeMap;
}

export type EventHandler = (context: EventHandlerContext) => EventHandlerResult | Promise<EventHandlerResult | void> | void;
export type EffectExecutor = (
  effect: EffectDescriptor,
  context: EffectDispatchContext
) => Promise<unknown> | unknown;
