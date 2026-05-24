import { createError } from '../../shared/errors';
import type { ThemeTokenLayers, ThemeSnapshot, ResolvedTheme } from './types';
import { asThemeTokenLayers } from './token-layers';
import { buildThemeDiagnosticSummary } from './diagnostics';

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

const createTokenMissingError = (key: string, value: unknown, path: string) => {
  return createError(
    'THEME_TOKEN_MISSING',
    `Token "${key}" references missing token: ${path}`,
    { key, value, path },
    false
  );
};

const createTokenCycleError = (key: string, value: unknown, path: string[]) => {
  return createError(
    'THEME_TOKEN_CYCLE',
    `Token "${key}" has circular token references`,
    { key, value, path },
    false
  );
};

const resolveTokenValue = (
  key: string,
  layer: Record<string, unknown>,
  fallback: Record<string, unknown>[],
  resolved: Record<string, unknown>,
  stack: string[]
): unknown => {
  if (key in resolved) {
    return resolved[key];
  }

  if (!(key in layer)) {
    throw createTokenMissingError(stack[stack.length - 1] ?? key, undefined, key);
  }

  const raw = layer[key];
  if (typeof raw !== 'string') {
    resolved[key] = raw;
    return raw;
  }

  const match = raw.match(/^\{([^{}]+)\}$/);
  if (!match) {
    resolved[key] = raw;
    return raw;
  }

  const path = match[1]!.trim();
  if (path in layer) {
    if (stack.includes(path)) {
      throw createTokenCycleError(key, raw, [...stack, path]);
    }
    const value = resolveTokenValue(path, layer, fallback, resolved, [...stack, path]);
    resolved[key] = value;
    return value;
  }

  for (const fallbackLayer of fallback) {
    if (path in fallbackLayer) {
      const value = fallbackLayer[path];
      resolved[key] = value;
      return value;
    }
  }

  throw createTokenMissingError(key, raw, path);
};

const resolveLayerWithRefs = (
  layer: Record<string, unknown>,
  fallback: Record<string, unknown>[]
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(layer)) {
    try {
      result[key] = resolveTokenValue(key, layer, fallback, result, [key]);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      throw createError('THEME_TOKEN_MISSING', `Token "${key}" references missing token`, { key, value }, false);
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

  // motion/layout are shared runtime layers that component tokens may reference.
  // They cannot depend on component tokens, so resolve them before comp.
  const refResolved = resolveLayerWithRefs(refFlat, []);
  const sysResolved = resolveLayerWithRefs(sysFlat, [refResolved]);
  const motionResolved = resolveLayerWithRefs(motionFlat, [refResolved, sysResolved]);
  const layoutResolved = resolveLayerWithRefs(layoutFlat, [refResolved, sysResolved]);
  const compResolved = resolveLayerWithRefs(compFlat, [refResolved, sysResolved, motionResolved, layoutResolved]);

  const variables: Record<string, unknown> = {
    ...refResolved,
    ...sysResolved,
    ...compResolved,
    ...motionResolved,
    ...layoutResolved
  };

  const componentTokens = buildComponentTokens(variables);

  return {
    variables,
    componentTokens,
    diagnostics: [],
    summary: buildThemeDiagnosticSummary([])
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
