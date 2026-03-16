import type {
  BasecardConfigRecord,
  BasecardDescriptor,
  EditorValidationResult,
} from '../contracts';
import {
  renderBasecardEditor,
  renderBasecardView,
} from '../../../../Chips-BaseCardPlugin/image-BCP/src/index';
import type { BasecardConfig } from '../../../../Chips-BaseCardPlugin/image-BCP/src/schema/card-config';
import {
  defaultBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from '../../../../Chips-BaseCardPlugin/image-BCP/src/schema/card-config';
import { getInternalResourcePaths } from '../../../../Chips-BaseCardPlugin/image-BCP/src/shared/utils';

function normalizeImageConfig(input: BasecardConfigRecord): BasecardConfigRecord {
  return normalizeBasecardConfig(input) as unknown as BasecardConfigRecord;
}

function validateImageConfig(config: BasecardConfigRecord): EditorValidationResult {
  const normalizedConfig = normalizeBasecardConfig(config);
  return validateBasecardConfig(normalizedConfig);
}

export const imageBasecardDescriptor: BasecardDescriptor = {
  pluginId: 'chips.basecard.image',
  cardType: 'base.image',
  displayName: '图片基础卡片',
  aliases: ['ImageCard'],
  commitDebounceMs: 260,
  createInitialConfig() {
    return normalizeBasecardConfig(
      defaultBasecardConfig as unknown as BasecardConfigRecord,
    ) as unknown as BasecardConfigRecord;
  },
  normalizeConfig(input) {
    return normalizeImageConfig(input);
  },
  validateConfig(config) {
    return validateImageConfig(config);
  },
  collectResourcePaths(config) {
    return getInternalResourcePaths(normalizeBasecardConfig(config));
  },
  renderView(ctx) {
    return renderBasecardView({
      container: ctx.container,
      config: ctx.config as unknown as BasecardConfig,
      themeCssText: ctx.themeCssText,
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
    });
  },
  renderEditor(ctx) {
    return renderBasecardEditor({
      container: ctx.container,
      initialConfig: normalizeBasecardConfig(ctx.initialConfig) as unknown as BasecardConfig,
      onChange(nextConfig) {
        ctx.onChange(nextConfig as unknown as BasecardConfigRecord);
      },
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
      importResource: ctx.importResource,
      deleteResource: ctx.deleteResource,
    });
  },
};
