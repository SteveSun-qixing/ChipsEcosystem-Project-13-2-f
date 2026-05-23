import { createError } from '../../../src/shared/errors';
import { createRenderDiagnosticForNode } from './diagnostics';
import type { NormalizedNode, RenderNodeDiagnostic, ThemeSnapshot } from './types';

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

export const collectThemeDiagnosticsForNode = (node: NormalizedNode, theme: ThemeSnapshot): RenderNodeDiagnostic[] => {
  const diagnostics: RenderNodeDiagnostic[] = [];
  for (const [prop, value] of Object.entries(node.props)) {
    if (typeof value !== 'string' || !value.startsWith('token.')) {
      continue;
    }
    const tokenName = value.slice('token.'.length);
    if (resolveScopedToken(theme, node.themeScope, tokenName) !== undefined) {
      continue;
    }
    diagnostics.push(
      createRenderDiagnosticForNode(node, {
        stage: 'theme-resolve',
        severity: 'P1',
        code: 'RENDER_THEME_TOKEN_NOT_FOUND',
        message: `Token is not defined: ${tokenName}`,
        suggestion: 'Add this token to the active theme snapshot or replace the prop with an existing semantic token.',
        details: {
          prop,
          token: tokenName,
          scope: node.themeScope,
          themeId: theme.id
        }
      })
    );
  }
  return diagnostics;
};

export const collectThemeDiagnostics = (root: NormalizedNode, theme: ThemeSnapshot): RenderNodeDiagnostic[] => {
  const diagnostics: RenderNodeDiagnostic[] = [];
  const visit = (node: NormalizedNode): void => {
    diagnostics.push(...collectThemeDiagnosticsForNode(node, theme));
    for (const child of node.children) {
      visit(child);
    }
  };
  visit(root);
  return diagnostics;
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
