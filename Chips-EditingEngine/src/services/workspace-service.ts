import { fileService } from './file-service';
import { getChipsClient } from './bridge-client';
import { createEventEmitter, type EventEmitter } from '../core/event-emitter';
import { createCardInitializer, type BasicCardConfig } from '../core/card-initializer';
import { generateId62 } from '../utils/id';
import type { WorkspaceState, WorkspaceFile } from '../types/workspace';
import yaml from 'yaml';

export interface WorkspaceOpenOptions {
    windowPosition?: { x: number; y: number };
    isEditing?: boolean;
}

const HOST_RUNTIME_ROOT_ENTRIES = new Set([
    'plugins',
    'plugins.json',
    'plugin-runtime.json',
    'plugin-shortcuts.json',
    'route-manifest.json',
    'credentials.enc.json',
    'config.json',
    'config.workspace.json',
    'config.system.json',
    'host-state.json',
]);

function joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function stripExtension(name: string, ext: string): string {
    if (name.toLowerCase().endsWith(ext)) {
        return name.slice(0, -ext.length);
    }
    return name;
}

export class WorkspaceService {
    private eventEmitter: EventEmitter = createEventEmitter();
    private state: WorkspaceState = {
        initialized: false,
        rootPath: '',
        files: [],
        openedFiles: [],
    };

    async initialize(): Promise<void> {
        if (this.state.initialized && this.state.rootPath) return;

        try {
            const client = getChipsClient();
            let workspacePath = '';

            try {
                const launchContext = client.platform?.getLaunchContext?.();
                const launchParams = launchContext?.launchParams ?? {};

                const candidate =
                    typeof launchParams.workspacePath === 'string'
                        ? launchParams.workspacePath
                        : typeof launchParams.workspace === 'string'
                            ? launchParams.workspace
                            : '';

                if (candidate.trim()) {
                    workspacePath = candidate.trim();
                }
            } catch (e) {
                console.warn('[WorkspaceService] Could not read workspace path from launch context', e);
            }

            if (!workspacePath) {
                // No workspace provided — enter "uninitialized" state without crashing.
                // The user may open a workspace later via the Dock / menu.
                console.info('[WorkspaceService] No workspace path provided by Host launch context. Waiting for workspace binding.');
                this.state.initialized = true;
                this.state.rootPath = '';
                this.state.files = [];
                this.eventEmitter.emit('workspace:no-path', {});
                return;
            }

            // Verify the path is accessible
            const exists = await fileService.exists(workspacePath);
            if (!exists) {
                console.warn('[WorkspaceService] Workspace path does not exist:', workspacePath);
                this.state.initialized = true;
                this.state.rootPath = workspacePath;
                this.state.files = [];
                this.eventEmitter.emit('workspace:path-missing', { path: workspacePath });
                return;
            }

            this.state.rootPath = workspacePath;
            await this.refresh();

            this.state.initialized = true;
            this.eventEmitter.emit('workspace:initialized', { rootPath: this.state.rootPath });
            console.log('[WorkspaceService] Initialized:', this.state.rootPath);
        } catch (error) {
            // Workspace init failure should not crash the entire app.
            // The editor can still function in a read-only or empty state.
            console.error('[WorkspaceService] Init failed, continuing without workspace:', error);
            this.state.initialized = true;
            this.state.rootPath = '';
            this.state.files = [];
            this.eventEmitter.emit('workspace:error', { error });
        }
    }


    getState() {
        return this.state;
    }

    isInitialized() {
        return this.state.initialized;
    }

    getFiles() {
        return this.state.files;
    }

    on(event: string, handler: any) {
        this.eventEmitter.on(event, handler);
    }

    off(event: string, handler: any) {
        this.eventEmitter.off(event, handler);
    }

    async readMetadata(path: string): Promise<Record<string, unknown> | null> {
        try {
            const content = await fileService.readText(path);
            return yaml.parse(content) as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    async buildTree(basePath: string): Promise<WorkspaceFile[]> {
        const entries = await fileService.list(basePath);
        const result: WorkspaceFile[] = [];
        const isWorkspaceRoot = basePath === this.state.rootPath;

        for (const entry of entries) {
            const fileName = entry.path.split('/').pop() || '';
            if (fileName.startsWith('.')) continue;
            if (isWorkspaceRoot && HOST_RUNTIME_ROOT_ENTRIES.has(fileName)) continue;

            const entryPath = entry.path;

            try {
                const stat = await fileService.stat(entryPath);

                if (stat.isDirectory) {
                    const cardMetaPath = joinPath(entryPath, '.card/metadata.yaml');
                    const boxMetaPath = joinPath(entryPath, '.box/metadata.yaml');

                    if (await fileService.exists(cardMetaPath)) {
                        const metadata = await this.readMetadata(cardMetaPath);
                        const cardId = (metadata?.card_id as string) ?? fileName.replace(/\.card$/i, '');
                        const cardName = (metadata?.name as string) ?? fileName;
                        result.push({
                            id: cardId,
                            name: `${stripExtension(cardName, '.card')}.card`,
                            path: entryPath,
                            type: 'card',
                            createdAt: (metadata?.created_at as string) || new Date(stat.mtimeMs).toISOString(),
                            modifiedAt: (metadata?.modified_at as string) || new Date(stat.mtimeMs).toISOString(),
                        });
                        continue;
                    }

                    if (await fileService.exists(boxMetaPath)) {
                        const metadata = await this.readMetadata(boxMetaPath);
                        const boxId = (metadata?.box_id as string) ?? fileName.replace(/\.box$/i, '');
                        const boxName = (metadata?.name as string) ?? fileName;
                        result.push({
                            id: boxId,
                            name: `${stripExtension(boxName, '.box')}.box`,
                            path: entryPath,
                            type: 'box',
                            createdAt: (metadata?.created_at as string) || new Date(stat.mtimeMs).toISOString(),
                            modifiedAt: (metadata?.modified_at as string) || new Date(stat.mtimeMs).toISOString(),
                        });
                        continue;
                    }

                    const children = await this.buildTree(entryPath);
                    result.push({
                        id: entryPath,
                        name: fileName,
                        path: entryPath,
                        type: 'folder',
                        createdAt: new Date(stat.mtimeMs).toISOString(),
                        modifiedAt: new Date(stat.mtimeMs).toISOString(),
                        children,
                    });
                    continue;
                }

                const lower = fileName.toLowerCase();
                if (lower.endsWith('.card')) {
                    result.push({
                        id: entryPath,
                        name: fileName,
                        path: entryPath,
                        type: 'card',
                        createdAt: new Date(stat.mtimeMs).toISOString(),
                        modifiedAt: new Date(stat.mtimeMs).toISOString(),
                    });
                } else if (lower.endsWith('.box')) {
                    result.push({
                        id: entryPath,
                        name: fileName,
                        path: entryPath,
                        type: 'box',
                        createdAt: new Date(stat.mtimeMs).toISOString(),
                        modifiedAt: new Date(stat.mtimeMs).toISOString(),
                    });
                }
            } catch (e) {
                console.warn(`[WorkspaceService] Failed to process ${entryPath}`, e);
            }
        }
        return result;
    }

    async refresh(): Promise<void> {
        if (!this.state.rootPath) return;
        this.state.files = await this.buildTree(this.state.rootPath);
        this.eventEmitter.emit('workspace:refreshed', { files: this.state.files });
    }

    findFileById(list: WorkspaceFile[], id: string): WorkspaceFile | undefined {
        for (const file of list) {
            if (file.id === id) return file;
            if (file.children) {
                const found = this.findFileById(file.children, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    getFile(id: string): WorkspaceFile | undefined {
        return this.findFileById(this.state.files, id);
    }

    findFileByPath(list: WorkspaceFile[], targetPath: string): WorkspaceFile | undefined {
        for (const file of list) {
            if (file.path === targetPath) return file;
            if (file.children) {
                const found = this.findFileByPath(file.children, targetPath);
                if (found) return found;
            }
        }
        return undefined;
    }

    async createCard(
        name: string,
        initialContent?: BasicCardConfig,
        cardId?: string,
        parentPath?: string,
        openOptions?: WorkspaceOpenOptions
    ): Promise<WorkspaceFile> {
        const id = cardId || generateId62();
        const parent = parentPath || this.state.rootPath;
        const initializer = createCardInitializer({ workspaceRoot: parent });

        const result = await initializer.createCard(id, name, initialContent);
        if (!result.success) {
            throw new Error(result.error || 'Create card failed');
        }

        await this.refresh();
        const file = this.getFile(id);
        if (file) {
            this.eventEmitter.emit('workspace:file-created', { file, content: initialContent, openOptions });
            return file;
        }

        throw new Error('Card created but not found in workspace tree');
    }

    async createBox(name: string, layoutType?: string, parentPath?: string): Promise<WorkspaceFile> {
        const timestamp = new Date().toISOString();
        const boxId = generateId62();
        const parent = parentPath || this.state.rootPath;
        const boxFolderName = `${boxId}.box`;
        const boxPath = joinPath(parent, boxFolderName);
        const metaDir = joinPath(boxPath, '.box');

        const metadata = {
            chip_standards_version: '1.0.0',
            box_id: boxId,
            name: name.trim(),
            created_at: timestamp,
            modified_at: timestamp,
            layout: layoutType || 'grid',
        };
        const structure = {
            cards: [],
        };
        const content = {
            layout: layoutType || 'grid',
        };

        await fileService.ensureDir(boxPath);
        await fileService.ensureDir(metaDir);
        await fileService.writeText(joinPath(metaDir, 'metadata.yaml'), yaml.stringify(metadata));
        await fileService.writeText(joinPath(metaDir, 'structure.yaml'), yaml.stringify(structure));
        await fileService.writeText(joinPath(metaDir, 'content.yaml'), yaml.stringify(content));

        await this.refresh();
        const file = this.getFile(boxId) || this.findFileByPath(this.state.files, boxPath);
        if (file) {
            this.eventEmitter.emit('workspace:file-created', { file, layoutType });
            return file;
        }

        throw new Error('Box created but not found in workspace tree');
    }

    async createFolder(name: string, parentPath?: string): Promise<WorkspaceFile> {
        const parent = parentPath || this.state.rootPath;
        const folderPath = joinPath(parent, name.trim());

        await fileService.mkdir(folderPath);
        await this.refresh();
        const file = this.findFileByPath(this.state.files, folderPath);
        if (file) {
            this.eventEmitter.emit('workspace:file-created', { file });
            return file;
        }
        throw new Error('Folder created but not found in workspace tree');
    }

    async deleteFile(id: string): Promise<void> {
        const file = this.getFile(id);
        if (!file) return;

        await fileService.delete(file.path);
        await this.refresh();
        this.eventEmitter.emit('workspace:file-deleted', { file });
    }

    async renameFile(id: string, newName: string): Promise<void> {
        const file = this.getFile(id);
        if (!file) return;

        const trimmed = newName.trim();
        if (!trimmed) return;

        if (file.type === 'card' || file.type === 'box') {
            const extension = file.type === 'card' ? '.card' : '.box';
            const cleanName = stripExtension(trimmed, extension);
            const metadataPath = joinPath(file.path, `.${file.type}`, 'metadata.yaml');
            const metadata = (await this.readMetadata(metadataPath)) || {};
            metadata.name = cleanName;
            metadata.modified_at = new Date().toISOString();
            await fileService.writeText(metadataPath, yaml.stringify(metadata));
            await this.refresh();
            this.eventEmitter.emit('workspace:file-renamed', {
                previousFile: file,
                file: {
                    ...file,
                    name: `${cleanName}${extension}`,
                    modifiedAt: String(metadata.modified_at),
                },
            });
            return;
        }

        const parent = file.path.split('/').slice(0, -1).join('/');
        const newPath = joinPath(parent, trimmed);
        await fileService.move(file.path, newPath);
        await this.refresh();
        this.eventEmitter.emit('workspace:file-renamed', {
            previousFile: file,
            file: {
                ...file,
                id: newPath,
                name: trimmed,
                path: newPath,
            },
        });
    }

    getOpenedFiles(): WorkspaceFile[] {
        return this.state.openedFiles
            .map((id: string) => this.getFile(id))
            .filter(Boolean) as WorkspaceFile[];
    }

    openFile(id: string, openOptions?: WorkspaceOpenOptions): void {
        const file = this.getFile(id);
        if (!file) {
            return;
        }

        if (!this.state.openedFiles.includes(id)) {
            this.state.openedFiles.push(id);
        }

        this.eventEmitter.emit('workspace:file-opened', { file, openOptions });
    }

    closeFile(id: string): void {
        const index = this.state.openedFiles.indexOf(id);
        if (index !== -1) {
            this.state.openedFiles.splice(index, 1);
            const file = this.getFile(id);
            this.eventEmitter.emit('workspace:file-closed', { file });
        }
    }
}

export const workspaceService = new WorkspaceService();
