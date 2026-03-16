import type { BasecardDescriptor, BasecardConfigRecord, EditorValidationResult } from '../contracts';
import { renderBasecardEditor, renderBasecardView } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/index';
import type { BasecardConfig } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/schema/card-config';
import { defaultBasecardConfig } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/schema/card-config';
import { sanitizeRichTextHtml } from '../../../../Chips-BaseCardPlugin/richtext-BCP/src/shared/utils';

const EMPTY_RICH_TEXT_BODY = '<p></p>';
const INITIAL_RICH_TEXT_BODY = '<p>123456789</p>';

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeRichtextHtmlForRuntime(html: string): string {
  if (typeof document !== 'undefined') {
    return sanitizeRichTextHtml(html);
  }

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function normalizeRichtextBody(input: BasecardConfigRecord): string {
  const rawBody = typeof input.body === 'string'
    ? input.body
    : typeof input.content_text === 'string'
      ? input.content_text
      : EMPTY_RICH_TEXT_BODY;

  const sanitized = sanitizeRichtextHtmlForRuntime(rawBody);
  return sanitized.trim().length > 0 ? sanitized : EMPTY_RICH_TEXT_BODY;
}

function hasMeaningfulRichtextContent(body: string): boolean {
  const sanitized = sanitizeRichtextHtmlForRuntime(body);
  const plainText = sanitized
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  if (plainText.length > 0) {
    return true;
  }

  return /<(img|video|audio|iframe|hr|table|ul|ol|blockquote|pre)\b/i.test(sanitized);
}

function normalizeRichtextConfig(input: BasecardConfigRecord, baseCardId: string): BasecardConfigRecord {
  return {
    ...defaultBasecardConfig,
    id: baseCardId,
    body: normalizeRichtextBody(input),
    locale: asNonEmptyString(input.locale) ?? defaultBasecardConfig.locale ?? 'zh-CN',
  };
}

function validateRichtextConfig(config: BasecardConfigRecord): EditorValidationResult {
  const body = typeof config.body === 'string' ? config.body : EMPTY_RICH_TEXT_BODY;
  const valid = hasMeaningfulRichtextContent(body);

  return {
    valid,
    errors: valid ? {} : {
      body: '正文内容不能为空',
    },
  };
}

export const richtextBasecardDescriptor: BasecardDescriptor = {
  pluginId: 'chips.basecard.richtext',
  cardType: 'base.richtext',
  displayName: '富文本基础卡片',
  aliases: ['RichTextCard'],
  commitDebounceMs: 260,
  createInitialConfig(baseCardId) {
    return normalizeRichtextConfig({
      ...defaultBasecardConfig,
      body: INITIAL_RICH_TEXT_BODY,
    }, baseCardId);
  },
  normalizeConfig: normalizeRichtextConfig,
  validateConfig: validateRichtextConfig,
  renderView(ctx) {
    return renderBasecardView({
      container: ctx.container,
      config: ctx.config as unknown as BasecardConfig,
      themeCssText: ctx.themeCssText,
    });
  },
  renderEditor(ctx) {
    return renderBasecardEditor({
      container: ctx.container,
      initialConfig: ctx.initialConfig as unknown as BasecardConfig,
      onChange(nextConfig) {
        ctx.onChange(nextConfig as unknown as BasecardConfigRecord);
      },
    });
  },
};
