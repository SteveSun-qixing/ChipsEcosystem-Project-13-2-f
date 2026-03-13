import yaml from 'yaml';
import { fileService } from '../services/file-service';

export interface BasicCardConfig {
    id: string;
    type: string;
    config: Record<string, unknown>;
}

export interface CardInitializerConfig {
    workspaceRoot: string;
}

export interface CreateCardResult {
    success: boolean;
    cardPath: string;
    error?: string;
}

function joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function createDefaultCoverHtml(cardName: string): string {
    return [
        '<!doctype html>',
        '<html lang="zh-CN">',
        '<head>',
        '  <meta charset="utf-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
        '  <style>',
        '    html, body { margin: 0; width: 100%; height: 100%; }',
        '    body {',
        '      display: grid;',
        '      place-items: center;',
        '      background: linear-gradient(135deg, #f5f7fb 0%, #eef3ff 100%);',
        '      color: #111827;',
        '      font: 600 24px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
        '      text-align: center;',
        '      padding: 24px;',
        '      box-sizing: border-box;',
        '    }',
        '  </style>',
        '</head>',
        `<body>${cardName}</body>`,
        '</html>',
    ].join('\n');
}

export function createCardInitializer(config: CardInitializerConfig) {
    const { workspaceRoot } = config;

    async function createCard(
        cardId: string,
        name: string,
        initialContent?: BasicCardConfig
    ): Promise<CreateCardResult> {
        try {
            const cardFolderName = `${cardId}.card`;
            const cardPath = joinPath(workspaceRoot, cardFolderName);
            const metaDir = joinPath(cardPath, '.card');
            const contentDir = joinPath(cardPath, 'content');

            const timestamp = new Date().toISOString();
            const metadata = {
                chip_standards_version: '1.0.0',
                card_id: cardId,
                name: name.trim(),
                created_at: timestamp,
                modified_at: timestamp,
                theme: '',
                tags: [],
                description: '',
            };

            const structure = {
                structure: initialContent ? [{
                    id: initialContent.id,
                    type: initialContent.type,
                    created_at: timestamp,
                    modified_at: timestamp,
                }] : [],
                manifest: {
                    card_count: initialContent ? 1 : 0,
                    resource_count: 0,
                    resources: [],
                },
            };

            await fileService.ensureDir(cardPath);
            await fileService.ensureDir(metaDir);
            await fileService.ensureDir(contentDir);

            await fileService.writeText(joinPath(metaDir, 'metadata.yaml'), yaml.stringify(metadata));
            await fileService.writeText(joinPath(metaDir, 'structure.yaml'), yaml.stringify(structure));
            await fileService.writeText(joinPath(metaDir, 'cover.html'), createDefaultCoverHtml(name.trim()));

            if (initialContent) {
                await fileService.writeText(
                    joinPath(contentDir, `${initialContent.id}.yaml`),
                    yaml.stringify(initialContent.config),
                );
            }

            return {
                success: true,
                cardPath,
            };
        } catch (e) {
            console.error('[CardInitializer] Failed to create card:', e);
            return {
                success: false,
                cardPath: '',
                error: e instanceof Error ? e.message : 'Unknown error',
            };
        }
    }

    return { createCard };
}
