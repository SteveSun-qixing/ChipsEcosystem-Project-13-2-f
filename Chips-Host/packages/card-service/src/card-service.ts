import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createError } from '../../../src/shared/errors';
import { parseYamlLite } from '../../../src/shared/yaml-lite';
import { createId } from '../../../src/shared/utils';
import {
  UnifiedRenderingEngine,
  verifyRenderConsistency,
  type DeclarativeNode,
  type RenderConsistencyResult,
  type RenderContext,
  type RenderNodeDiagnostic,
  type RenderTarget,
  type RenderViewport,
  type ThemeSnapshot
} from '../../unified-rendering/src';
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

const parseListLike = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : null))
      .filter((item): item is string => item !== null);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '[]' || trimmed.length === 0) {
      return [];
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const body = trimmed.slice(1, -1).trim();
      if (!body) {
        return [];
      }
      return body
        .split(',')
        .map((token) => token.trim().replace(/^['"]|['"]$/g, ''))
        .filter((token) => token.length > 0);
    }

    return [trimmed];
  }

  return [];
};

const createDefaultTheme = (themeId: string): ThemeSnapshot => ({
  id: themeId,
  tokens: {
    'spacing.xs': 4,
    'spacing.sm': 8,
    'spacing.md': 12,
    'text.primary': '#111111',
    'text.secondary': '#666666'
  },
  scopes: {
    'card.header': {
      'text.primary': '#0f172a'
    },
    'card.content': {
      'text.secondary': '#334155'
    }
  }
});

const createDeclarationTree = (ast: CardAst, cardId: string, title: string): DeclarativeNode => {
  const structureCards = parseListLike(ast.structure.cards);
  const listItems = ast.contentFiles.length > 0 ? ast.contentFiles : structureCards;

  const header: DeclarativeNode = {
    id: `${cardId}-header`,
    type: 'View',
    themeScope: 'card.header',
    props: {
      role: 'header',
      paddingPx: 12,
      gapPx: 6
    },
    children: [
      {
        id: `${cardId}-title`,
        type: 'Text',
        props: {
          text: title,
          tone: 'token.text.primary'
        }
      }
    ]
  };

  const content: DeclarativeNode = {
    id: `${cardId}-content-list`,
    type: 'List',
    themeScope: 'card.content',
    props: {
      incremental: true,
      itemCount: listItems.length,
      itemHeightPx: 32,
      overscan: 2,
      gapPx: 4
    },
    errorBoundary: {
      level: 'region',
      fallback: {
        type: 'View',
        props: {
          reason: 'content-region-fallback'
        }
      }
    },
    children: listItems.map((filePath, index) => ({
      id: `${cardId}-item-${index}`,
      type: 'View',
      props: {
        role: 'list-item',
        index,
        filePath,
        gapPx: 2
      },
      children: [
        {
          id: `${cardId}-item-text-${index}`,
          type: 'Text',
          props: {
            text: filePath,
            tone: 'token.text.secondary'
          }
        }
      ]
    }))
  };

  return {
    id: `${cardId}-root`,
    type: 'View',
    themeScope: 'card.root',
    props: {
      role: 'article',
      widthCpx: 1024,
      gapPx: 12
    },
    effects: [
      {
        kind: 'telemetry-effect',
        name: 'card.rendered',
        payload: {
          cardId,
          nodes: listItems.length
        },
        trigger: 'commit'
      }
    ],
    children: [header, content]
  };
};

const createRenderContext = (theme: ThemeSnapshot, viewport?: Partial<RenderViewport>): RenderContext => {
  return {
    theme,
    viewport: {
      width: viewport?.width ?? 1024,
      height: viewport?.height ?? 768,
      scrollTop: viewport?.scrollTop ?? 0,
      scrollLeft: viewport?.scrollLeft ?? 0
    }
  };
};

export class CardService {
  public constructor(
    private readonly zip = new StoreZipService(),
    private readonly engine = new UnifiedRenderingEngine()
  ) {}

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
    const check = await this.validate(cardFile);
    if (!check.valid) {
      throw createError('CARD_SCHEMA_INVALID', 'Card format validation failed', check.errors);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chips-card-parse-'));
    try {
      await this.zip.extract(cardFile, tempDir);
      const metadata = parseYamlLite(await fs.readFile(path.join(tempDir, '.card/metadata.yaml'), 'utf-8'));
      const structure = parseYamlLite(await fs.readFile(path.join(tempDir, '.card/structure.yaml'), 'utf-8'));
      const contentRoot = path.join(tempDir, 'content');
      const contentFiles = await this.readFiles(contentRoot);

      return {
        metadata,
        structure,
        contentFiles
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  public async render(cardFile: string, options?: CardRenderOptions): Promise<RenderedCardView> {
    const ast = await this.parse(cardFile);
    const title = typeof ast.metadata.name === 'string' ? ast.metadata.name : 'Untitled Card';
    const cardId = typeof ast.metadata.id === 'string' ? ast.metadata.id : createId();

    const declaredThemeId =
      typeof ast.metadata.theme === 'string' && ast.metadata.theme.trim().length > 0
        ? ast.metadata.theme
        : 'chips-official.default-theme';

    const target = options?.target ?? 'card-iframe';
    const theme = options?.theme ?? createDefaultTheme(declaredThemeId);
    const context = createRenderContext(theme, options?.viewport);

    const declaration = createDeclarationTree(ast, cardId, title);
    const rendered = await this.engine.render(declaration, target, context, {
      batchSize: 48
    });

    const consistency = options?.verifyConsistency
      ? await verifyRenderConsistency(this.engine, declaration, context)
      : undefined;

    return {
      title,
      body: rendered.committed.html,
      contentFiles: ast.contentFiles,
      target,
      semanticHash: rendered.semanticHash,
      diagnostics: rendered.diagnostics,
      consistency
    };
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
}
