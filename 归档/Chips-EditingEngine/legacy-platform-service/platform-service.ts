import { getChipsClient } from '../../src/services/bridge-client';

export interface DialogSaveOptions {
    defaultPath?: string;
    title?: string;
}

interface DialogSaveResponse {
    filePath: string | null;
}

export const platformService = {
    async saveFile(options?: DialogSaveOptions): Promise<string | null> {
        const result = await getChipsClient().invoke<{ options?: DialogSaveOptions }, DialogSaveResponse>(
            'platform.dialogSaveFile',
            { options },
        );

        return typeof result?.filePath === 'string' && result.filePath.trim().length > 0
            ? result.filePath
            : null;
    },
};
