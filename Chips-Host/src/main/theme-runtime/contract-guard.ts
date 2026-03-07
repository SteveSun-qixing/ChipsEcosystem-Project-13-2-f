import { createError } from '../../shared/errors';
import type { ThemeTokenLayers } from './types';

interface ThemeContractComponent {
  name: string;
  scope: string;
  parts?: string[];
  states?: string[];
  tokens: string[];
}

interface ThemeContract {
  version: string;
  components: ThemeContractComponent[];
}

const DEFAULT_THEME_CONTRACT: ThemeContract = {
  version: '1.0.0',
  components: [
    {
      name: 'button',
      scope: 'comp',
      parts: [],
      states: [],
      tokens: ['background', 'color']
    }
  ]
};

const getThemeContract = (themeId: string): ThemeContract | undefined => {
  if (themeId === 'chips-official.default-theme') {
    return DEFAULT_THEME_CONTRACT;
  }
  return undefined;
};

export const validateThemeContractWithTokens = (
  themeId: string,
  layers: ThemeTokenLayers,
  variables: Record<string, unknown>
): void => {
  const contract = getThemeContract(themeId);
  if (!contract) {
    return;
  }

  const missing: Array<{ component: string; token: string; key: string }> = [];

  for (const component of contract.components) {
    const baseName = component.name;
    for (const token of component.tokens) {
      const key = `chips.comp.${baseName}.${token}`;
      if (!(key in variables)) {
        missing.push({ component: baseName, token, key });
      }
    }
  }

  if (missing.length > 0) {
    throw createError('THEME_CONTRACT_INVALID', 'Theme contract validation failed: missing component tokens', {
      themeId,
      missing
    });
  }
};

export const buildThemeContractsView = (
  themeId: string,
  componentFilter?: string
): {
  contracts: {
    [component: string]: {
      scope: string;
      parts: string[];
      states: string[];
      tokens: string[];
    };
  };
} => {
  const contract = getThemeContract(themeId);
  if (!contract) {
    return { contracts: {} };
  }

  const entries: Array<[string, { scope: string; parts: string[]; states: string[]; tokens: string[] }]> = [];

  for (const component of contract.components) {
    const name = component.name;
    if (componentFilter && componentFilter !== name) {
      continue;
    }
    const tokens = component.tokens.map((token) => `chips.comp.${name}.${token}`);
    entries.push([
      name,
      {
        scope: component.scope,
        parts: component.parts ?? [],
        states: component.states ?? [],
        tokens
      }
    ]);
  }

  return {
    contracts: Object.fromEntries(entries)
  };
};

