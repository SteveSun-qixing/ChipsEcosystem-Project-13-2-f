export const SEMANTIC_PRIMITIVE_TYPES = ['View', 'Stack', 'Grid', 'Form', 'List'] as const;

export type SemanticPrimitiveType = (typeof SEMANTIC_PRIMITIVE_TYPES)[number];
export type UINodeType = SemanticPrimitiveType | (string & {});
export type NodeMap = Record<string, unknown>;
export type NodeBindings = Record<string, string>;
export type NodeEvents = Record<string, string>;

export interface UINode {
  id: string;
  type: UINodeType;
  props?: NodeMap;
  state?: NodeMap;
  bindings?: NodeBindings;
  events?: NodeEvents;
  themeScope?: string;
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
