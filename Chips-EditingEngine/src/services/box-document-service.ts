import type {
    BoxContent,
    BoxEntrySnapshot,
    BoxInspectionResult,
    BoxLayoutConfig,
    BoxMetadata,
    ResolvedRuntimeResource,
} from 'chips-sdk';
import yaml from 'yaml';
import { createEventEmitter, type EventEmitter } from '../core/event-emitter';
import { generateId62 } from '../utils/id';
import { getChipsClient } from './bridge-client';
import { fileService } from './file-service';
import { loadLayoutDefinition } from 'chips-box-layout-host';

export const DEFAULT_BOX_LAYOUT_TYPE = 'chips.layout.grid';

export interface BoxDocumentSessionSnapshot {
    boxId: string;
    boxFile: string;
    workspaceDir: string;
    metadata: BoxMetadata;
    content: BoxContent;
    entries: BoxEntrySnapshot[];
    assets: string[];
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt?: string;
}

interface BoxDocumentSessionState {
    snapshot: BoxDocumentSessionSnapshot;
}

function joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function stripExtension(name: string, ext: string): string {
    return name.toLowerCase().endsWith(ext) ? name.slice(0, -ext.length) : name;
}

function ensureWorkspaceRoot(workspaceRoot: string): string {
    const normalized = workspaceRoot.trim();
    if (!normalized) {
        throw new Error('当前工作区未绑定，无法处理箱子文件。');
    }
    return normalized;
}

function sanitizeFileStem(name: string): string {
    const trimmed = stripExtension(name.trim(), '.box')
        .replace(/[\u0000-\u001f]/g, '')
        .replace(/[<>:"/\\|?*]/g, '')
        .trim();
    return trimmed || '未命名箱子';
}

function sanitizeAssetRelativePath(pathLike: string): string {
    const normalized = pathLike.replace(/\\/g, '/').trim();
    const withoutLeading = normalized.replace(/^\.?\//, '');
    const segments = withoutLeading.split('/').filter((segment) => segment.length > 0 && segment !== '.');
    if (segments.length === 0 || segments.some((segment) => segment === '..')) {
        throw new Error(`资源路径无效: ${pathLike}`);
    }

    const safeSegments = segments.map((segment) =>
        segment
            .replace(/[\u0000-\u001f]/g, '')
            .replace(/[<>:"\\|?*]/g, '')
            .trim()
    ).filter(Boolean);

    if (safeSegments.length === 0) {
        throw new Error(`资源路径无效: ${pathLike}`);
    }

    const rooted = safeSegments[0] === 'assets' ? safeSegments : ['assets', 'layouts', ...safeSegments];
    return rooted.join('/');
}

function createFileUrl(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(normalized)) {
        return encodeURI(`file:///${normalized}`);
    }

    const absolutePath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return encodeURI(`file://${absolutePath}`);
}

function toMimeType(pathLike: string): string {
    const lower = pathLike.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
}

function deriveEntryTitle(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'file:') {
            const segments = parsed.pathname.split('/').filter(Boolean);
            const last = decodeURIComponent(segments[segments.length - 1] ?? '');
            return stripExtension(last, '.card') || url;
        }

        if (parsed.hostname) {
            const last = parsed.pathname.split('/').filter(Boolean).pop();
            return last ? decodeURIComponent(last) : parsed.hostname;
        }
    } catch {
        return url;
    }

    return url;
}

function createEmptySnapshot(url: string): BoxEntrySnapshot['snapshot'] {
    return {
        title: deriveEntryTitle(url),
        summary: url,
        cover: {
            mode: 'none',
        },
    };
}

function serializeMetadata(metadata: BoxMetadata): Record<string, unknown> {
    const raw: Record<string, unknown> = {
        chip_standards_version: metadata.chipStandardsVersion,
        box_id: metadata.boxId,
        name: metadata.name,
        created_at: metadata.createdAt,
        modified_at: metadata.modifiedAt,
        active_layout_type: metadata.activeLayoutType,
    };

    if (metadata.description) raw.description = metadata.description;
    if (metadata.tags) raw.tags = metadata.tags;
    if (metadata.coverAsset) raw.cover_asset = metadata.coverAsset;
    if (metadata.owner) raw.owner = metadata.owner;
    if (metadata.source) raw.source = metadata.source;

    return raw;
}

function serializeLayoutConfig(config: BoxLayoutConfig): Record<string, unknown> {
    const raw: Record<string, unknown> = {};
    if (config.schemaVersion) raw.schema_version = config.schemaVersion;
    if (config.props) raw.props = config.props;
    if (config.assetRefs && config.assetRefs.length > 0) raw.asset_refs = config.assetRefs;

    for (const [key, value] of Object.entries(config)) {
        if (key === 'schemaVersion' || key === 'props' || key === 'assetRefs') {
            continue;
        }
        raw[key] = value;
    }

    return raw;
}

function serializeContent(content: BoxContent): Record<string, unknown> {
    return {
        active_layout_type: content.activeLayoutType,
        layout_configs: Object.fromEntries(
            Object.entries(content.layoutConfigs).map(([layoutType, config]) => [
                layoutType,
                serializeLayoutConfig(config),
            ])
        ),
    };
}

function serializeEntry(entry: BoxEntrySnapshot): Record<string, unknown> {
    const rawSnapshot: Record<string, unknown> = {};
    if (entry.snapshot.cardId) rawSnapshot.card_id = entry.snapshot.cardId;
    if (entry.snapshot.title) rawSnapshot.title = entry.snapshot.title;
    if (entry.snapshot.summary) rawSnapshot.summary = entry.snapshot.summary;
    if (entry.snapshot.tags) rawSnapshot.tags = entry.snapshot.tags;
    if (entry.snapshot.cover) {
        rawSnapshot.cover = {
            mode: entry.snapshot.cover.mode,
            ...(entry.snapshot.cover.assetPath ? { asset_path: entry.snapshot.cover.assetPath } : {}),
            ...(entry.snapshot.cover.mimeType ? { mime_type: entry.snapshot.cover.mimeType } : {}),
            ...(typeof entry.snapshot.cover.width === 'number' ? { width: entry.snapshot.cover.width } : {}),
            ...(typeof entry.snapshot.cover.height === 'number' ? { height: entry.snapshot.cover.height } : {}),
        };
    }
    if (entry.snapshot.lastKnownModifiedAt) rawSnapshot.last_known_modified_at = entry.snapshot.lastKnownModifiedAt;
    if (entry.snapshot.contentType) rawSnapshot.content_type = entry.snapshot.contentType;

    const rawHints: Record<string, unknown> = {};
    if (typeof entry.layoutHints?.sortKey !== 'undefined') rawHints.sort_key = entry.layoutHints.sortKey;
    if (typeof entry.layoutHints?.aspectRatio === 'number') rawHints.aspect_ratio = entry.layoutHints.aspectRatio;
    if (entry.layoutHints?.group) rawHints.group = entry.layoutHints.group;
    if (typeof entry.layoutHints?.priority === 'number') rawHints.priority = entry.layoutHints.priority;

    return {
        entry_id: entry.entryId,
        url: entry.url,
        enabled: entry.enabled,
        snapshot: rawSnapshot,
        ...(Object.keys(rawHints).length > 0 ? { layout_hints: rawHints } : {}),
    };
}

function serializeStructure(entries: BoxEntrySnapshot[]): Record<string, unknown> {
    return {
        entries: entries.map((entry) => serializeEntry(entry)),
    };
}

async function ensureDirectory(path: string): Promise<void> {
    const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
    const isAbsolute = path.startsWith('/');
    let current = isAbsolute ? '/' : '';

    for (const segment of segments) {
        current = isAbsolute ? joinPath(current, segment) : (current ? joinPath(current, segment) : segment);
        if (!(await fileService.exists(current))) {
            await fileService.mkdir(current);
        }
    }
}

async function ensureAvailableFilePath(parentPath: string, displayName: string): Promise<string> {
    const stem = sanitizeFileStem(displayName);
    let index = 1;
    let candidate = joinPath(parentPath, `${stem}.box`);

    while (await fileService.exists(candidate)) {
        index += 1;
        candidate = joinPath(parentPath, `${stem}-${index}.box`);
    }

    return candidate;
}

function createInitialDocument(name: string, layoutType: string, config: Record<string, unknown>): {
    metadata: BoxMetadata;
    content: BoxContent;
    entries: BoxEntrySnapshot[];
    assets: string[];
} {
    const timestamp = new Date().toISOString();
    const boxId = generateId62();
    return {
        metadata: {
            chipStandardsVersion: '1.0.0',
            boxId,
            name: name.trim() || '未命名箱子',
            createdAt: timestamp,
            modifiedAt: timestamp,
            activeLayoutType: layoutType,
        },
        content: {
            activeLayoutType: layoutType,
            layoutConfigs: {
                [layoutType]: config as BoxLayoutConfig,
            },
        },
        entries: [],
        assets: [],
    };
}

export class BoxDocumentService {
    private readonly eventEmitter: EventEmitter = createEventEmitter();
    private readonly sessions = new Map<string, BoxDocumentSessionState>();
    private readonly fileIndex = new Map<string, string>();

    on(event: string, handler: (payload: BoxDocumentSessionSnapshot) => void) {
        this.eventEmitter.on(event, handler);
    }

    off(event: string, handler: (payload: BoxDocumentSessionSnapshot) => void) {
        this.eventEmitter.off(event, handler);
    }

    getSession(boxId: string): BoxDocumentSessionSnapshot | null {
        return this.sessions.get(boxId)?.snapshot ?? null;
    }

    async createBoxFile(name: string, layoutType: string | undefined, parentPath: string, workspaceRoot: string): Promise<{
        boxFile: string;
        metadata: BoxMetadata;
    }> {
        const root = ensureWorkspaceRoot(workspaceRoot);
        const targetLayoutType = (layoutType?.trim() || DEFAULT_BOX_LAYOUT_TYPE);
        const layoutDefinition = await loadLayoutDefinition(getChipsClient(), targetLayoutType);
        const defaultConfig = layoutDefinition.normalizeConfig(layoutDefinition.createDefaultConfig());
        const initial = createInitialDocument(name, targetLayoutType, defaultConfig);
        const workDir = await this.createSessionWorkspace(root, initial.metadata.boxId, 'create');

        try {
            await this.writeDocumentFiles(workDir, initial.metadata, initial.content, initial.entries);
            const outputPath = await ensureAvailableFilePath(parentPath, name);
            await getChipsClient().box.pack(workDir, { outputPath });
            return {
                boxFile: outputPath,
                metadata: initial.metadata,
            };
        } finally {
            await fileService.delete(workDir).catch(() => undefined);
        }
    }

    async renameBoxFile(boxFile: string, newName: string, workspaceRoot: string): Promise<{
        boxFile: string;
        metadata: BoxMetadata;
    }> {
        const inspection = await getChipsClient().box.inspect(boxFile);
        const root = ensureWorkspaceRoot(workspaceRoot);
        const workDir = await this.createSessionWorkspace(root, inspection.metadata.boxId, 'rename');

        try {
            await getChipsClient().box.unpack(boxFile, workDir);
            const metadata: BoxMetadata = {
                ...inspection.metadata,
                name: stripExtension(newName.trim(), '.box') || inspection.metadata.name,
                modifiedAt: new Date().toISOString(),
            };
            await this.writeDocumentFiles(workDir, metadata, inspection.content, inspection.entries);
            const parentPath = boxFile.split('/').slice(0, -1).join('/');
            const nextFile = joinPath(parentPath, `${sanitizeFileStem(newName)}.box`);
            await getChipsClient().box.pack(workDir, { outputPath: nextFile });
            if (nextFile !== boxFile) {
                await fileService.delete(boxFile);
            }
            return {
                boxFile: nextFile,
                metadata,
            };
        } finally {
            await fileService.delete(workDir).catch(() => undefined);
        }
    }

    async openBox(boxFile: string, workspaceRoot: string, expectedBoxId?: string): Promise<BoxDocumentSessionSnapshot> {
        if (expectedBoxId) {
            const existing = this.sessions.get(expectedBoxId);
            if (existing) {
                if (existing.snapshot.boxFile !== boxFile) {
                    this.fileIndex.delete(existing.snapshot.boxFile);
                    existing.snapshot = {
                        ...existing.snapshot,
                        boxFile,
                    };
                    this.fileIndex.set(boxFile, expectedBoxId);
                    this.emitSnapshot(existing.snapshot);
                }
                return existing.snapshot;
            }
        }

        const indexedBoxId = this.fileIndex.get(boxFile);
        if (indexedBoxId) {
            const existing = this.sessions.get(indexedBoxId);
            if (existing) {
                return existing.snapshot;
            }
        }

        const root = ensureWorkspaceRoot(workspaceRoot);
        const inspection = await getChipsClient().box.inspect(boxFile);
        const workDir = await this.createSessionWorkspace(root, inspection.metadata.boxId, 'session');
        await getChipsClient().box.unpack(boxFile, workDir);

        const snapshot: BoxDocumentSessionSnapshot = {
            boxId: inspection.metadata.boxId,
            boxFile,
            workspaceDir: workDir,
            metadata: inspection.metadata,
            content: inspection.content,
            entries: inspection.entries,
            assets: inspection.assets,
            isDirty: false,
            isSaving: false,
            lastSavedAt: inspection.metadata.modifiedAt,
        };

        this.sessions.set(snapshot.boxId, { snapshot });
        this.fileIndex.set(boxFile, snapshot.boxId);
        this.emitSnapshot(snapshot);
        return snapshot;
    }

    async closeBox(boxId: string): Promise<void> {
        const session = this.sessions.get(boxId);
        if (!session) {
            return;
        }

        this.sessions.delete(boxId);
        this.fileIndex.delete(session.snapshot.boxFile);
        await fileService.delete(session.snapshot.workspaceDir).catch(() => undefined);
    }

    async saveBox(boxId: string): Promise<BoxDocumentSessionSnapshot> {
        const session = this.requireSession(boxId);
        session.snapshot = {
            ...session.snapshot,
            isSaving: true,
        };
        this.emitSnapshot(session.snapshot);

        const modifiedAt = new Date().toISOString();
        const nextMetadata: BoxMetadata = {
            ...session.snapshot.metadata,
            modifiedAt,
        };

        try {
            await this.writeDocumentFiles(
                session.snapshot.workspaceDir,
                nextMetadata,
                session.snapshot.content,
                session.snapshot.entries,
            );
            await getChipsClient().box.pack(session.snapshot.workspaceDir, { outputPath: session.snapshot.boxFile });
            const inspection = await getChipsClient().box.inspect(session.snapshot.boxFile);
            session.snapshot = {
                ...session.snapshot,
                metadata: inspection.metadata,
                content: inspection.content,
                entries: inspection.entries,
                assets: inspection.assets,
                isDirty: false,
                isSaving: false,
                lastSavedAt: modifiedAt,
            };
            this.emitSnapshot(session.snapshot);
            return session.snapshot;
        } catch (error) {
            session.snapshot = {
                ...session.snapshot,
                metadata: nextMetadata,
                isSaving: false,
            };
            this.emitSnapshot(session.snapshot);
            throw error;
        }
    }

    async readBoxAsset(boxId: string, assetPath: string): Promise<ResolvedRuntimeResource> {
        const session = this.requireSession(boxId).snapshot;
        const normalizedAssetPath = sanitizeAssetRelativePath(assetPath);
        const absolutePath = joinPath(session.workspaceDir, normalizedAssetPath);
        if (!(await fileService.exists(absolutePath))) {
            throw new Error(`箱子资源不存在: ${normalizedAssetPath}`);
        }

        return {
            resourceUrl: createFileUrl(absolutePath),
            mimeType: toMimeType(normalizedAssetPath),
            cacheKey: `editing-box-asset:${boxId}:${normalizedAssetPath}`,
        };
    }

    async importBoxAsset(boxId: string, input: { file: File; preferredPath?: string }): Promise<{ assetPath: string }> {
        const session = this.requireSession(boxId);
        const preferred = input.preferredPath?.trim() || input.file.name;
        const normalized = await this.pickAvailableAssetPath(
            session.snapshot.workspaceDir,
            sanitizeAssetRelativePath(preferred),
        );

        await ensureDirectory(joinPath(session.snapshot.workspaceDir, normalized.split('/').slice(0, -1).join('/')));
        const buffer = new Uint8Array(await input.file.arrayBuffer());
        await fileService.writeBinary(joinPath(session.snapshot.workspaceDir, normalized), buffer);

        session.snapshot = this.markDirty({
            ...session.snapshot,
            assets: [...new Set([...session.snapshot.assets, normalized])].sort(),
        });
        this.emitSnapshot(session.snapshot);

        return {
            assetPath: normalized,
        };
    }

    async deleteBoxAsset(boxId: string, assetPath: string): Promise<void> {
        const session = this.requireSession(boxId);
        const normalizedAssetPath = sanitizeAssetRelativePath(assetPath);
        await fileService.delete(joinPath(session.snapshot.workspaceDir, normalizedAssetPath)).catch(() => undefined);

        const nextLayoutConfigs: BoxContent['layoutConfigs'] = Object.fromEntries(
            Object.entries(session.snapshot.content.layoutConfigs).map(([layoutType, config]) => [
                layoutType,
                {
                    ...config,
                    assetRefs: (config.assetRefs ?? []).filter((item) => item !== normalizedAssetPath),
                },
            ])
        );

        const nextEntries = session.snapshot.entries.map((entry) => (
            entry.snapshot.cover?.assetPath === normalizedAssetPath
                ? {
                    ...entry,
                    snapshot: {
                        ...entry.snapshot,
                        cover: {
                            mode: 'none',
                        },
                    },
                }
                : entry
        ));

        const nextMetadata = session.snapshot.metadata.coverAsset === normalizedAssetPath
            ? {
                ...session.snapshot.metadata,
                coverAsset: undefined,
            }
            : session.snapshot.metadata;

        session.snapshot = this.markDirty({
            ...session.snapshot,
            metadata: nextMetadata,
            content: {
                ...session.snapshot.content,
                layoutConfigs: nextLayoutConfigs,
            },
            entries: nextEntries,
            assets: session.snapshot.assets.filter((item) => item !== normalizedAssetPath),
        });
        this.emitSnapshot(session.snapshot);
    }

    updateLayoutConfig(boxId: string, layoutType: string, config: Record<string, unknown>): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            metadata: {
                ...session.snapshot.metadata,
                activeLayoutType: layoutType,
            },
            content: {
                activeLayoutType: layoutType,
                layoutConfigs: {
                    ...session.snapshot.content.layoutConfigs,
                    [layoutType]: config as BoxLayoutConfig,
                },
            },
        });
        this.emitSnapshot(session.snapshot);
        return session.snapshot;
    }

    addEntry(boxId: string, url: string): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        const trimmed = url.trim();
        if (!trimmed) {
            return session.snapshot;
        }

        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries: [
                ...session.snapshot.entries,
                {
                    entryId: generateId62(),
                    url: trimmed,
                    enabled: true,
                    snapshot: createEmptySnapshot(trimmed),
                    layoutHints: {
                        sortKey: session.snapshot.entries.length,
                    },
                },
            ],
        });
        this.emitSnapshot(session.snapshot);
        return session.snapshot;
    }

    updateEntry(boxId: string, entryId: string, patch: Partial<BoxEntrySnapshot>): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries: session.snapshot.entries.map((entry) => {
                if (entry.entryId !== entryId) {
                    return entry;
                }

                const nextUrl = patch.url ?? entry.url;
                return {
                    ...entry,
                    ...patch,
                    url: nextUrl,
                    snapshot: {
                        ...entry.snapshot,
                        ...(patch.snapshot ?? {}),
                        ...(patch.url ? {
                            title: patch.snapshot?.title ?? entry.snapshot.title ?? deriveEntryTitle(nextUrl),
                            summary: patch.snapshot?.summary ?? entry.snapshot.summary ?? nextUrl,
                        } : {}),
                    },
                    layoutHints: {
                        ...entry.layoutHints,
                        ...(patch.layoutHints ?? {}),
                    },
                };
            }),
        });
        this.emitSnapshot(session.snapshot);
        return session.snapshot;
    }

    moveEntry(boxId: string, entryId: string, direction: 'up' | 'down'): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        const entries = [...session.snapshot.entries];
        const index = entries.findIndex((entry) => entry.entryId === entryId);
        if (index === -1) {
            return session.snapshot;
        }

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= entries.length) {
            return session.snapshot;
        }

        const [current] = entries.splice(index, 1);
        entries.splice(targetIndex, 0, current);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries,
        });
        this.emitSnapshot(session.snapshot);
        return session.snapshot;
    }

    removeEntry(boxId: string, entryId: string): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries: session.snapshot.entries.filter((entry) => entry.entryId !== entryId),
        });
        this.emitSnapshot(session.snapshot);
        return session.snapshot;
    }

    private async writeDocumentFiles(
        workspaceDir: string,
        metadata: BoxMetadata,
        content: BoxContent,
        entries: BoxEntrySnapshot[],
    ): Promise<void> {
        await ensureDirectory(joinPath(workspaceDir, '.box'));
        await fileService.writeText(
            joinPath(workspaceDir, '.box/metadata.yaml'),
            yaml.stringify(serializeMetadata(metadata)),
        );
        await fileService.writeText(
            joinPath(workspaceDir, '.box/content.yaml'),
            yaml.stringify(serializeContent(content)),
        );
        await fileService.writeText(
            joinPath(workspaceDir, '.box/structure.yaml'),
            yaml.stringify(serializeStructure(entries)),
        );
    }

    private async createSessionWorkspace(workspaceRoot: string, boxId: string, prefix: string): Promise<string> {
        const runtimeRoot = joinPath(workspaceRoot, '.chips-editing-engine', 'box-sessions');
        await ensureDirectory(runtimeRoot);
        const sessionDir = joinPath(runtimeRoot, `${prefix}-${boxId}-${Date.now()}`);
        await ensureDirectory(sessionDir);
        return sessionDir;
    }

    private async pickAvailableAssetPath(workspaceDir: string, preferredPath: string): Promise<string> {
        const segments = preferredPath.split('/');
        const fileName = segments.pop() ?? 'asset';
        const dir = segments.join('/');
        const dotIndex = fileName.lastIndexOf('.');
        const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
        const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';
        let candidate = joinPath(dir, `${stem}${ext}`);
        let counter = 1;

        while (await fileService.exists(joinPath(workspaceDir, candidate))) {
            counter += 1;
            candidate = joinPath(dir, `${stem}-${counter}${ext}`);
        }

        return candidate;
    }

    private markDirty(snapshot: BoxDocumentSessionSnapshot): BoxDocumentSessionSnapshot {
        return {
            ...snapshot,
            isDirty: true,
            metadata: {
                ...snapshot.metadata,
                modifiedAt: new Date().toISOString(),
            },
        };
    }

    private requireSession(boxId: string): BoxDocumentSessionState {
        const session = this.sessions.get(boxId);
        if (!session) {
            throw new Error(`箱子会话不存在: ${boxId}`);
        }
        return session;
    }

    private emitSnapshot(snapshot: BoxDocumentSessionSnapshot) {
        this.eventEmitter.emit(`session:${snapshot.boxId}`, snapshot);
        this.eventEmitter.emit('session:changed', snapshot);
    }
}

export const boxDocumentService = new BoxDocumentService();
