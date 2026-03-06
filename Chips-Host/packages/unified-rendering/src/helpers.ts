import crypto from 'node:crypto';
import { createId } from '../../../src/shared/utils';

export const createNodeId = (provided: string | undefined, path: string): string => {
  if (typeof provided === 'string' && provided.trim().length > 0) {
    return provided;
  }
  return `${path}-${createId().slice(0, 8)}`;
};

const stableSerializeInternal = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerializeInternal(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerializeInternal(record[key])}`).join(',')}}`;
};

export const stableSerialize = (value: unknown): string => stableSerializeInternal(value);

export const hashSemanticTree = (value: unknown): string => {
  const serialized = stableSerialize(value);
  return crypto.createHash('sha256').update(serialized).digest('hex');
};

export const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const toRounded = (value: number, digits = 3): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
