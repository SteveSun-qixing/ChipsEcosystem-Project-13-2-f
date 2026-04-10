/**
 * 卡片服务
 * @module core/card-service
 * @description 管理解压态 `.card` 目录的读取、编辑与自动保存
 */

import yaml from 'yaml';
import { fileService } from '../services/file-service';
import { generateId62 } from '../utils/id';
import {
    createDefaultCoverHtml,
    DEFAULT_COVER_RATIO,
    normalizeCoverRatio,
    type CardCoverResource,
} from '../utils/card-cover';
import { globalEventEmitter } from './event-emitter';
import {
    createInitialBasecardConfig,
    getBasecardDescriptor,
    normalizeBasecardConfig,
    normalizeBasecardType,
} from '../basecard-runtime/registry';
import type { BasecardResourceOperations } from '../basecard-runtime/contracts';

interface PendingBasicCardResourceImport {
    path: string;
    data: Uint8Array;
    mimeType?: string;
    token: string;
}

export interface BasicCardData {
    id: string;
    type: string;
    data: Record<string, unknown>;
    createdAt: string;
    modifiedAt: string;
    pendingResourceImports?: Map<string, PendingBasicCardResourceImport>;
}

export interface CardMetadata {
    name: string;
    description?: string;
    themeId?: string;
    coverPath?: string;
    coverRatio?: string;
    createdAt: string;
    modifiedAt: string;
    tags?: string[];
}

export interface CardStructure {
    basicCards: BasicCardData[];
    layout?: {
        padding?: number;
        gap?: number;
    };
}

export interface CompositeCard {
    id: string;
    path: string;
    metadata: CardMetadata;
    cover?: {
        html: string;
        ratio: string;
        resources: CardCoverResource[];
    };
    structure: CardStructure;
    isDirty: boolean;
    isEditing: boolean;
    isPersisting?: boolean;
    persistedRevision?: number;
    pendingPersistRevision?: number;
    lastPersistedAt?: string;
    pendingResourceDeletions: Set<string>;
}

export interface CardServiceState {
    openedCards: Map<string, CompositeCard>;
    selectedCardId: string | null;
    selectedBasicCardId: string | null;
}

export interface UpdateBasicCardOptions {
    persist?: boolean;
}

export type CardServiceListener = (state: CardServiceState) => void;

let cardServiceInstance: CardService | null = null;

function now(): string {
    return new Date().toISOString();
}

function joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeBasicCardData(id: string, type: string, rawData: Record<string, unknown>): Record<string, unknown> {
    return normalizeBasecardConfig(type, id, rawData);
}

function createDefaultBasicCardData(type: string, id: string): Record<string, unknown> {
    return createInitialBasecardConfig(type, id);
}

function cloneValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
    return new Uint8Array(bytes);
}

function normalizeResourcePath(resourcePath: string): string | null {
    const normalized = resourcePath.replace(/\\/g, '/').trim();
    if (!normalized) {
        return null;
    }

    const segments = normalized
        .replace(/^\.?\//, '')
        .split('/')
        .filter((segment) => segment.length > 0 && segment !== '.');
    if (segments.length === 0 || segments.some((segment) => segment === '..')) {
        return null;
    }

    return segments.join('/');
}

function splitResourcePathSegments(resourcePath: string): string[] {
    return resourcePath.replace(/\\/g, '/').split('/').filter(Boolean);
}

function createPendingResourceToken(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessMimeType(resourcePath: string, fallback?: string): string {
    if (fallback && fallback.trim().length > 0) {
        return fallback;
    }

    const normalized = resourcePath.toLowerCase();
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
    if (normalized.endsWith('.gif')) return 'image/gif';
    if (normalized.endsWith('.webp')) return 'image/webp';
    if (normalized.endsWith('.svg')) return 'image/svg+xml';
    if (normalized.endsWith('.bmp')) return 'image/bmp';
    if (normalized.endsWith('.avif')) return 'image/avif';
    if (normalized.endsWith('.mp4')) return 'video/mp4';
    if (normalized.endsWith('.webm')) return 'video/webm';
    if (normalized.endsWith('.mp3')) return 'audio/mpeg';
    if (normalized.endsWith('.wav')) return 'audio/wav';
    if (normalized.endsWith('.json')) return 'application/json';
    if (normalized.endsWith('.pdf')) return 'application/pdf';
    if (normalized.endsWith('.txt')) return 'text/plain';
    return 'application/octet-stream';
}

function collectResourcePaths(type: string, config: Record<string, unknown>): string[] {
    const descriptor = getBasecardDescriptor(type);
    if (!descriptor?.collectResourcePaths) {
        return [];
    }

    const paths = descriptor.collectResourcePaths(config);
    const unique = new Set<string>();
    for (const rawPath of paths) {
        const normalizedPath = normalizeResourcePath(rawPath);
        if (normalizedPath) {
            unique.add(normalizedPath);
        }
    }

    return [...unique];
}

function createPersistSnapshot(card: CompositeCard): CompositeCard {
    return {
        ...card,
        pendingResourceDeletions: new Set(card.pendingResourceDeletions),
        metadata: cloneValue(card.metadata),
        cover: card.cover ? {
            html: card.cover.html,
            ratio: card.cover.ratio,
            resources: card.cover.resources.map((resource) => ({
                path: resource.path,
                data: new Uint8Array(resource.data),
            })),
        } : undefined,
        structure: {
            layout: card.structure.layout ? cloneValue(card.structure.layout) : undefined,
            basicCards: card.structure.basicCards.map((basicCard) => ({
                ...basicCard,
                data: cloneValue(basicCard.data),
                pendingResourceImports: basicCard.pendingResourceImports
                    ? new Map(
                        Array.from(basicCard.pendingResourceImports.entries()).map(([resourcePath, resource]) => ([
                            resourcePath,
                            {
                                path: resource.path,
                                data: cloneBytes(resource.data),
                                mimeType: resource.mimeType,
                                token: resource.token,
                            },
                        ])),
                    )
                    : undefined,
            })),
        },
    };
}

export class CardService {
    private listeners: Set<CardServiceListener> = new Set();
    private persistTasks: Map<string, Promise<void>> = new Map();
    private state: CardServiceState = {
        openedCards: new Map(),
        selectedCardId: null,
        selectedBasicCardId: null,
    };

    subscribe(listener: CardServiceListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        const snapshot = this.getState();
        this.listeners.forEach(listener => listener(snapshot));
        globalEventEmitter.emit('card:state-changed', snapshot);
    }

    getState(): CardServiceState {
        return {
            openedCards: new Map(this.state.openedCards),
            selectedCardId: this.state.selectedCardId,
            selectedBasicCardId: this.state.selectedBasicCardId,
        };
    }

    getOpenedCards(): CompositeCard[] {
        return Array.from(this.state.openedCards.values());
    }

    getSelectedCardId(): string | null {
        return this.state.selectedCardId;
    }

    getSelectedBasicCardId(): string | null {
        return this.state.selectedBasicCardId;
    }

    getCard(id: string): CompositeCard | undefined {
        return this.state.openedCards.get(id);
    }

    private markCardDirty(card: CompositeCard): void {
        const persistedRevision = card.persistedRevision ?? 0;
        const pendingPersistRevision = card.pendingPersistRevision ?? persistedRevision;
        card.isDirty = true;
        card.isPersisting = true;
        card.pendingPersistRevision = pendingPersistRevision + 1;
    }

    private queuePersist(cardId: string): Promise<void> {
        const existingTask = this.persistTasks.get(cardId);
        if (existingTask) {
            return existingTask;
        }

        const task = this.runPersistLoop(cardId)
            .catch((error) => {
                const card = this.state.openedCards.get(cardId);
                if (card) {
                    card.isPersisting = false;
                    card.isDirty = true;
                    this.notify();
                }
                console.error('[CardService] Failed to persist card.', { cardId, error });
                globalEventEmitter.emit('card:persist-error', { cardId, error });
            })
            .finally(() => {
                if (this.persistTasks.get(cardId) === task) {
                    this.persistTasks.delete(cardId);
                }
            });

        this.persistTasks.set(cardId, task);
        return task;
    }

    private async runPersistLoop(cardId: string): Promise<void> {
        while (true) {
            const currentCard = this.state.openedCards.get(cardId);
            if (!currentCard) {
                return;
            }

            const targetRevision = currentCard.pendingPersistRevision ?? currentCard.persistedRevision ?? 0;
            const snapshot = createPersistSnapshot(currentCard);
            await this.persistCard(snapshot);

            const liveCard = this.state.openedCards.get(cardId);
            if (!liveCard) {
                return;
            }

            this.clearPersistedResourceImports(liveCard, snapshot);
            liveCard.persistedRevision = targetRevision;
            liveCard.lastPersistedAt = now();

            const latestPendingRevision = liveCard.pendingPersistRevision ?? targetRevision;
            const stillDirty = latestPendingRevision > targetRevision;
            liveCard.isDirty = stillDirty;
            liveCard.isPersisting = stillDirty;

            this.notify();
            globalEventEmitter.emit('card:persisted', {
                cardId,
                revision: targetRevision,
                card: liveCard,
            });

            if (!stillDirty) {
                return;
            }
        }
    }

    async createCard(
        name: string,
        initialBasicCard?: { type: string; data?: Record<string, unknown> }
    ): Promise<CompositeCard> {
        const id = generateId62();
        const timestamp = now();
        const initialId = generateId62();
        const normalizedInitialType = initialBasicCard ? normalizeBasecardType(initialBasicCard.type) : null;
        const basicCards: BasicCardData[] = initialBasicCard && normalizedInitialType ? [{
            id: initialId,
            type: normalizedInitialType,
            data: normalizeBasicCardData(
                initialId,
                normalizedInitialType,
                initialBasicCard.data ?? createDefaultBasicCardData(normalizedInitialType, initialId),
            ),
            createdAt: timestamp,
            modifiedAt: timestamp,
        }] : [];

        const newCard: CompositeCard = {
            id,
            path: `/${id}.card`,
            metadata: {
                name,
                coverRatio: DEFAULT_COVER_RATIO,
                createdAt: timestamp,
                modifiedAt: timestamp,
            },
            cover: {
                html: createDefaultCoverHtml(name),
                ratio: DEFAULT_COVER_RATIO,
                resources: [],
            },
            structure: {
                basicCards,
                layout: {
                    padding: 16,
                    gap: 12,
                },
            },
            isDirty: true,
            isEditing: true,
            isPersisting: false,
            persistedRevision: 0,
            pendingPersistRevision: 0,
            pendingResourceDeletions: new Set(),
        };

        this.state.openedCards.set(id, newCard);
        this.state.selectedCardId = id;
        this.state.selectedBasicCardId = basicCards[0]?.id ?? null;

        this.notify();
        globalEventEmitter.emit('card:created', { card: newCard });

        return newCard;
    }

    async openCard(id: string, cardPath: string): Promise<CompositeCard> {
        const existing = this.state.openedCards.get(id);
        if (existing) {
            this.state.selectedCardId = id;
            this.state.selectedBasicCardId = existing.structure.basicCards[0]?.id ?? null;
            this.notify();
            return existing;
        }

        const metadataPath = joinPath(cardPath, '.card/metadata.yaml');
        const structurePath = joinPath(cardPath, '.card/structure.yaml');
        const coverPath = joinPath(cardPath, '.card/cover.html');

        const metadataRaw = yaml.parse(await fileService.readText(metadataPath)) as Record<string, unknown>;
        const structureRaw = yaml.parse(await fileService.readText(structurePath)) as Record<string, unknown>;
        const coverHtml = await fileService.exists(coverPath)
            ? await fileService.readText(coverPath)
            : createDefaultCoverHtml(asString(metadataRaw.name) ?? id);
        const structureEntries = Array.isArray(structureRaw.structure) ? structureRaw.structure : [];

        const basicCards: BasicCardData[] = [];

        for (const entry of structureEntries) {
            const record = asRecord(entry);
            const basicCardId = asString(record.id);
            const typeValue = asString(record.type);
            const type = typeValue ? normalizeBasecardType(typeValue) : undefined;
            if (!basicCardId || !type) {
                continue;
            }

            const contentPath = joinPath(cardPath, 'content', `${basicCardId}.yaml`);
            let parsedContent: Record<string, unknown> = {};
            if (await fileService.exists(contentPath)) {
                parsedContent = asRecord(yaml.parse(await fileService.readText(contentPath)));
            }

            basicCards.push({
                id: basicCardId,
                type,
                data: normalizeBasicCardData(basicCardId, type, parsedContent),
                createdAt: asString(record.created_at) ?? asString(metadataRaw.created_at) ?? now(),
                modifiedAt: asString(record.modified_at) ?? asString(metadataRaw.modified_at) ?? now(),
            });
        }

        const card: CompositeCard = {
            id,
            path: cardPath,
            metadata: {
                name: asString(metadataRaw.name) ?? id,
                description: asString(metadataRaw.description),
                themeId: asString(metadataRaw.theme),
                coverRatio: normalizeCoverRatio(asString(metadataRaw.cover_ratio) ?? asString(metadataRaw.coverRatio)),
                createdAt: asString(metadataRaw.created_at) ?? now(),
                modifiedAt: asString(metadataRaw.modified_at) ?? now(),
                tags: Array.isArray(metadataRaw.tags) ? metadataRaw.tags.map((tag) => String(tag)) : undefined,
            },
            cover: {
                html: coverHtml,
                ratio: normalizeCoverRatio(asString(metadataRaw.cover_ratio) ?? asString(metadataRaw.coverRatio)),
                resources: [],
            },
            structure: {
                basicCards,
                layout: { padding: 16, gap: 12 },
            },
            isDirty: false,
            isEditing: true,
            isPersisting: false,
            persistedRevision: 0,
            pendingPersistRevision: 0,
            pendingResourceDeletions: new Set(),
        };

        this.state.openedCards.set(id, card);
        this.state.selectedCardId = id;
        this.state.selectedBasicCardId = basicCards[0]?.id ?? null;

        this.notify();
        globalEventEmitter.emit('card:opened', { card });

        return card;
    }

    closeCard(id: string): void {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        this.state.openedCards.delete(id);

        if (this.state.selectedCardId === id) {
            this.state.selectedCardId = null;
            this.state.selectedBasicCardId = null;
        }

        this.notify();
        globalEventEmitter.emit('card:closed', { card });
    }

    async saveCard(id: string): Promise<void> {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        if (card.isDirty) {
            if ((card.pendingPersistRevision ?? 0) <= (card.persistedRevision ?? 0)) {
                this.markCardDirty(card);
                this.notify();
            }
            await this.queuePersist(id);
        } else if (card.isPersisting) {
            await (this.persistTasks.get(id) ?? Promise.resolve());
        }

        const latestCard = this.state.openedCards.get(id);
        if (latestCard) {
            const deletedResourceCount = await this.finalizeCardResources(latestCard);
            if (deletedResourceCount > 0) {
                await this.persistCard(createPersistSnapshot(latestCard));
                latestCard.lastPersistedAt = now();
            }
            globalEventEmitter.emit('card:saved', { card: latestCard });
        }
    }

    addBasicCard(
        cardId: string,
        type: string,
        data?: Record<string, unknown>,
        position?: number
    ): BasicCardData | null {
        const card = this.state.openedCards.get(cardId);
        if (!card) return null;

        const timestamp = now();
        const basicCardId = generateId62();
        const normalizedType = normalizeBasecardType(type);
        const basicCard: BasicCardData = {
            id: basicCardId,
            type: normalizedType,
            data: normalizeBasicCardData(
                basicCardId,
                normalizedType,
                data ?? createDefaultBasicCardData(normalizedType, basicCardId),
            ),
            createdAt: timestamp,
            modifiedAt: timestamp,
        };

        if (position !== undefined && position >= 0 && position <= card.structure.basicCards.length) {
            card.structure.basicCards.splice(position, 0, basicCard);
        } else {
            card.structure.basicCards.push(basicCard);
        }

        this.markCardDirty(card);
        card.metadata.modifiedAt = timestamp;
        this.state.selectedBasicCardId = basicCard.id;

        this.notify();
        void this.queuePersist(cardId);
        globalEventEmitter.emit('card:basic-card-added', { cardId, basicCard, position });

        return basicCard;
    }

    removeBasicCard(cardId: string, basicCardId: string): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const index = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
        if (index === -1) {
            return;
        }

        const basicCard = card.structure.basicCards[index];
        if (basicCard) {
            const referencedPaths = collectResourcePaths(basicCard.type, basicCard.data);
            const pendingImports = basicCard.pendingResourceImports;
            for (const resourcePath of referencedPaths) {
                if (pendingImports?.has(resourcePath)) {
                    pendingImports.delete(resourcePath);
                    continue;
                }
                card.pendingResourceDeletions.add(resourcePath);
            }
        }

        card.structure.basicCards.splice(index, 1);
        this.markCardDirty(card);
        card.metadata.modifiedAt = now();

        if (this.state.selectedBasicCardId === basicCardId) {
            this.state.selectedBasicCardId = card.structure.basicCards[0]?.id ?? null;
        }

        this.notify();
        void this.queuePersist(cardId);
        globalEventEmitter.emit('card:basic-card-removed', { cardId, basicCardId });
    }

    moveBasicCard(cardId: string, basicCardId: string, newPosition: number): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const currentIndex = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
        if (currentIndex === -1) return;

        const [basicCard] = card.structure.basicCards.splice(currentIndex, 1);
        if (!basicCard) {
            return;
        }

        const boundedPosition = Math.max(0, Math.min(newPosition, card.structure.basicCards.length));
        card.structure.basicCards.splice(boundedPosition, 0, basicCard);
        this.markCardDirty(card);
        card.metadata.modifiedAt = now();

        this.notify();
        void this.queuePersist(cardId);
        globalEventEmitter.emit('card:basic-card-moved', { cardId, basicCardId, newPosition: boundedPosition });
    }

    updateBasicCard(
        cardId: string,
        basicCardId: string,
        data: Record<string, unknown>,
        resourceOperations?: BasecardResourceOperations,
        options?: UpdateBasicCardOptions,
    ): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const basicCard = card.structure.basicCards.find(bc => bc.id === basicCardId);
        if (!basicCard) {
            return;
        }

        basicCard.data = normalizeBasicCardData(basicCardId, basicCard.type, data);

        if (!basicCard.pendingResourceImports) {
            basicCard.pendingResourceImports = new Map();
        }

        for (const resource of resourceOperations?.imports ?? []) {
            const normalizedPath = normalizeResourcePath(resource.path);
            if (!normalizedPath) {
                continue;
            }

            basicCard.pendingResourceImports.set(normalizedPath, {
                path: normalizedPath,
                data: cloneBytes(resource.data),
                mimeType: resource.mimeType,
                token: createPendingResourceToken(),
            });
            card.pendingResourceDeletions.delete(normalizedPath);
        }

        for (const resourcePath of resourceOperations?.deletions ?? []) {
            const normalizedPath = normalizeResourcePath(resourcePath);
            if (!normalizedPath) {
                continue;
            }

            const removedPendingImport = basicCard.pendingResourceImports.delete(normalizedPath);
            if (!removedPendingImport) {
                card.pendingResourceDeletions.add(normalizedPath);
            }
        }

        for (const referencedPath of collectResourcePaths(basicCard.type, basicCard.data)) {
            card.pendingResourceDeletions.delete(referencedPath);
        }

        if (basicCard.pendingResourceImports.size === 0) {
            delete basicCard.pendingResourceImports;
        }

        basicCard.modifiedAt = now();
        this.markCardDirty(card);
        card.metadata.modifiedAt = now();

        this.notify();
        if (options?.persist !== false) {
            void this.queuePersist(cardId);
        }
        globalEventEmitter.emit('card:basic-card-updated', { cardId, basicCardId, data: basicCard.data });
    }

    selectCard(id: string | null): void {
        this.state.selectedCardId = id;
        if (id === null) {
            this.state.selectedBasicCardId = null;
        } else {
            const selectedCard = this.state.openedCards.get(id);
            this.state.selectedBasicCardId = selectedCard?.structure.basicCards[0]?.id ?? null;
        }
        this.notify();
        globalEventEmitter.emit('card:selected', { cardId: id });
    }

    selectBasicCard(basicCardId: string | null): void {
        this.state.selectedBasicCardId = basicCardId;
        this.notify();
        globalEventEmitter.emit('card:basic-card-selected', { basicCardId });
    }

    updateCardMetadata(id: string, metadata: Partial<CardMetadata>): void {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        card.metadata = { ...card.metadata, ...metadata, modifiedAt: now() };
        this.markCardDirty(card);

        this.notify();
        void this.queuePersist(id);
        globalEventEmitter.emit('card:metadata-updated', { cardId: id, metadata });
    }

    syncCardWorkspaceSnapshot(id: string, input: {
        name?: string;
        path?: string;
        modifiedAt?: string;
    }): void {
        const card = this.state.openedCards.get(id);
        if (!card) {
            return;
        }

        let hasChanges = false;
        const nextName = asString(input.name);
        const nextPath = asString(input.path);
        const nextModifiedAt = asString(input.modifiedAt);

        if (nextName && nextName !== card.metadata.name) {
            card.metadata.name = nextName;
            hasChanges = true;
        }

        if (nextPath && nextPath !== card.path) {
            card.path = nextPath;
            hasChanges = true;
        }

        if (nextModifiedAt && nextModifiedAt !== card.metadata.modifiedAt) {
            card.metadata.modifiedAt = nextModifiedAt;
            hasChanges = true;
        }

        if (!hasChanges) {
            return;
        }

        this.notify();
        globalEventEmitter.emit('card:workspace-synced', {
            cardId: id,
            name: nextName,
            path: nextPath,
            modifiedAt: nextModifiedAt,
        });
    }

    updateCardCover(id: string, input: {
        html: string;
        ratio?: string;
        resources?: CardCoverResource[];
    }): void {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        const nextRatio = normalizeCoverRatio(input.ratio ?? card.metadata.coverRatio ?? card.cover?.ratio);
        card.cover = {
            html: input.html,
            ratio: nextRatio,
            resources: (input.resources ?? []).map((resource) => ({
                path: resource.path,
                data: new Uint8Array(resource.data),
            })),
        };
        card.metadata.coverRatio = nextRatio;
        card.metadata.modifiedAt = now();
        this.markCardDirty(card);

        this.notify();
        void this.queuePersist(id);
        globalEventEmitter.emit('card:cover-updated', {
            cardId: id,
            ratio: nextRatio,
        });
    }

    toggleEditMode(id: string): void {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        card.isEditing = !card.isEditing;
        this.notify();
        globalEventEmitter.emit('card:edit-mode-changed', { cardId: id, isEditing: card.isEditing });
    }

    reset(): void {
        this.persistTasks.clear();
        this.state = {
            openedCards: new Map(),
            selectedCardId: null,
            selectedBasicCardId: null,
        };
        this.notify();
        globalEventEmitter.emit('card:reset', {});
    }

    private async persistCard(card: CompositeCard): Promise<void> {
        const metadataPath = joinPath(card.path, '.card', 'metadata.yaml');
        const structurePath = joinPath(card.path, '.card', 'structure.yaml');
        const coverPath = joinPath(card.path, '.card', 'cover.html');
        const contentDir = joinPath(card.path, 'content');

        await fileService.ensureDir(joinPath(card.path, '.card'));
        await fileService.ensureDir(contentDir);

        const metadata = {
            chip_standards_version: '1.0.0',
            card_id: card.id,
            name: card.metadata.name,
            created_at: card.metadata.createdAt,
            modified_at: card.metadata.modifiedAt,
            theme: card.metadata.themeId ?? '',
            cover_ratio: normalizeCoverRatio(card.metadata.coverRatio ?? card.cover?.ratio),
            description: card.metadata.description ?? '',
            tags: card.metadata.tags ?? [],
        };

        await fileService.writeText(metadataPath, yaml.stringify(metadata));
        await fileService.writeText(
            coverPath,
            card.cover?.html ?? createDefaultCoverHtml(card.metadata.name),
        );

        const expectedContentFiles = new Set<string>();
        for (const basicCard of card.structure.basicCards) {
            const contentPath = joinPath(contentDir, `${basicCard.id}.yaml`);
            expectedContentFiles.add(contentPath);
            await fileService.writeText(contentPath, yaml.stringify(basicCard.data));
        }

        for (const basicCard of card.structure.basicCards) {
            for (const resource of basicCard.pendingResourceImports?.values() ?? []) {
                const resourcePath = joinPath(card.path, resource.path);
                const resourceDir = resourcePath.split('/').slice(0, -1).join('/');
                await fileService.ensureDir(resourceDir);
                await fileService.writeBinary(resourcePath, resource.data);
            }
        }

        for (const resource of card.cover?.resources ?? []) {
            const resourcePath = joinPath(card.path, '.card', resource.path);
            const resourceDir = resourcePath.split('/').slice(0, -1).join('/');
            await fileService.ensureDir(resourceDir);
            await fileService.writeBinary(resourcePath, resource.data);
        }

        for (const entry of await fileService.list(contentDir)) {
            if (!entry.isDirectory && entry.path.endsWith('.yaml') && !expectedContentFiles.has(entry.path)) {
                await fileService.delete(entry.path);
            }
        }

        const structure = {
            structure: card.structure.basicCards.map((basicCard) => ({
                id: basicCard.id,
                type: basicCard.type,
                created_at: basicCard.createdAt,
                modified_at: basicCard.modifiedAt,
            })),
            manifest: {
                card_count: card.structure.basicCards.length,
                ...(await this.buildResourceManifest(card.path)),
            },
        };

        await fileService.writeText(structurePath, yaml.stringify(structure));
    }

    private async buildResourceManifest(cardPath: string): Promise<{
        resource_count: number;
        resources: Array<{ path: string; size: number; type: string }>;
    }> {
        const entries = await fileService.list(cardPath, { recursive: true });
        const resources: Array<{ path: string; size: number; type: string }> = [];

        for (const entry of entries) {
            if ((entry as { isDirectory?: boolean }).isDirectory) {
                continue;
            }

            const normalizedPath = entry.path.replace(/\\/g, '/');
            const relativePath = normalizedPath.startsWith(`${cardPath}/`)
                ? normalizedPath.slice(cardPath.length + 1)
                : normalizedPath;
            const resourcePath = normalizeResourcePath(relativePath);
            if (!resourcePath) {
                continue;
            }
            if (resourcePath.startsWith('.card/') || resourcePath.startsWith('content/')) {
                continue;
            }

            const stat = await fileService.stat(entry.path);
            resources.push({
                path: resourcePath,
                size: stat.size,
                type: guessMimeType(resourcePath),
            });
        }

        resources.sort((left, right) => left.path.localeCompare(right.path));
        return {
            resource_count: resources.length,
            resources,
        };
    }

    private async pruneEmptyResourceDirectories(cardPath: string, resourcePath: string): Promise<void> {
        const segments = splitResourcePathSegments(resourcePath);
        if (segments.length <= 1) {
            return;
        }

        for (let index = segments.length - 2; index >= 0; index -= 1) {
            const directoryPath = joinPath(cardPath, ...segments.slice(0, index + 1));
            if (!(await fileService.exists(directoryPath))) {
                continue;
            }

            const children = await fileService.list(directoryPath);
            if (children.length > 0) {
                break;
            }

            await fileService.delete(directoryPath);
        }
    }

    private async finalizeCardResources(card: CompositeCard): Promise<number> {
        if (card.pendingResourceDeletions.size === 0) {
            return 0;
        }

        const referencedPaths = new Set<string>();
        for (const basicCard of card.structure.basicCards) {
            for (const resourcePath of collectResourcePaths(basicCard.type, basicCard.data)) {
                referencedPaths.add(resourcePath);
            }
        }

        let deletedCount = 0;
        for (const resourcePath of Array.from(card.pendingResourceDeletions)) {
            if (referencedPaths.has(resourcePath)) {
                card.pendingResourceDeletions.delete(resourcePath);
                continue;
            }

            const absolutePath = joinPath(card.path, resourcePath);
            if (await fileService.exists(absolutePath)) {
                await fileService.delete(absolutePath);
                await this.pruneEmptyResourceDirectories(card.path, resourcePath);
                deletedCount += 1;
            }

            card.pendingResourceDeletions.delete(resourcePath);
        }

        return deletedCount;
    }

    private clearPersistedResourceImports(liveCard: CompositeCard, snapshot: CompositeCard): void {
        const snapshotImportsByCardId = new Map(snapshot.structure.basicCards.map((basicCard) => [basicCard.id, basicCard]));

        for (const basicCard of liveCard.structure.basicCards) {
            const snapshotBasicCard = snapshotImportsByCardId.get(basicCard.id);
            if (!snapshotBasicCard?.pendingResourceImports?.size || !basicCard.pendingResourceImports?.size) {
                continue;
            }

            for (const [resourcePath, resource] of snapshotBasicCard.pendingResourceImports.entries()) {
                const liveResource = basicCard.pendingResourceImports.get(resourcePath);
                if (liveResource?.token === resource.token) {
                    basicCard.pendingResourceImports.delete(resourcePath);
                }
            }

            if (basicCard.pendingResourceImports.size === 0) {
                delete basicCard.pendingResourceImports;
            }
        }
    }
}

export function createCardService(): CardService {
    return new CardService();
}

export function useCardService(): CardService {
    if (!cardServiceInstance) {
        cardServiceInstance = createCardService();
    }
    return cardServiceInstance;
}

export function getCardService(): CardService {
    return useCardService();
}

export function resetCardService(): void {
    if (cardServiceInstance) {
        cardServiceInstance.reset();
    }
    cardServiceInstance = null;
}
