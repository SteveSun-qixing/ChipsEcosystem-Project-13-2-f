import type { BasecardDescriptor, BasecardConfigRecord } from '../contracts';
import { renderBasecardEditor, renderBasecardView } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/index';
import type { BasecardConfig } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/schema/card-config';
import {
  defaultBasecardConfig,
  normalizeBasecardConfig,
  validateBasecardConfig,
} from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/schema/card-config';

const INITIAL_RICH_TEXT_BODY = '<p>123456789</p>';

function normalizeRichtextConfig(input: BasecardConfigRecord): BasecardConfigRecord {
  return normalizeBasecardConfig(input);
}

export const richtextBasecardDescriptor: BasecardDescriptor = {
  pluginId: 'chips.basecard.richtext',
  cardType: 'base.richtext',
  displayName: '富文本基础卡片',
  aliases: ['RichTextCard'],
  commitDebounceMs: 260,
  createInitialConfig() {
    return normalizeRichtextConfig({
      ...defaultBasecardConfig,
      body: INITIAL_RICH_TEXT_BODY,
    });
  },
  normalizeConfig(input) {
    return normalizeRichtextConfig(input);
  },
  validateConfig(config) {
    return validateBasecardConfig(normalizeBasecardConfig(config));
  },
  renderView(ctx) {
    return renderBasecardView({
      container: ctx.container,
      config: normalizeBasecardConfig(ctx.config) as BasecardConfig,
      themeCssText: ctx.themeCssText,
      resolveResourceUrl: ctx.resolveResourceUrl,
      releaseResourceUrl: ctx.releaseResourceUrl,
    });
  },
  renderEditor(ctx) {
    return renderBasecardEditor({
      container: ctx.container,
      initialConfig: normalizeBasecardConfig(ctx.initialConfig) as BasecardConfig,
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
