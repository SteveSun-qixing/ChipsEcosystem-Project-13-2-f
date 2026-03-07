import { describe, expect, it } from 'vitest';
import { mergeThemeLayers, resolveThemeFromLayers } from '../../src/main/theme-runtime/resolve-algorithm';
import { buildThemeScopeChain } from '../../src/main/theme-runtime/scope-chain';
import { toRenderThemeSnapshot } from '../../src/main/theme-runtime/render-bridge';
import { resolveNodeProps, type ThemeSnapshot as RenderThemeSnapshot } from '../../packages/unified-rendering/src';

describe('Theme Runtime', () => {
  it('resolves five-layer tokens and builds component token map', () => {
    const themeTokens: Record<string, unknown> = {
      ref: {
        white: '#ffffff'
      },
      sys: {
        text: {
          primary: '{white}'
        }
      },
      comp: {
        chips: {
          comp: {
            button: {
              background: '{white}'
            },
            dialog: {
              surface: '{white}'
            }
          }
        }
      },
      motion: {},
      layout: {}
    };

    const layers = mergeThemeLayers([{ id: 'chips.test.theme', tokens: themeTokens }]);
    const resolved = resolveThemeFromLayers(layers);

    expect(resolved.variables.white).toBe('#ffffff');
    expect(resolved.variables['text.primary']).toBe('#ffffff');
    expect(resolved.variables['chips.comp.button.background']).toBe('#ffffff');
    expect(resolved.variables['chips.comp.dialog.surface']).toBe('#ffffff');

    expect(resolved.componentTokens.button['chips.comp.button.background']).toBe('#ffffff');
    expect(resolved.componentTokens.dialog['chips.comp.dialog.surface']).toBe('#ffffff');
  });

  it('builds theme scope chain from context', () => {
    const chain = buildThemeScopeChain({
      globalId: null,
      appId: 'main-app',
      boxId: 'inbox',
      compositeCardId: 'overview',
      baseCardId: 'card-1',
      componentId: 'button-primary'
    });

    expect(chain.scopes).toEqual([
      'global',
      'app:main-app',
      'box:inbox',
      'composite-card:overview',
      'base-card:card-1',
      'component:button-primary'
    ]);
  });

  it('bridges resolved theme into unified rendering ThemeSnapshot', () => {
    const themeTokens: Record<string, unknown> = {
      ref: {
        white: '#ffffff'
      },
      sys: {
        text: {
          primary: '{white}'
        }
      },
      comp: {},
      motion: {},
      layout: {}
    };

    const layers = mergeThemeLayers([{ id: 'chips.test.theme', tokens: themeTokens }]);
    const resolved = resolveThemeFromLayers(layers);

    const snapshot: RenderThemeSnapshot = toRenderThemeSnapshot('chips.test.theme', resolved);
    const props = {
      tone: 'token.text.primary',
      other: 'value'
    };

    const resolvedProps = resolveNodeProps(props, snapshot, undefined);
    expect(resolvedProps.tone).toBe('#ffffff');
    expect(resolvedProps.other).toBe('value');
  });
});

