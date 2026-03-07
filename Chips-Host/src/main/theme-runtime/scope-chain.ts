import { createError } from '../../shared/errors';
import type { ThemeScopeChain, ThemeScopeId } from './types';

export const THEME_SCOPE_ORDER_LOW_TO_HIGH: ThemeScopeId[] = [
  'global',
  'app',
  'box',
  'composite-card',
  'base-card',
  'component'
];

export const THEME_SCOPE_ORDER_HIGH_TO_LOW: ThemeScopeId[] = [...THEME_SCOPE_ORDER_LOW_TO_HIGH].reverse();

export interface ThemeScopeContext {
  globalId?: string | null;
  appId?: string | null;
  boxId?: string | null;
  compositeCardId?: string | null;
  baseCardId?: string | null;
  componentId?: string | null;
}

const buildScopeId = (kind: ThemeScopeId, id?: string | null): ThemeScopeId => {
  if (!id || kind === 'global') {
    return kind;
  }
  return `${kind}:${id}`;
};

export const buildThemeScopeChain = (context: ThemeScopeContext): ThemeScopeChain => {
  const scopes: ThemeScopeId[] = [];

  // 作用域从低权重到高权重依次加入，缺失层级跳过。
  scopes.push(buildScopeId('global', context.globalId));

  if (context.appId) {
    scopes.push(buildScopeId('app', context.appId));
  }

  if (context.boxId) {
    scopes.push(buildScopeId('box', context.boxId));
  }

  if (context.compositeCardId) {
    scopes.push(buildScopeId('composite-card', context.compositeCardId));
  }

  if (context.baseCardId) {
    scopes.push(buildScopeId('base-card', context.baseCardId));
  }

  if (context.componentId) {
    scopes.push(buildScopeId('component', context.componentId));
  }

  if (scopes.length > 6) {
    throw createError('THEME_CHAIN_TOO_DEEP', 'Theme scope chain exceeds 6 levels', {
      scopes
    });
  }

  return { scopes };
};

