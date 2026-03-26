import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CSS_URL_PATTERN = /url\(\s*(?:'([^']+)'|"([^"]+)"|([^'")]+))\s*\)/gi;

const splitCssUrlSuffix = (input: string): { pathname: string; suffix: string } => {
  const queryIndex = input.indexOf('?');
  const hashIndex = input.indexOf('#');
  const splitIndex = [queryIndex, hashIndex].filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? -1;

  if (splitIndex < 0) {
    return { pathname: input, suffix: '' };
  }

  return {
    pathname: input.slice(0, splitIndex),
    suffix: input.slice(splitIndex),
  };
};

const shouldRewriteCssUrl = (value: string): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (normalized.startsWith('#') || normalized.startsWith('/')) {
    return false;
  }

  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(normalized)) {
    return false;
  }

  if (/^(?:data|blob|file):/i.test(normalized)) {
    return false;
  }

  return !path.isAbsolute(normalized);
};

export const rewriteThemeCssAssetUrls = (cssText: string, cssFilePath: string): string => {
  if (!cssText.trim()) {
    return cssText;
  }

  const cssDir = path.dirname(cssFilePath);

  return cssText.replace(CSS_URL_PATTERN, (match, singleQuoted, doubleQuoted, bareValue) => {
    const rawValue = String(singleQuoted ?? doubleQuoted ?? bareValue ?? '').trim();
    if (!shouldRewriteCssUrl(rawValue)) {
      return match;
    }

    const { pathname, suffix } = splitCssUrlSuffix(rawValue);
    const resolvedPath = path.resolve(cssDir, pathname);
    return `url("${pathToFileURL(resolvedPath).toString()}${suffix}")`;
  });
};
