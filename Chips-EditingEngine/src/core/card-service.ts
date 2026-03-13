/**
 * 卡片服务
 * @module core/card-service
 * @description 管理复合卡片的创建、读取、保存和渲染
 */

import { generateId62 } from '../utils/id';
import { globalEventEmitter } from './event-emitter';
import type { EventEmitter } from './event-emitter';

export interface BasicCardData {
    id: string;
    type: string;
    data: Record<string, unknown>;
    createdAt: string;
    modifiedAt: string;
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
    structure: CardStructure;
    isDirty: boolean;
    isEditing: boolean;
}

export interface CardServiceState {
    openedCards: Map<string, CompositeCard>;
    selectedCardId: string | null;
    selectedBasicCardId: string | null;
}

export type CardServiceListener = (state: CardServiceState) => void;

let cardServiceInstance: CardService | null = null;

function now(): string {
    return new Date().toISOString();
}

export class CardService {
    private listeners: Set<CardServiceListener> = new Set();
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
        this.listeners.forEach(listener => listener(this.getState()));
        globalEventEmitter.emit('card:state-changed', this.state);
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

    async createCard(
        name: string,
        initialBasicCard?: { type: string; data?: Record<string, unknown> }
    ): Promise<CompositeCard> {
        const id = generateId62();
        const timestamp = now();

        const basicCards: BasicCardData[] = [];

        if (initialBasicCard) {
            basicCards.push({
                id: generateId62(),
                type: initialBasicCard.type,
                data: initialBasicCard.data || {},
                createdAt: timestamp,
                modifiedAt: timestamp,
            });
        }

        const newCard: CompositeCard = {
            id,
            path: `/${name}.card`,
            metadata: {
                name,
                createdAt: timestamp,
                modifiedAt: timestamp,
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
        };

        this.state.openedCards.set(id, newCard);
        this.state.selectedCardId = id;

        if (basicCards.length > 0) {
            this.state.selectedBasicCardId = basicCards[0].id;
        }

        this.notify();
        globalEventEmitter.emit('card:created', { card: newCard });

        return newCard;
    }

    async openCard(id: string, path: string): Promise<CompositeCard> {
        const existing = this.state.openedCards.get(id);
        if (existing) {
            this.state.selectedCardId = id;
            this.notify();
            return existing;
        }

        const card: CompositeCard = {
            id,
            path,
            metadata: {
                name: path.replace(/^\/|\.card$/g, ''),
                createdAt: now(),
                modifiedAt: now(),
            },
            structure: {
                basicCards: [],
                layout: { padding: 16, gap: 12 },
            },
            isDirty: false,
            isEditing: false,
        };

        this.state.openedCards.set(id, card);
        this.state.selectedCardId = id;

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

        card.isDirty = false;
        card.metadata.modifiedAt = now();

        this.notify();
        globalEventEmitter.emit('card:saved', { card });
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
        const basicCard: BasicCardData = {
            id: generateId62(),
            type,
            data: data || {},
            createdAt: timestamp,
            modifiedAt: timestamp,
        };

        if (position !== undefined && position >= 0 && position <= card.structure.basicCards.length) {
            card.structure.basicCards.splice(position, 0, basicCard);
        } else {
            card.structure.basicCards.push(basicCard);
        }

        card.isDirty = true;
        card.metadata.modifiedAt = timestamp;
        this.state.selectedBasicCardId = basicCard.id;

        this.notify();
        globalEventEmitter.emit('card:basic-card-added', { cardId, basicCard, position });

        return basicCard;
    }

    removeBasicCard(cardId: string, basicCardId: string): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const index = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
        if (index !== -1) {
            card.structure.basicCards.splice(index, 1);
            card.isDirty = true;
            card.metadata.modifiedAt = now();

            if (this.state.selectedBasicCardId === basicCardId) {
                this.state.selectedBasicCardId = null;
            }

            this.notify();
            globalEventEmitter.emit('card:basic-card-removed', { cardId, basicCardId });
        }
    }

    moveBasicCard(cardId: string, basicCardId: string, newPosition: number): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const currentIndex = card.structure.basicCards.findIndex(bc => bc.id === basicCardId);
        if (currentIndex === -1) return;

        const [basicCard] = card.structure.basicCards.splice(currentIndex, 1);
        if (basicCard) {
            card.structure.basicCards.splice(newPosition, 0, basicCard);
            card.isDirty = true;
            card.metadata.modifiedAt = now();

            this.notify();
            globalEventEmitter.emit('card:basic-card-moved', { cardId, basicCardId, newPosition });
        }
    }

    updateBasicCard(cardId: string, basicCardId: string, data: Record<string, unknown>): void {
        const card = this.state.openedCards.get(cardId);
        if (!card) return;

        const basicCard = card.structure.basicCards.find(bc => bc.id === basicCardId);
        if (basicCard) {
            basicCard.data = { ...basicCard.data, ...data };
            basicCard.modifiedAt = now();
            card.isDirty = true;
            card.metadata.modifiedAt = now();

            this.notify();
            globalEventEmitter.emit('card:basic-card-updated', { cardId, basicCardId, data });
        }
    }

    selectCard(id: string | null): void {
        this.state.selectedCardId = id;
        if (id === null) {
            this.state.selectedBasicCardId = null;
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
        card.isDirty = true;

        this.notify();
        globalEventEmitter.emit('card:metadata-updated', { cardId: id, metadata });
    }

    toggleEditMode(id: string): void {
        const card = this.state.openedCards.get(id);
        if (!card) return;

        card.isEditing = !card.isEditing;
        this.notify();
        globalEventEmitter.emit('card:edit-mode-changed', { cardId: id, isEditing: card.isEditing });
    }

    reset(): void {
        this.state = {
            openedCards: new Map(),
            selectedCardId: null,
            selectedBasicCardId: null,
        };
        this.notify();
        globalEventEmitter.emit('card:reset', {});
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
