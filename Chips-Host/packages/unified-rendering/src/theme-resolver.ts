import { createError } from '../../../src/shared/errors';
import type { NormalizedNode, ThemeSnapshot } from './types';

const resolveScopedToken = (theme: ThemeSnapshot, scope: string | undefined, tokenName: string): unknown => {
  if (scope && theme.scopes?.[scope] && tokenName in theme.scopes[scope]!) {
    return theme.scopes[scope]![tokenName];
  }
  return theme.tokens[tokenName];
};

export const resolveNodeProps = (
  props: Record<string, unknown>,
  theme: ThemeSnapshot,
  scope: string | undefined
): Record<string, unknown> => {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.startsWith('token.')) {
      const tokenName = value.slice('token.'.length);
      const tokenValue = resolveScopedToken(theme, scope, tokenName);
      if (tokenValue === undefined) {
        throw createError('RENDER_THEME_TOKEN_NOT_FOUND', `Token is not defined: ${tokenName}`, {
          token: tokenName,
          scope
        });
      }
      resolved[key] = tokenValue;
      continue;
    }
    resolved[key] = value;
  }
  return resolved;
};

const resolveNode = (node: NormalizedNode, theme: ThemeSnapshot): NormalizedNode => {
  return {
    ...node,
    props: resolveNodeProps(node.props, theme, node.themeScope),
    children: node.children.map((child) => resolveNode(child, theme))
  };
};

export const resolveThemeForTree = (root: NormalizedNode, theme: ThemeSnapshot): NormalizedNode => {
  return resolveNode(root, theme);
};
