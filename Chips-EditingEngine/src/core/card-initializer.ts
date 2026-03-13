import { fileService } from '../services/file-service';
import yaml from 'yaml';

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

export function createCardInitializer(config: CardInitializerConfig) {
    const { workspaceRoot } = config;

    async function createCard(
        cardId: string,
        name: string,
        initialContent?: BasicCardConfig
    ): Promise<CreateCardResult> {
        try {
            const cardFolderName = `${cardId}.card`;
            const cardPath = `${workspaceRoot}/${cardFolderName}`;
            const metaDir = `${cardPath}/.card`;

            const timestamp = new Date().toISOString();
            const metadata = {
                chip_standards_version: '1.0.0',
                card_id: cardId,
                name: name.trim(),
                created_at: timestamp,
                modified_at: timestamp,
            };

            const structure = {
                structure: initialContent ? [initialContent] : []
            };

            await fileService.ensureDir(cardPath);
            await fileService.ensureDir(metaDir);

            await fileService.writeText(`${metaDir}/metadata.yaml`, yaml.stringify(metadata));
            await fileService.writeText(`${metaDir}/structure.yaml`, yaml.stringify(structure));

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
