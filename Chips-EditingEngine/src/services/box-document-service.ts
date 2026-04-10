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
import { createDefaultCoverHtml } from '../utils/card-cover';
import { getChipsClient } from './bridge-client';
import { fileService } from './file-service';

export const DEFAULT_BOX_LAYOUT_TYPE = 'chips.layout.grid';

export interface BoxDocumentSessionSnapshot {
    boxId: string;
    boxFile: string;
    workspaceDir: string;
    metadata: BoxMetadata;
    coverHtml: string;
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

function sanitizePackageRelativePath(pathLike: string, rootSegment: string): string {
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

    const rooted = safeSegments[0] === rootSegment ? safeSegments : [rootSegment, ...safeSegments];
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
            const fileName = stripExtension(stripExtension(last, '.card'), '.box');
            return fileName || url;
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
    const fileType = detectDocumentFileType(url);
    return {
        title: deriveEntryTitle(url),
        summary: url,
        cover: {
            mode: fileType ? 'runtime' : 'none',
        },
        contentType: fileType === 'box' ? 'chips/box' : fileType === 'card' ? 'chips/card' : undefined,
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

    if (metadata.coverRatio) raw.cover_ratio = metadata.coverRatio;
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
    if (entry.snapshot.documentId) rawSnapshot.document_id = entry.snapshot.documentId;
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

function detectDocumentFileType(pathLike: string): 'card' | 'box' | null {
    const lower = pathLike.toLowerCase();
    if (lower.endsWith('.card')) {
        return 'card';
    }
    if (lower.endsWith('.box')) {
        return 'box';
    }
    return null;
}

async function readCoverHtml(workspaceDir: string, displayName: string): Promise<string> {
    const coverPath = joinPath(workspaceDir, '.box/cover.html');
    const exists = await fileService.exists(coverPath);
    if (!exists) {
        return createDefaultCoverHtml(displayName);
    }
    return fileService.readText(coverPath);
}

async function ensureDirectory(path: string): Promise<void> {
    const segments = path.replace(/\\/g, '/').split('/').filter(Boolean);
    const isAbsolute = path.startsWith('/');
    let current = isAbsolute ? '/' : '';

    for (const segment of segments) {
        current = isAbsolute ? joinPath(current, segment) : (current ? joinPath(current, segment) : segment);
        if (!(await fileService.exists(current))) {
            try {
                await fileService.mkdir(current);
            } catch (error) {
                if (!(await fileService.exists(current))) {
                    throw error;
                }
            }
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
    coverHtml: string;
    content: BoxContent;
    entries: BoxEntrySnapshot[];
    assets: string[];
} {
    const timestamp = new Date().toISOString();
    const boxId = generateId62();
    const displayName = name.trim() || '未命名箱子';
    return {
        metadata: {
            chipStandardsVersion: '1.0.0',
            boxId,
            name: displayName,
            createdAt: timestamp,
            modifiedAt: timestamp,
            activeLayoutType: layoutType,
            coverRatio: '3:4',
        },
        coverHtml: createDefaultCoverHtml(displayName),
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
    private readonly openingByBoxId = new Map<string, Promise<BoxDocumentSessionSnapshot>>();
    private readonly openingByFile = new Map<string, Promise<BoxDocumentSessionSnapshot>>();
    private readonly saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly pendingAutoSaves = new Map<string, Promise<void>>();

    on(event: string, handler: (payload: BoxDocumentSessionSnapshot) => void) {
        this.eventEmitter.on(event, handler);
    }

    off(event: string, handler: (payload: BoxDocumentSessionSnapshot) => void) {
        this.eventEmitter.off(event, handler as unknown as (...args: unknown[]) => void);
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
        const descriptor = await getChipsClient().box.readLayoutDescriptor(targetLayoutType);
        const defaultConfig = await getChipsClient().box.normalizeLayoutConfig(
            targetLayoutType,
            descriptor.defaultConfig ?? {},
        );
        const initial = createInitialDocument(name, targetLayoutType, defaultConfig);
        const workDir = await this.createSessionWorkspace(root, initial.metadata.boxId, 'create');

        try {
            await this.writeDocumentFiles(workDir, initial.metadata, initial.coverHtml, initial.content, initial.entries);
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
            const coverHtml = await readCoverHtml(workDir, metadata.name);
            await this.writeDocumentFiles(workDir, metadata, coverHtml, inspection.content, inspection.entries);
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

        const pendingByBoxId = expectedBoxId ? this.openingByBoxId.get(expectedBoxId) : undefined;
        if (pendingByBoxId) {
            return pendingByBoxId;
        }

        const indexedBoxId = this.fileIndex.get(boxFile);
        if (indexedBoxId) {
            const existing = this.sessions.get(indexedBoxId);
            if (existing) {
                return existing.snapshot;
            }
        }

        const pendingByFile = this.openingByFile.get(boxFile);
        if (pendingByFile) {
            return pendingByFile;
        }

        const openingPromise = this.openBoxInternal(boxFile, workspaceRoot);
        this.openingByFile.set(boxFile, openingPromise);
        if (expectedBoxId) {
            this.openingByBoxId.set(expectedBoxId, openingPromise);
        }

        try {
            return await openingPromise;
        } finally {
            if (this.openingByFile.get(boxFile) === openingPromise) {
                this.openingByFile.delete(boxFile);
            }
            if (expectedBoxId && this.openingByBoxId.get(expectedBoxId) === openingPromise) {
                this.openingByBoxId.delete(expectedBoxId);
            }
        }
    }

    async closeBox(boxId: string): Promise<void> {
        const session = this.sessions.get(boxId);
        if (!session) {
            return;
        }

        this.clearAutoSave(boxId);
        this.sessions.delete(boxId);
        this.fileIndex.delete(session.snapshot.boxFile);
        await fileService.delete(session.snapshot.workspaceDir).catch(() => undefined);
    }

    async saveBox(boxId: string): Promise<BoxDocumentSessionSnapshot> {
        this.clearAutoSave(boxId);
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
                session.snapshot.coverHtml,
                session.snapshot.content,
                session.snapshot.entries,
            );
            await getChipsClient().box.pack(session.snapshot.workspaceDir, { outputPath: session.snapshot.boxFile });
            const inspection = await getChipsClient().box.inspect(session.snapshot.boxFile);
            session.snapshot = {
                ...session.snapshot,
                metadata: inspection.metadata,
                coverHtml: await readCoverHtml(session.snapshot.workspaceDir, inspection.metadata.name),
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
        this.scheduleAutoSave(session.snapshot.boxId);

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
                            mode: 'none' as const,
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
        this.scheduleAutoSave(session.snapshot.boxId);
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
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    updateMetadata(boxId: string, patch: Partial<BoxMetadata>): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            metadata: {
                ...session.snapshot.metadata,
                ...patch,
            },
        });
        this.emitSnapshot(session.snapshot);
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    async updateCover(
        boxId: string,
        input: {
            html: string;
            ratio?: string;
            resources?: Array<{ path: string; data: Uint8Array }>;
        },
    ): Promise<BoxDocumentSessionSnapshot> {
        const session = this.requireSession(boxId);
        const resources = input.resources ?? [];
        const coverRoot = joinPath(session.snapshot.workspaceDir, '.box', 'boxcover');
        await fileService.delete(coverRoot).catch(() => undefined);

        for (const resource of resources) {
            const normalizedPath = sanitizePackageRelativePath(resource.path, 'boxcover');
            const absolutePath = joinPath(session.snapshot.workspaceDir, '.box', normalizedPath);
            await ensureDirectory(joinPath(session.snapshot.workspaceDir, '.box', normalizedPath.split('/').slice(0, -1).join('/')));
            await fileService.writeBinary(absolutePath, resource.data);
        }

        session.snapshot = this.markDirty({
            ...session.snapshot,
            coverHtml: input.html,
            metadata: {
                ...session.snapshot.metadata,
                coverRatio: input.ratio ?? session.snapshot.metadata.coverRatio,
            },
        });
        this.emitSnapshot(session.snapshot);
        this.scheduleAutoSave(session.snapshot.boxId);
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
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    async importDocumentFiles(boxId: string, filePaths: string[]): Promise<BoxDocumentSessionSnapshot> {
        const session = this.requireSession(boxId);
        const entries = await Promise.all(
            filePaths.map(async (filePath) => this.createEntryFromFilePath(filePath))
        );

        const nextEntries = entries.filter((entry): entry is BoxEntrySnapshot => entry !== null);
        if (nextEntries.length === 0) {
            return session.snapshot;
        }

        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries: [
                ...session.snapshot.entries,
                ...nextEntries.map((entry, index) => ({
                    ...entry,
                    layoutHints: {
                        ...entry.layoutHints,
                        sortKey: session.snapshot.entries.length + index,
                    },
                })),
            ],
        });
        this.emitSnapshot(session.snapshot);
        this.scheduleAutoSave(session.snapshot.boxId);
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
                const nextFileType = patch.url ? detectDocumentFileType(nextUrl) : null;
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
                            contentType: nextFileType === 'box'
                                ? 'chips/box'
                                : nextFileType === 'card'
                                    ? 'chips/card'
                                    : (patch.snapshot?.contentType ?? entry.snapshot.contentType),
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
        this.scheduleAutoSave(session.snapshot.boxId);
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
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    moveEntryToIndex(boxId: string, entryId: string, targetIndex: number): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        const entries = [...session.snapshot.entries];
        const currentIndex = entries.findIndex((entry) => entry.entryId === entryId);
        if (currentIndex === -1) {
            return session.snapshot;
        }

        const nextIndex = Math.max(0, Math.min(targetIndex, entries.length - 1));
        if (currentIndex === nextIndex) {
            return session.snapshot;
        }

        const [current] = entries.splice(currentIndex, 1);
        entries.splice(nextIndex, 0, current);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries,
        });
        this.emitSnapshot(session.snapshot);
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    removeEntry(boxId: string, entryId: string): BoxDocumentSessionSnapshot {
        const session = this.requireSession(boxId);
        session.snapshot = this.markDirty({
            ...session.snapshot,
            entries: session.snapshot.entries.filter((entry) => entry.entryId !== entryId),
        });
        this.emitSnapshot(session.snapshot);
        this.scheduleAutoSave(session.snapshot.boxId);
        return session.snapshot;
    }

    private async createEntryFromFilePath(filePath: string): Promise<BoxEntrySnapshot | null> {
        const fileType = detectDocumentFileType(filePath);
        if (!fileType) {
            return null;
        }

        const url = createFileUrl(filePath);
        const client = getChipsClient();

        if (fileType === 'box') {
            const metadata = await client.box.readMetadata(filePath);
            return {
                entryId: generateId62(),
                url,
                enabled: true,
                snapshot: {
                    documentId: metadata.boxId,
                    title: metadata.name,
                    summary: metadata.name,
                    tags: metadata.tags,
                    cover: {
                        mode: 'runtime',
                    },
                    contentType: 'chips/box',
                },
                layoutHints: {},
            };
        }

        const info = await client.card.readInfo(filePath, ['status', 'metadata', 'cover']);
        return {
            entryId: generateId62(),
            url,
            enabled: true,
            snapshot: {
                documentId: info.info.metadata?.cardId,
                title: info.info.metadata?.name ?? deriveEntryTitle(url),
                summary: info.info.metadata?.name ?? deriveEntryTitle(url),
                tags: info.info.metadata?.tags,
                cover: {
                    mode: info.info.cover ? 'runtime' : 'none',
                },
                contentType: 'chips/card',
            },
            layoutHints: {},
        };
    }

    private async writeDocumentFiles(
        workspaceDir: string,
        metadata: BoxMetadata,
        coverHtml: string,
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
            joinPath(workspaceDir, '.box/cover.html'),
            coverHtml,
        );
        await fileService.writeText(
            joinPath(workspaceDir, '.box/structure.yaml'),
            yaml.stringify(serializeStructure(entries)),
        );
    }

    private async createSessionWorkspace(workspaceRoot: string, boxId: string, prefix: string): Promise<string> {
        const runtimeRoot = joinPath(workspaceRoot, '.chips-editing-engine', 'box-sessions');
        await ensureDirectory(runtimeRoot);
        const sessionDir = joinPath(runtimeRoot, `${prefix}-${boxId}-${Date.now()}-${generateId62()}`);
        await ensureDirectory(sessionDir);
        return sessionDir;
    }

    private async openBoxInternal(boxFile: string, workspaceRoot: string): Promise<BoxDocumentSessionSnapshot> {
        const root = ensureWorkspaceRoot(workspaceRoot);
        const inspection = await getChipsClient().box.inspect(boxFile);
        const workDir = await this.createSessionWorkspace(root, inspection.metadata.boxId, 'session');
        await getChipsClient().box.unpack(boxFile, workDir);
        const coverHtml = await readCoverHtml(workDir, inspection.metadata.name);

        const snapshot: BoxDocumentSessionSnapshot = {
            boxId: inspection.metadata.boxId,
            boxFile,
            workspaceDir: workDir,
            metadata: inspection.metadata,
            coverHtml,
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

    private clearAutoSave(boxId: string): void {
        const timer = this.saveTimers.get(boxId);
        if (timer) {
            clearTimeout(timer);
            this.saveTimers.delete(boxId);
        }
    }

    private scheduleAutoSave(boxId: string): void {
        this.clearAutoSave(boxId);
        const timer = setTimeout(() => {
            this.saveTimers.delete(boxId);
            void this.flushAutoSave(boxId);
        }, 180);
        this.saveTimers.set(boxId, timer);
    }

    private async flushAutoSave(boxId: string): Promise<void> {
        const pending = this.pendingAutoSaves.get(boxId);
        if (pending) {
            await pending;
            const latest = this.sessions.get(boxId);
            if (latest?.snapshot.isDirty) {
                this.scheduleAutoSave(boxId);
            }
            return;
        }

        const session = this.sessions.get(boxId);
        if (!session || !session.snapshot.isDirty) {
            return;
        }

        const savePromise = this.saveBox(boxId)
            .then(() => undefined)
            .catch((error) => {
                console.error('[BoxDocumentService] 自动保存箱子失败。', {
                    boxId,
                    error,
                });
            })
            .finally(() => {
                if (this.pendingAutoSaves.get(boxId) === savePromise) {
                    this.pendingAutoSaves.delete(boxId);
                }
                const latest = this.sessions.get(boxId);
                if (latest?.snapshot.isDirty) {
                    this.scheduleAutoSave(boxId);
                }
            });

        this.pendingAutoSaves.set(boxId, savePromise);
        await savePromise;
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
