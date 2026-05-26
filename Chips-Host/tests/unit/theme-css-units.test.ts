import { describe, expect, it } from 'vitest';
import {
  convertCpxToViewportLength,
  createThemeCssVariableDeclarations,
  normalizeThemeCssForBrowser,
  normalizeThemeTokenValueForBrowser
} from '../../src/shared/theme-css-units';

describe('theme CSS unit normalization', () => {
  it('converts Chips cpx lengths to viewport-relative browser CSS lengths', () => {
    expect(convertCpxToViewportLength('160cpx')).toBe('15.625vw');
    expect(convertCpxToViewportLength('12cpx')).toBe('1.171875vw');
    expect(convertCpxToViewportLength('-8.5cpx')).toBe('-0.83007813vw');
    expect(convertCpxToViewportLength('.5cpx')).toBe('0.04882813vw');
  });

  it('keeps non-cpx values and protected CSS text unchanged', () => {
    const css = [
      '.demo {',
      '  width: calc(14px + 12cpx);',
      '  background-image: url("/assets/icon-12cpx.png");',
      '  content: "label 12cpx";',
      '  --literal: 12px;',
      '}',
      '/* comment 12cpx */'
    ].join('\n');

    expect(normalizeThemeCssForBrowser(css)).toContain('width: calc(14px + 1.171875vw);');
    expect(normalizeThemeCssForBrowser(css)).toContain('url("/assets/icon-12cpx.png")');
    expect(normalizeThemeCssForBrowser(css)).toContain('content: "label 12cpx";');
    expect(normalizeThemeCssForBrowser(css)).toContain('/* comment 12cpx */');
    expect(normalizeThemeCssForBrowser(css)).toContain('--literal: 12px;');
  });

  it('normalizes string token values and leaves non-string token values intact', () => {
    expect(normalizeThemeTokenValueForBrowser('calc(14px + 12cpx)')).toBe('calc(14px + 1.171875vw)');
    expect(normalizeThemeTokenValueForBrowser(12)).toBe(12);
    expect(normalizeThemeTokenValueForBrowser({ value: '12cpx' })).toEqual({ value: '12cpx' });
  });

  it('creates browser-safe CSS variable declarations from theme tokens', () => {
    expect(
      createThemeCssVariableDeclarations({
        'chips.layout.size.navigation.primary.min': '160cpx',
        'chips.layout.gap.md': '12cpx',
        'chips.sys.opacity.disabled': 0.48,
        'chips.private.object': { value: '12cpx' },
      })
    ).toEqual([
      '  --chips-layout-size-navigation-primary-min: 15.625vw;',
      '  --chips-layout-gap-md: 1.171875vw;',
      '  --chips-sys-opacity-disabled: 0.48;',
    ]);
  });
});
