import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { rewriteThemeCssAssetUrls } from '../../src/main/theme-runtime/css-assets';

describe('rewriteThemeCssAssetUrls', () => {
  it('rewrites relative theme asset urls to absolute file urls', () => {
    const cssFilePath = '/tmp/chips-theme/dist/theme.css';
    const cssText = '@font-face { src: url("./icons/variablefont/test.woff2") format("woff2"); }';

    const rewritten = rewriteThemeCssAssetUrls(cssText, cssFilePath);

    expect(rewritten).toContain(pathToFileURL('/tmp/chips-theme/dist/icons/variablefont/test.woff2').toString());
  });

  it('keeps absolute and data urls unchanged', () => {
    const cssFilePath = '/tmp/chips-theme/dist/theme.css';
    const dataUrl = 'data:font/woff2;base64,AAAA';
    const fileUrl = pathToFileURL(path.join('/tmp', 'asset.woff2')).toString();
    const cssText = [
      `@font-face { src: url("${dataUrl}"); }`,
      `@font-face { src: url("${fileUrl}"); }`,
      '@font-face { src: url("/static/asset.woff2"); }',
    ].join('\n');

    const rewritten = rewriteThemeCssAssetUrls(cssText, cssFilePath);

    expect(rewritten).toContain(dataUrl);
    expect(rewritten).toContain(fileUrl);
    expect(rewritten).toContain('/static/asset.woff2');
  });

  it('preserves query strings and hash suffixes when rewriting', () => {
    const cssFilePath = '/tmp/chips-theme/dist/theme.css';
    const cssText = '@font-face { src: url(./icons/font.woff2?v=1#hash) format("woff2"); }';

    const rewritten = rewriteThemeCssAssetUrls(cssText, cssFilePath);

    expect(rewritten).toContain(`${pathToFileURL('/tmp/chips-theme/dist/icons/font.woff2').toString()}?v=1#hash`);
  });
});
