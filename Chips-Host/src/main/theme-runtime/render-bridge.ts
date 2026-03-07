import type { ThemeSnapshot as RenderThemeSnapshot } from '../../../packages/unified-rendering/src';
import type { ResolvedTheme } from './types';

/**
 * 将 Theme Runtime 解析结果转换为统一渲染层可消费的 ThemeSnapshot。
 *
 * - `id` 使用当前主题 ID；
 * - `tokens` 直接采用五层解析后的扁平变量表；
 * - `scopes` 暂不在 Host 侧细分，由上层按需要构造局部作用域覆盖。
 */
export const toRenderThemeSnapshot = (themeId: string, resolved: ResolvedTheme): RenderThemeSnapshot => {
  return {
    id: themeId,
    tokens: { ...resolved.variables },
    scopes: {}
  };
};

