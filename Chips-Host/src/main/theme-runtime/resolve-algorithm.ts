import { createError } from '../../shared/errors';
import type { ThemeTokenLayers, ThemeSnapshot, ResolvedTheme } from './types';
import { asThemeTokenLayers } from './token-layers';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const mergeLayer = (base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = result[key];
    if (isRecord(current) && isRecord(value)) {
      result[key] = mergeLayer(current, value);
      continue;
    }
    result[key] = value;
  }
  return result;
};

const flattenLayer = (layer: Record<string, unknown>, prefix?: string): Record<string, unknown> => {
  const flat: Record<string, unknown> = {};
  const walk = (node: unknown, path: string[]): void => {
    if (!isRecord(node)) {
      const key = path.join('.');
      flat[key] = node;
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      walk(v, [...path, k]);
    }
  };
  walk(layer, prefix ? [prefix] : []);
  return flat;
};

const resolveReference = (
  raw: unknown,
  primary: Record<string, unknown>,
  fallback: Record<string, unknown>[]
): unknown => {
  if (typeof raw !== 'string') {
    return raw;
  }
  const match = raw.match(/^\{(.+)\}$/);
  if (!match) {
    return raw;
  }
  const path = match[1]!;
  if (path in primary) {
    return primary[path];
  }
  for (const layer of fallback) {
    if (path in layer) {
      return layer[path];
    }
  }
  throw createError('THEME_TOKEN_MISSING', `Referenced token not found: ${path}`, { path });
};

const resolveLayerWithRefs = (
  layer: Record<string, unknown>,
  primary: Record<string, unknown>,
  fallback: Record<string, unknown>[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(layer)) {
    try {
      result[key] = resolveReference(value, primary, fallback);
    } catch (error) {
      throw createError(
        'THEME_TOKEN_MISSING',
        `Token "${key}" references missing token`,
        { key, value },
        false
      );
    }
  }
  return result;
};

const buildComponentTokens = (variables: Record<string, unknown>): Record<string, Record<string, unknown>> => {
  const components: Record<string, Record<string, unknown>> = {};

  for (const [key, value] of Object.entries(variables)) {
    if (!key.startsWith('chips.comp.')) {
      continue;
    }

    const rest = key.slice('chips.comp.'.length);
    const [componentName, ...tokenParts] = rest.split('.');
    if (!componentName || tokenParts.length === 0) {
      continue;
    }

    const bucket = components[componentName] ?? (components[componentName] = {});
    bucket[key] = value;
  }

  return components;
};

export const mergeThemeLayers = (themes: Array<{ id: string; tokens: Record<string, unknown> }>): ThemeTokenLayers => {
  let ref: Record<string, unknown> = {};
  let sys: Record<string, unknown> = {};
  let comp: Record<string, unknown> = {};
  let motion: Record<string, unknown> = {};
  let layout: Record<string, unknown> = {};

  for (const theme of themes) {
    const layers = asThemeTokenLayers(theme.tokens);
    ref = mergeLayer(ref, layers.ref);
    sys = mergeLayer(sys, layers.sys);
    comp = mergeLayer(comp, layers.comp);
    motion = mergeLayer(motion, layers.motion);
    layout = mergeLayer(layout, layers.layout);
  }

  return { ref, sys, comp, motion, layout };
};

export const resolveThemeFromLayers = (layers: ThemeTokenLayers): ResolvedTheme => {
  const refFlat = flattenLayer(layers.ref);
  const sysFlat = flattenLayer(layers.sys);
  const compFlat = flattenLayer(layers.comp);
  const motionFlat = flattenLayer(layers.motion);
  const layoutFlat = flattenLayer(layers.layout);

  // 在默认主题未完整分层的情况下允许直接引用 ref 层的键名（例如 {ref.white}），
  // 也允许像 {bg} 这样简单引用在 sys 层内未预先定义的键。
  const sysResolved = resolveLayerWithRefs(sysFlat, refFlat, [refFlat]);
  const compResolved = resolveLayerWithRefs(compFlat, sysResolved, [refFlat, sysResolved]);
  const motionResolved = resolveLayerWithRefs(motionFlat, refFlat, [refFlat, sysResolved]);
  const layoutResolved = resolveLayerWithRefs(layoutFlat, refFlat, [refFlat, sysResolved]);

  const variables: Record<string, unknown> = {
    ...refFlat,
    ...sysResolved,
    ...compResolved,
    ...motionResolved,
    ...layoutResolved
  };

  const componentTokens = buildComponentTokens(variables);

  return {
    variables,
    componentTokens,
    diagnostics: []
  };
};

export const buildThemeSnapshot = (id: string, tokens: Record<string, unknown>): ThemeSnapshot => {
  const layers = asThemeTokenLayers(tokens);
  return {
    id,
    layers,
    diagnostics: []
  };
};
