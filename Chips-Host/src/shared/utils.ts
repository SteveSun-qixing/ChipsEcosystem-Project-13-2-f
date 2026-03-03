import crypto from 'node:crypto';

export const createId = (): string => crypto.randomUUID();

export const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export const now = (): number => Date.now();

export const deepClone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

export const ensureArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};
