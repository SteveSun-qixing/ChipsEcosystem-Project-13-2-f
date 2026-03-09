import { createError } from '../../shared/errors';

export interface ThemeContractComponent {
  name: string;
  scope: string;
  parts?: string[];
  states?: string[];
  tokens: string[];
}

export interface ThemeContract {
  version: string;
  components: ThemeContractComponent[];
}

export const validateThemeContractWithTokens = (
  themeId: string,
  contract: ThemeContract | undefined,
  variables: Record<string, unknown>
): void => {
  if (!contract) {
    return;
  }

  const missing: Array<{ component: string; token: string; key: string }> = [];

  for (const component of contract.components) {
    const baseName = component.name;
    for (const token of component.tokens) {
      const key = token.startsWith('chips.') ? token : `chips.comp.${baseName}.${token}`;
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
  contract: ThemeContract | undefined,
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
  if (!contract) {
    return { contracts: {} };
  }

  const entries: Array<[string, { scope: string; parts: string[]; states: string[]; tokens: string[] }]> = [];

  for (const component of contract.components) {
    const name = component.name;
    if (componentFilter && componentFilter !== name) {
      continue;
    }
    const tokens = component.tokens.map((token) => (token.startsWith('chips.') ? token : `chips.comp.${name}.${token}`));
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
