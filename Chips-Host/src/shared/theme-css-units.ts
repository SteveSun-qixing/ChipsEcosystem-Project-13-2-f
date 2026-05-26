export const DEFAULT_CHIPS_LAYOUT_BASE_WIDTH = 1024;

export interface ThemeCssUnitOptions {
  baseWidth?: number;
}

const CPX_LENGTH_PATTERN = /(-?(?:\d+\.?\d*|\.\d+))cpx\b/g;

const getBaseWidth = (options?: ThemeCssUnitOptions): number => {
  const candidate = options?.baseWidth;
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0
    ? candidate
    : DEFAULT_CHIPS_LAYOUT_BASE_WIDTH;
};

const formatCssNumber = (value: number): string => {
  if (!Number.isFinite(value) || Math.abs(value) < 0.000000005) {
    return '0';
  }

  return value.toFixed(8).replace(/\.?0+$/, '');
};

const convertCpxSegment = (segment: string, baseWidth: number): string => {
  return segment.replace(CPX_LENGTH_PATTERN, (_match, numeric: string) => {
    const cpxValue = Number(numeric);
    if (!Number.isFinite(cpxValue)) {
      return _match;
    }

    const viewportWidthValue = cpxValue * (100 / baseWidth);
    return `${formatCssNumber(viewportWidthValue)}vw`;
  });
};

const readQuotedCssRange = (cssText: string, startIndex: number): number => {
  const quote = cssText[startIndex];
  let index = startIndex + 1;
  while (index < cssText.length) {
    const char = cssText[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    index += 1;
    if (char === quote) {
      break;
    }
  }
  return index;
};

const readCommentRange = (cssText: string, startIndex: number): number => {
  const endIndex = cssText.indexOf('*/', startIndex + 2);
  return endIndex >= 0 ? endIndex + 2 : cssText.length;
};

const readUrlFunctionRange = (cssText: string, startIndex: number): number => {
  let index = startIndex + 4;
  while (index < cssText.length) {
    const char = cssText[index];
    if (char === '"' || char === "'") {
      index = readQuotedCssRange(cssText, index);
      continue;
    }
    if (char === '\\') {
      index += 2;
      continue;
    }
    index += 1;
    if (char === ')') {
      break;
    }
  }
  return index;
};

const startsWithUrlFunction = (cssText: string, index: number): boolean => {
  return cssText.slice(index, index + 4).toLowerCase() === 'url(';
};

export const convertCpxToViewportLength = (
  value: string,
  options?: ThemeCssUnitOptions
): string => {
  const baseWidth = getBaseWidth(options);
  let result = '';
  let segmentStart = 0;
  let index = 0;

  while (index < value.length) {
    const char = value[index];
    let protectedEnd: number | null = null;

    if (char === '"' || char === "'") {
      protectedEnd = readQuotedCssRange(value, index);
    } else if (char === '/' && value[index + 1] === '*') {
      protectedEnd = readCommentRange(value, index);
    } else if (startsWithUrlFunction(value, index)) {
      protectedEnd = readUrlFunctionRange(value, index);
    }

    if (protectedEnd !== null) {
      result += convertCpxSegment(value.slice(segmentStart, index), baseWidth);
      result += value.slice(index, protectedEnd);
      index = protectedEnd;
      segmentStart = index;
      continue;
    }

    index += 1;
  }

  result += convertCpxSegment(value.slice(segmentStart), baseWidth);
  return result;
};

export const normalizeThemeCssForBrowser = (
  cssText: string,
  options?: ThemeCssUnitOptions
): string => {
  return convertCpxToViewportLength(cssText, options);
};

export const normalizeThemeTokenValueForBrowser = (
  value: unknown,
  options?: ThemeCssUnitOptions
): unknown => {
  return typeof value === 'string' ? convertCpxToViewportLength(value, options) : value;
};

export const createThemeCssVariableDeclarations = (
  tokens: Record<string, unknown>,
  options?: ThemeCssUnitOptions
): string[] => {
  return Object.entries(tokens)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => {
      const browserValue = normalizeThemeTokenValueForBrowser(value, options);
      return `  --${key.replaceAll('.', '-')}: ${String(browserValue)};`;
    });
};
