import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createError } from '../../../src/shared/errors';
import type { PluginRecord, PluginRuntime } from '../../../src/runtime';
import { parseYamlLite } from '../../../src/shared/yaml-lite';
import { createId } from '../../../src/shared/utils';
import type { RenderConsistencyResult, RenderNodeDiagnostic, RenderTarget, RenderViewport, ThemeSnapshot } from '../../unified-rendering/src';
import { StoreZipService } from '../../zip-service/src';

export interface CardAst {
  metadata: Record<string, unknown>;
  structure: Record<string, unknown>;
  contentFiles: string[];
}

export interface CardRenderOptions {
  target?: RenderTarget;
  viewport?: Partial<RenderViewport>;
  theme?: ThemeSnapshot;
  themeCssText?: string;
  verifyConsistency?: boolean;
}

export interface RenderedCardView {
  title: string;
  body: string;
  contentFiles: string[];
  target: RenderTarget;
  semanticHash: string;
  diagnostics: RenderNodeDiagnostic[];
  consistency?: RenderConsistencyResult;
}

export interface CardServiceOptions {
  runtime?: Pick<PluginRuntime, 'query'>;
  workspaceRoot?: string;
}

interface CardPackageContext {
  rootDir: string;
  metadata: Record<string, unknown>;
  structure: Record<string, unknown>;
  contentFiles: string[];
  contentByNodeId: Map<string, ParsedContentFile>;
}

interface StructureNode {
  id: string;
  type: string;
}

interface ParsedContentFile {
  id: string;
  path: string;
  absolutePath: string;
  raw: string;
  parsed: Record<string, unknown>;
}

interface FrameErrorPayload {
  nodeId: string;
  code: string;
  message: string;
  stage?: string;
  details?: unknown;
}

interface RenderedBaseCardNode {
  nodeId: string;
  cardType: string;
  title: string;
  pluginId?: string;
  frameHtml?: string;
  error?: FrameErrorPayload;
}

interface BaseCardPluginModule {
  renderBasecardView?: (ctx: { container: unknown; config: unknown; themeCssText?: string }) => unknown;
}

interface RenderablePluginRecord extends PluginRecord {
  manifest: PluginRecord['manifest'] & { entry: string };
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const escapeInlineJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

const createConsistencySnapshot = (semanticHash: string): RenderConsistencyResult => ({
  consistent: true,
  hashByTarget: {
    'app-root': semanticHash,
    'card-iframe': semanticHash,
    'module-slot': semanticHash,
    'offscreen-render': semanticHash
  },
  mismatches: []
});

const asRecord = (value: unknown): Record<string, unknown> => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

const asString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const isSafeUrlProtocol = (value: string): boolean => {
  const lowered = value.trim().toLowerCase();
  return !(
    lowered.startsWith('javascript:') ||
    lowered.startsWith('data:') ||
    lowered.startsWith('vbscript:')
  );
};

const resolveResourceUrl = (rawValue: string, baseDir: string, cardRoot: string): string => {
  const value = rawValue.trim();
  if (!value || !isSafeUrlProtocol(value)) {
    return '';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//') || value.startsWith('#')) {
    return value;
  }

  const absolutePath = value.startsWith('/')
    ? path.resolve(cardRoot, `.${value}`)
    : path.resolve(baseDir, value);
  return pathToFileURL(absolutePath).href;
};

const loadHtmlFromRichTextConfig = async (config: Record<string, unknown>, file: ParsedContentFile, cardRoot: string): Promise<string> => {
  const contentSource = asString(config.content_source) ?? 'inline';
  let html = '';

  if (typeof config.body === 'string') {
    html = config.body;
  } else if (contentSource === 'file') {
    const relativePath = asString(config.content_file);
    if (!relativePath) {
      throw createError('CARD_SCHEMA_INVALID', 'Rich text card is missing content_file.', {
        nodeId: file.id,
        filePath: file.path
      });
    }
    const absolutePath = path.resolve(cardRoot, relativePath);
    html = await fs.readFile(absolutePath, 'utf-8');
  } else {
    html = typeof config.content_text === 'string' ? config.content_text : '';
  }

  const jsdom = require('jsdom') as { JSDOM: new (html?: string) => { window: any } };
  const dom = new jsdom.JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const { document } = dom.window;
    for (const element of Array.from(document.querySelectorAll('[src]')) as Array<any>) {
      const src = element.getAttribute('src');
      if (!src) {
        continue;
      }
      const next = resolveResourceUrl(src, path.dirname(file.absolutePath), cardRoot);
      if (next) {
        element.setAttribute('src', next);
      } else {
        element.removeAttribute('src');
      }
    }

    for (const element of Array.from(document.querySelectorAll('[href]')) as Array<any>) {
      const href = element.getAttribute('href');
      if (!href) {
        continue;
      }
      const next = resolveResourceUrl(href, path.dirname(file.absolutePath), cardRoot);
      if (next) {
        element.setAttribute('href', next);
      } else {
        element.removeAttribute('href');
      }
    }

    return document.body.innerHTML;
  } finally {
    dom.window.close();
  }
};

const extractRichTextTitle = (html: string): { title: string; body: string } => {
  const jsdom = require('jsdom') as { JSDOM: new (html?: string) => { window: any } };
  const dom = new jsdom.JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  try {
    const { document } = dom.window;
    const heading = document.querySelector('h1, h2, h3, h4, h5, h6');
    const title = heading?.textContent?.trim() ?? '';
    if (heading) {
      heading.remove();
    }
    return {
      title,
      body: document.body.innerHTML.trim()
    };
  } finally {
    dom.window.close();
  }
};

const createThemeVariablesCss = (theme: ThemeSnapshot): string => {
  const declarations = Object.entries(theme.tokens)
    .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
    .map(([key, value]) => `  --${key.replaceAll('.', '-')}: ${String(value)};`);

  if (declarations.length === 0) {
    return ':root { color-scheme: light; }';
  }

  return [':root {', '  color-scheme: light;', ...declarations, '}'].join('\n');
};

const joinStyleBlocks = (...blocks: Array<string | undefined>): string => {
  return blocks.map((block) => block?.trim() ?? '').filter((block) => block.length > 0).join('\n\n');
};

const createBasecardThemeCss = (theme: ThemeSnapshot, themeCssText?: string): string => {
  return joinStyleBlocks(
    themeCssText,
    createThemeVariablesCss(theme),
    [
      'html, body { margin: 0; padding: 0; background: transparent; }',
      'body {',
      '  font: 15px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  color: var(--chips-sys-color-on-surface, #111111);',
      '}',
      '.chips-basecard {',
      '  box-sizing: border-box;',
      '  width: 100%;',
      '  background: var(--chips-comp-card-shell-root-surface, var(--chips-sys-color-surface, #ffffff));',
      '  padding: 22px 24px;',
      '}',
      '.chips-basecard__title {',
      '  margin: 0 0 14px;',
      '  font-size: 24px;',
      '  line-height: 1.3;',
      '  color: var(--chips-sys-color-on-surface, #111111);',
      '}',
      '.chips-basecard__body { color: var(--chips-sys-color-on-surface, #111111); }',
      '.chips-basecard__body > :first-child { margin-top: 0; }',
      '.chips-basecard__body > :last-child { margin-bottom: 0; }',
      '.chips-basecard__body a { color: var(--chips-sys-color-primary, #2563eb); }',
      '.chips-basecard__body img { max-width: 100%; height: auto; border-radius: 10px; }',
      '.chips-basecard__body blockquote {',
      '  margin: 16px 0;',
      '  padding: 0 0 0 16px;',
      '  border-left: 3px solid var(--chips-comp-card-shell-border-color, rgba(17, 17, 17, 0.16));',
      '}',
      '.chips-basecard__body hr {',
      '  border: none;',
      '  border-top: 1px solid var(--chips-comp-card-shell-border-color, rgba(17, 17, 17, 0.16));',
      '  margin: 18px 0;',
      '}',
      '.chips-basecard__body code {',
      '  padding: 1px 6px;',
      '  border-radius: 6px;',
      '  background: rgba(0, 0, 0, 0.05);',
      '}',
      '.chips-basecard__body pre {',
      '  overflow: auto;',
      '  padding: 14px;',
      '  border-radius: 10px;',
      '  background: rgba(0, 0, 0, 0.05);',
      '}'
    ].join('\n')
  );
};

const createCompositeThemeCss = (theme: ThemeSnapshot, themeCssText?: string): string => {
  return joinStyleBlocks(
    themeCssText,
    createThemeVariablesCss(theme),
    [
      'html, body { margin: 0; padding: 0; min-height: 100%; }',
      'body {',
      '  background: var(--chips-sys-color-surface, #ffffff);',
      '  color: var(--chips-sys-color-on-surface, #111111);',
      '  font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '}',
      '.chips-composite { max-width: 980px; margin: 0 auto; padding: 28px 22px 40px; box-sizing: border-box; }',
      '.chips-composite__header { margin-bottom: 18px; }',
      '.chips-composite__title { margin: 0; font-size: 30px; line-height: 1.2; color: var(--chips-sys-color-on-surface, #111111); }',
      '.chips-composite__meta { margin-top: 8px; font-size: 12px; color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 68%, white 32%); }',
      '.chips-composite__stack { display: grid; gap: 16px; }',
      '.chips-composite__node {',
      '  background: var(--chips-comp-card-shell-root-surface, var(--chips-sys-color-surface, #ffffff));',
      '  border: 1px solid var(--chips-comp-card-shell-border-color, rgba(17, 17, 17, 0.16));',
      '  border-radius: 18px;',
      '  overflow: hidden;',
      '  box-shadow: 0 10px 30px rgba(17, 17, 17, 0.08);',
      '}',
      '.chips-composite__frame { display: block; width: 100%; min-height: 96px; border: 0; background: transparent; }',
      '.chips-composite__degraded { padding: 22px 24px; color: color-mix(in srgb, var(--chips-sys-color-on-surface, #111111) 72%, white 28%); }',
      '.chips-composite__degraded strong { display: block; margin-bottom: 8px; color: var(--chips-sys-color-on-surface, #111111); }',
      '.chips-composite__degraded p { margin: 0; }',
      '.chips-composite__meta code {',
      '  padding: 2px 6px;',
      '  border-radius: 999px;',
      '  background: color-mix(in srgb, var(--chips-sys-color-primary, #2563eb) 12%, white 88%);',
      '  color: var(--chips-sys-color-primary, #2563eb);',
      '}'
    ].join('\n')
  );
};

const createChildFrameDocument = (nodeId: string, cardType: string, title: string, contentHtml: string): string => {
  const safeNodeId = JSON.stringify(nodeId);
  const contentTitle = title || cardType;

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src file: http: https: data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data: file:;" />',
    `  <title>${escapeHtml(contentTitle)}</title>`,
    '</head>',
    `<body data-node-id="${escapeHtml(nodeId)}" data-card-type="${escapeHtml(cardType)}">`,
    contentHtml,
    '  <script>',
    '    (() => {',
    `      const nodeId = ${safeNodeId};`,
    '      const emitHeight = () => {',
    '        const height = Math.max(',
    '          64,',
    '          document.documentElement?.scrollHeight ?? 0,',
    '          document.body?.scrollHeight ?? 0,',
    '          document.documentElement?.offsetHeight ?? 0,',
    '          document.body?.offsetHeight ?? 0',
    '        );',
    "        window.parent?.postMessage({ type: 'chips.basecard:height', payload: { nodeId, height } }, '*');",
    '      };',
    "      window.addEventListener('load', () => {",
    '        emitHeight();',
    '        window.setTimeout(emitHeight, 50);',
    '        window.setTimeout(emitHeight, 200);',
    '      });',
    "      if ('ResizeObserver' in window && document.body) {",
    '        const observer = new ResizeObserver(() => emitHeight());',
    '        observer.observe(document.body);',
    '      }',
    '    })();',
    '  </script>',
    '</body>',
    '</html>'
  ].join('\n');
};

const createCompositeDocument = (
  title: string,
  target: RenderTarget,
  semanticHash: string,
  theme: ThemeSnapshot,
  themeCssText: string | undefined,
  nodes: RenderedBaseCardNode[]
): string => {
  const nodeMarkup = nodes
    .map((node) => {
      if (node.frameHtml) {
        return [
          `<section class="chips-composite__node" data-node-id="${escapeHtml(node.nodeId)}" data-card-type="${escapeHtml(node.cardType)}" data-plugin-id="${escapeHtml(node.pluginId ?? '')}" data-state="ready">`,
          `  <iframe class="chips-composite__frame" data-node-id="${escapeHtml(node.nodeId)}" title="${escapeHtml(node.title || node.cardType)}" loading="lazy" sandbox="allow-scripts allow-popups" srcdoc="${escapeHtml(node.frameHtml)}"></iframe>`,
          '</section>'
        ].join('\n');
      }

      const message = node.error?.message ?? 'Base card failed to render.';
      return [
        `<section class="chips-composite__node" data-node-id="${escapeHtml(node.nodeId)}" data-card-type="${escapeHtml(node.cardType)}" data-plugin-id="${escapeHtml(node.pluginId ?? '')}" data-state="degraded">`,
        '  <div class="chips-composite__degraded">',
        `    <strong>${escapeHtml(node.title || node.cardType || node.nodeId)}</strong>`,
        `    <p>${escapeHtml(message)}</p>`,
        '  </div>',
        '</section>'
      ].join('\n');
    })
    .join('\n');

  const nodeErrors = nodes
    .filter((node) => node.error)
    .map((node) => node.error) as FrameErrorPayload[];

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '  <meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src file: http: https: data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data: file:; child-src \'self\' blob:; frame-src \'self\' blob:;" />',
    `  <title>${escapeHtml(title)}</title>`,
    `  <style>${createCompositeThemeCss(theme, themeCssText)}</style>`,
    '</head>',
    `<body data-target="${escapeHtml(target)}" data-semantic-hash="${escapeHtml(semanticHash)}">`,
    '  <main class="chips-composite">',
    '    <header class="chips-composite__header">',
    `      <h1 class="chips-composite__title">${escapeHtml(title)}</h1>`,
    `      <div class="chips-composite__meta">target=<code>${escapeHtml(target)}</code> nodes=<code>${String(nodes.length)}</code></div>`,
    '    </header>',
    `    <section class="chips-composite__stack">${nodeMarkup}</section>`,
    '  </main>',
    `  <script id="__chips-node-errors" type="application/json">${escapeInlineJson(nodeErrors)}</script>`,
    '  <script>',
    '    (() => {',
    '      const frameList = Array.from(document.querySelectorAll(".chips-composite__frame"));',
    '      const frameByNodeId = new Map(frameList.map((frame) => [frame.dataset.nodeId ?? "", frame]));',
    '      const errorPayload = JSON.parse(document.getElementById("__chips-node-errors")?.textContent ?? "[]");',
    '      let remaining = frameList.length;',
    '      let readySent = false;',
    '      const emit = (type, payload) => {',
    "        window.parent?.postMessage({ type, payload }, '*');",
    '      };',
    '      const markFrameSettled = () => {',
    '        remaining = Math.max(0, remaining - 1);',
    '        if (remaining === 0 && !readySent) {',
    '          readySent = true;',
    "          emit('chips.composite:ready', { nodeCount: frameList.length });",
    '        }',
    '      };',
    '      for (const payload of errorPayload) {',
    "        emit('chips.composite:node-error', payload);",
    '      }',
    '      if (errorPayload.length > 0 && errorPayload.length === Math.max(frameList.length, errorPayload.length)) {',
    "        emit('chips.composite:fatal-error', { code: 'CARD_RENDER_FAILED', message: 'Composite card failed to render all nodes.', details: errorPayload });",
    '      }',
    '      for (const frame of frameList) {',
    '        frame.addEventListener("load", () => {',
    '          if (frame.dataset.loaded === "true") {',
    '            return;',
    '          }',
    '          frame.dataset.loaded = "true";',
    '          markFrameSettled();',
    '        });',
    '        frame.addEventListener("error", () => {',
    '          const nodeId = frame.dataset.nodeId ?? "";',
    "          emit('chips.composite:node-error', { nodeId, code: 'IFRAME_LOAD_FAILED', message: 'Base card iframe failed to load.', stage: 'render-commit' });",
    '          if (frame.dataset.loaded === "true") {',
    '            return;',
    '          }',
    '          frame.dataset.loaded = "true";',
    '          markFrameSettled();',
    '        });',
    '      }',
    '      if (frameList.length === 0 && !readySent) {',
    '        readySent = true;',
    "        emit('chips.composite:ready', { nodeCount: 0 });",
    '      }',
    '      window.addEventListener("message", (event) => {',
    '        const data = event.data;',
    '        if (!data || typeof data !== "object" || data.type !== "chips.basecard:height") {',
    '          return;',
    '        }',
    '        const payload = data.payload ?? {};',
    '        const nodeId = typeof payload.nodeId === "string" ? payload.nodeId : "";',
    '        const height = Number(payload.height);',
    '        if (!nodeId || !Number.isFinite(height)) {',
    '          return;',
    '        }',
    '        const frame = frameByNodeId.get(nodeId);',
    '        if (!frame) {',
    '          return;',
    '        }',
    '        frame.style.height = `${Math.max(96, Math.ceil(height))}px`;',
    '      });',
    '      window.setTimeout(() => {',
    '        if (!readySent) {',
    '          readySent = true;',
    "          emit('chips.composite:ready', { nodeCount: frameList.length, fallback: true });",
    '        }',
    '      }, 1500);',
    '    })();',
    '  </script>',
    '</body>',
    '</html>'
  ].join('\n');
};

const parseStructureNodes = (structure: Record<string, unknown>, contentByNodeId: Map<string, ParsedContentFile>): StructureNode[] => {
  const rawNodes = Array.isArray(structure.structure)
    ? structure.structure
    : Array.isArray(structure.cards)
      ? structure.cards
      : [];

  const nodes = rawNodes
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const content = contentByNodeId.get(entry);
        return {
          id: entry,
          type: asString(content?.parsed.card_type) ?? ''
        };
      }

      const record = asRecord(entry);
      const id = asString(record.id) ?? `node-${index + 1}`;
      const content = contentByNodeId.get(id);
      return {
        id,
        type: asString(record.type) ?? asString(content?.parsed.card_type) ?? ''
      };
    })
    .filter((entry) => entry.id.length > 0);

  if (nodes.length > 0) {
    return nodes;
  }

  return [...contentByNodeId.values()].map((file) => ({
    id: file.id,
    type: asString(file.parsed.card_type) ?? ''
  }));
};

const createDiagnostic = (
  nodeId: string,
  code: string,
  message: string,
  details?: unknown
): RenderNodeDiagnostic => ({
  nodeId,
  stage: 'render-commit',
  code,
  message,
  details
});

export class CardService {
  private readonly runtime?: Pick<PluginRuntime, 'query'>;
  private readonly workspaceRoot: string;
  private readonly moduleCache = new Map<string, Promise<BaseCardPluginModule>>();

  public constructor(
    options: CardServiceOptions = {},
    private readonly zip = new StoreZipService()
  ) {
    this.runtime = options.runtime;
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
  }

  public async validate(cardFile: string): Promise<{ valid: boolean; errors: string[] }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-'));
    try {
      await this.zip.extract(cardFile, tempDir);
      const required = ['.card/metadata.yaml', '.card/structure.yaml', '.card/cover.html'];
      const entries = await this.zip.list(cardFile);
      const names = new Set(entries.map((entry) => entry.path));
      const errors = required.filter((requiredPath) => !names.has(requiredPath));
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        valid: false,
        errors: [String(error)]
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  public async parse(cardFile: string): Promise<CardAst> {
    return this.withExtractedCard(cardFile, async (ctx) => ({
      metadata: ctx.metadata,
      structure: ctx.structure,
      contentFiles: ctx.contentFiles
    }));
  }

  public async render(cardFile: string, options?: CardRenderOptions): Promise<RenderedCardView> {
    return this.withExtractedCard(cardFile, async (ctx) => {
      const diagnostics: RenderNodeDiagnostic[] = [];
      const structureNodes = parseStructureNodes(ctx.structure, ctx.contentByNodeId);
      const title = asString(ctx.metadata.name) ?? 'Untitled Card';
      const cardId = asString(ctx.metadata.card_id) ?? asString(ctx.metadata.id) ?? createId();
      const target = options?.target ?? 'card-iframe';
      const theme = options?.theme;
      if (!theme) {
        throw createError('THEME_NOT_FOUND', 'Card render requires a resolved theme snapshot.');
      }
      const themeCssText = options?.themeCssText;
      const renderedNodes: RenderedBaseCardNode[] = [];

      for (const node of structureNodes) {
        renderedNodes.push(await this.renderStructureNode(node, ctx, theme, themeCssText, diagnostics));
      }

      const semanticModel = {
        cardId,
        title,
        target,
        themeId: theme.id,
        contentFiles: ctx.contentFiles,
        nodes: renderedNodes.map((node) => ({
          nodeId: node.nodeId,
          cardType: node.cardType,
          title: node.title,
          pluginId: node.pluginId ?? null,
          state: node.error ? 'degraded' : 'ready'
        }))
      };
      const semanticHash = crypto.createHash('sha256').update(JSON.stringify(semanticModel)).digest('hex');
      const body = createCompositeDocument(title, target, semanticHash, theme, themeCssText, renderedNodes);

      return {
        title,
        body,
        contentFiles: ctx.contentFiles,
        target,
        semanticHash,
        diagnostics,
        consistency: options?.verifyConsistency ? createConsistencySnapshot(semanticHash) : undefined
      };
    });
  }

  private async renderStructureNode(
    node: StructureNode,
    ctx: CardPackageContext,
    theme: ThemeSnapshot,
    themeCssText: string | undefined,
    diagnostics: RenderNodeDiagnostic[]
  ): Promise<RenderedBaseCardNode> {
    const content = ctx.contentByNodeId.get(node.id);
    const cardType = node.type || asString(content?.parsed.card_type) || 'UnknownCard';

    if (!content) {
      const error = {
        nodeId: node.id,
        code: 'CARD_CONTENT_MISSING',
        message: `Content file is missing for node ${node.id}.`,
        stage: 'render-commit',
        details: { nodeId: node.id }
      } satisfies FrameErrorPayload;
      diagnostics.push(createDiagnostic(node.id, error.code, error.message, error.details));
      return {
        nodeId: node.id,
        cardType,
        title: node.id,
        error
      };
    }

    const plugin = this.resolveCardPlugin(cardType);
    if (!plugin) {
      const error = {
        nodeId: node.id,
        code: 'CARD_PLUGIN_NOT_FOUND',
        message: `No enabled base card plugin can render ${cardType}.`,
        stage: 'render-commit',
        details: { cardType }
      } satisfies FrameErrorPayload;
      diagnostics.push(createDiagnostic(node.id, error.code, error.message, error.details));
      return {
        nodeId: node.id,
        cardType,
        title: node.id,
        error
      };
    }

    try {
      const config = await this.normalizeNodeConfig(plugin, content, ctx.rootDir);
      const title = asString(asRecord(config).title) ?? node.id;
      const contentHtml = await this.renderBasecardHtml(plugin, config, theme, themeCssText);
      if (!contentHtml.trim()) {
        throw createError('CARD_PLUGIN_EMPTY_RENDER', `Plugin ${plugin.manifest.id} returned empty content.`, {
          nodeId: node.id,
          cardType
        });
      }

      return {
        nodeId: node.id,
        cardType,
        title,
        pluginId: plugin.manifest.id,
        frameHtml: createChildFrameDocument(node.id, cardType, title, contentHtml)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const details = error && typeof error === 'object' ? error : { error: String(error) };
      diagnostics.push(createDiagnostic(node.id, 'CARD_NODE_RENDER_FAILED', message, details));
      return {
        nodeId: node.id,
        cardType,
        title: node.id,
        pluginId: plugin.manifest.id,
        error: {
          nodeId: node.id,
          code: 'CARD_NODE_RENDER_FAILED',
          message,
          stage: 'render-commit',
          details
        }
      };
    }
  }

  private resolveCardPlugin(cardType: string): RenderablePluginRecord | undefined {
    const plugins = this.runtime?.query({ type: 'card' }) ?? [];
    const candidates = this.buildCardTypeCandidates(cardType);

    return plugins
      .filter(
        (record): record is RenderablePluginRecord =>
          Boolean(record.enabled && typeof record.manifest.entry === 'string' && record.manifest.entry.length > 0)
      )
      .find((record) => {
        const capabilities = new Set(record.manifest.capabilities ?? []);
        return candidates.some((candidate) => capabilities.has(candidate));
      });
  }

  private buildCardTypeCandidates(cardType: string): string[] {
    const trimmed = cardType.trim();
    const compact = trimmed.replace(/\s+/g, '');
    const stripped = compact.replace(/Card$/i, '');
    const normalized = stripped.replace(/[^A-Za-z0-9]+/g, '');
    const lower = normalized.toLowerCase();

    const candidates = new Set<string>();
    if (trimmed) {
      candidates.add(trimmed);
      candidates.add(trimmed.toLowerCase());
    }
    if (compact) {
      candidates.add(compact);
      candidates.add(compact.toLowerCase());
    }
    if (stripped) {
      candidates.add(stripped);
      candidates.add(stripped.toLowerCase());
    }
    if (lower) {
      candidates.add(`base.${lower}`);
    }

    return [...candidates];
  }

  private async normalizeNodeConfig(
    plugin: RenderablePluginRecord,
    file: ParsedContentFile,
    cardRoot: string
  ): Promise<Record<string, unknown>> {
    const rawConfig: Record<string, unknown> = {
      ...file.parsed,
      id: asString(file.parsed.id) ?? file.id
    };

    if (plugin.manifest.id === 'chips.basecard.richtext') {
      const richTextHtml = await loadHtmlFromRichTextConfig(rawConfig, file, cardRoot);
      const normalized = extractRichTextTitle(richTextHtml);
      return {
        id: file.id,
        title: normalized.title || file.id,
        body: normalized.body || richTextHtml,
        locale: asString(rawConfig.locale) ?? 'zh-CN'
      };
    }

    return rawConfig;
  }

  private async renderBasecardHtml(
    plugin: RenderablePluginRecord,
    config: Record<string, unknown>,
    theme: ThemeSnapshot,
    themeCssText: string | undefined
  ): Promise<string> {
    const module = await this.loadPluginModule(plugin);
    if (typeof module.renderBasecardView !== 'function') {
      throw createError('CARD_PLUGIN_INVALID', `Plugin ${plugin.manifest.id} does not export renderBasecardView.`, {
        pluginId: plugin.manifest.id,
        entry: plugin.manifest.entry
      });
    }

    const jsdom = require('jsdom') as { JSDOM: new (html?: string, options?: { url?: string }) => { window: any } };
    const dom = new jsdom.JSDOM('<!doctype html><html><body><div id="chips-basecard-root"></div></body></html>', {
      url: 'file:///'
    });
    const win = dom.window;
    const container = win.document.getElementById('chips-basecard-root');
    if (!container) {
      dom.window.close();
      throw createError('CARD_RENDER_CONTAINER_MISSING', 'Failed to allocate base card render container.');
    }

    const previousDescriptors = new Map<string, PropertyDescriptor | undefined>();
    const overrideGlobal = (key: string, value: unknown): void => {
      previousDescriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value
      });
    };

    overrideGlobal('window', win);
    overrideGlobal('document', win.document);
    overrideGlobal('navigator', win.navigator);
    overrideGlobal('HTMLElement', win.HTMLElement);
    overrideGlobal('Node', win.Node);
    overrideGlobal('Element', win.Element);
    overrideGlobal('NodeFilter', win.NodeFilter);

    try {
      module.renderBasecardView({
        container,
        config,
        themeCssText: createBasecardThemeCss(theme, themeCssText)
      });
      return container.innerHTML;
    } finally {
      for (const [key, descriptor] of previousDescriptors.entries()) {
        if (typeof descriptor === 'undefined') {
          delete (globalThis as Record<string, unknown>)[key];
        } else {
          Object.defineProperty(globalThis, key, descriptor);
        }
      }
      dom.window.close();
    }
  }

  private async loadPluginModule(plugin: RenderablePluginRecord): Promise<BaseCardPluginModule> {
    const entryPath = await this.resolvePluginEntryPath(plugin);
    const cacheKey = `${plugin.manifest.id}:${entryPath}`;
    const cached = this.moduleCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const pending = (async () => {
      try {
        if (entryPath.endsWith('.mjs')) {
          return (await import(pathToFileURL(entryPath).href)) as BaseCardPluginModule;
        }
        if (entryPath.endsWith('.js') || entryPath.endsWith('.ts')) {
          const bundled = await this.bundlePluginEntry(entryPath, plugin.installPath);
          if (bundled) {
            return bundled;
          }
        }
        const required = require(entryPath) as BaseCardPluginModule;
        if (required && Object.keys(required).length > 0) {
          return required;
        }
      } catch (error) {
        const fallback = await this.bundlePluginEntry(entryPath, plugin.installPath);
        if (fallback) {
          return fallback;
        }
        throw error;
      }

      const fallback = await this.bundlePluginEntry(entryPath, plugin.installPath);
      if (fallback) {
        return fallback;
      }
      throw createError('CARD_PLUGIN_LOAD_FAILED', `Failed to load plugin entry ${entryPath}.`, {
        pluginId: plugin.manifest.id,
        entryPath
      });
    })();

    this.moduleCache.set(cacheKey, pending);
    return pending;
  }

  private async resolvePluginEntryPath(plugin: RenderablePluginRecord): Promise<string> {
    const declaredEntryPath = path.resolve(plugin.installPath, plugin.manifest.entry);
    const declaredStats = await this.safeStat(declaredEntryPath);
    if (declaredStats?.isFile()) {
      return declaredEntryPath;
    }

    const sourceOverride = await this.findWorkspaceSourceEntry(plugin.manifest.id);
    if (sourceOverride) {
      return sourceOverride;
    }

    throw createError('CARD_PLUGIN_ENTRY_NOT_FOUND', `Plugin entry is missing: ${plugin.manifest.entry}`, {
      pluginId: plugin.manifest.id,
      entry: plugin.manifest.entry
    });
  }

  private async findWorkspaceSourceEntry(pluginId: string): Promise<string | undefined> {
    const candidates = [
      path.join(this.workspaceRoot, 'Chips-BaseCardPlugin'),
      path.join(this.workspaceRoot, 'Chips-Scaffold', 'Chips-BaseCardPlugin')
    ];

    for (const root of candidates) {
      const rootStats = await this.safeStat(root);
      if (!rootStats?.isDirectory()) {
        continue;
      }
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }
        const manifestPath = path.join(root, entry.name, 'manifest.yaml');
        const manifestStats = await this.safeStat(manifestPath);
        if (!manifestStats?.isFile()) {
          continue;
        }
        const manifest = asRecord(parseYamlLite(await fs.readFile(manifestPath, 'utf-8')));
        if (asString(manifest.id) !== pluginId) {
          continue;
        }
        const entryPath = asString(manifest.entry);
        if (!entryPath) {
          continue;
        }
        const absoluteEntryPath = path.resolve(path.dirname(manifestPath), entryPath);
        const sourceStats = await this.safeStat(absoluteEntryPath);
        if (sourceStats?.isFile()) {
          return absoluteEntryPath;
        }
      }
    }

    return undefined;
  }

  private async bundlePluginEntry(entryPath: string, pluginRoot: string): Promise<BaseCardPluginModule | undefined> {
    try {
      const { build } = require('esbuild') as {
        build: (options: Record<string, unknown>) => Promise<{ outputFiles?: Array<{ text: string }> }>;
      };
      const result = await build({
        entryPoints: [entryPath],
        bundle: true,
        platform: 'browser',
        format: 'cjs',
        write: false,
        absWorkingDir: pluginRoot,
        logLevel: 'silent'
      });
      const code = result.outputFiles?.[0]?.text;
      if (!code) {
        return undefined;
      }

      const exportsObject: Record<string, unknown> = {};
      const moduleObject = { exports: exportsObject } as { exports: Record<string, unknown> };
      const factory = new Function('require', 'module', 'exports', code) as (
        requireFn: NodeRequire,
        moduleFn: { exports: Record<string, unknown> },
        exportsFn: Record<string, unknown>
      ) => void;
      factory(require, moduleObject, exportsObject);
      return moduleObject.exports as BaseCardPluginModule;
    } catch {
      return undefined;
    }
  }

  private async withExtractedCard<T>(cardFile: string, task: (ctx: CardPackageContext) => Promise<T>): Promise<T> {
    const check = await this.validate(cardFile);
    if (!check.valid) {
      throw createError('CARD_SCHEMA_INVALID', 'Card format validation failed', check.errors);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-parse-'));
    try {
      await this.zip.extract(cardFile, tempDir);
      const metadata = asRecord(parseYamlLite(await fs.readFile(path.join(tempDir, '.card/metadata.yaml'), 'utf-8')));
      const structure = asRecord(parseYamlLite(await fs.readFile(path.join(tempDir, '.card/structure.yaml'), 'utf-8')));
      const contentFiles = await this.readFiles(path.join(tempDir, 'content'));
      const contentByNodeId = await this.readContentFiles(tempDir, contentFiles);

      return await task({
        rootDir: tempDir,
        metadata,
        structure,
        contentFiles,
        contentByNodeId
      });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  private async readContentFiles(rootDir: string, contentFiles: string[]): Promise<Map<string, ParsedContentFile>> {
    const result = new Map<string, ParsedContentFile>();
    for (const relativePath of contentFiles) {
      const absolutePath = path.join(rootDir, 'content', relativePath);
      const raw = await fs.readFile(absolutePath, 'utf-8');
      result.set(path.basename(relativePath, path.extname(relativePath)), {
        id: path.basename(relativePath, path.extname(relativePath)),
        path: relativePath,
        absolutePath,
        raw,
        parsed: asRecord(parseYamlLite(raw))
      });
    }
    return result;
  }

  private async readFiles(root: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const stack = [root];
      while (stack.length > 0) {
        const current = stack.pop();
        if (!current) {
          continue;
        }

        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(full);
          } else {
            files.push(path.relative(root, full).split(path.sep).join('/'));
          }
        }
      }
      files.sort();
      return files;
    } catch {
      return [];
    }
  }

  private async safeStat(filePath: string): Promise<import('node:fs').Stats | undefined> {
    try {
      return await fs.stat(filePath);
    } catch {
      return undefined;
    }
  }
}
