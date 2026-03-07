import { createError } from '../../shared/errors';
import type { ThemeTokenLayers } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const asRecord = (value: unknown, field: string): Record<string, unknown> => {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    throw createError('THEME_LOAD_FAILED', `Theme tokens field "${field}" must be an object`, {
      field,
      value
    });
  }
  return value;
};

export const asThemeTokenLayers = (tokens: Record<string, unknown>): ThemeTokenLayers => {
  const ref = asRecord(tokens.ref, 'ref');
  const sys = asRecord(tokens.sys, 'sys');
  const comp = asRecord(tokens.comp, 'comp');
  const motion = asRecord(tokens.motion, 'motion');
  const layout = asRecord(tokens.layout, 'layout');

  return { ref, sys, comp, motion, layout };
};

