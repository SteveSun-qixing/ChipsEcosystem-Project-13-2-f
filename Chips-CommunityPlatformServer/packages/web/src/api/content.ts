import { apiClient } from './client';
import type { CardSummary } from './rooms';
import type { PublicUserProfile } from './auth';
import type { BoxSummary } from './rooms';

export interface CardDetail {
  id: string;
  cardFileId: string | null;
  userId: string;
  roomId: string | null;
  title: string;
  coverUrl: string | null;
  htmlUrl: string | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  visibility: 'public' | 'private';
  fileSizeBytes: number | null;
  cardMetadata: unknown;
  cardStructure: unknown;
  user?: PublicUserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardStatus {
  cardId: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  htmlUrl: string | null;
  updatedAt: string;
}

export interface BoxDetail {
  id: string;
  boxFileId: string | null;
  userId: string;
  roomId: string | null;
  title: string;
  coverUrl: string | null;
  layoutPlugin: string | null;
  visibility: 'public' | 'private';
  fileSizeBytes: number | null;
  metadata: unknown;
  cards?: Array<{
    url: string;
    card_id?: string;
    title?: string;
    cover_url?: string;
    sort_index?: number;
    enabled?: boolean;
    communityCardId?: string;
    communityHtmlUrl?: string;
  }>;
  user?: PublicUserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const cardsApi = {
  async uploadCard(
    file: File,
    options: { roomId?: string; visibility?: 'public' | 'private' },
    onProgress?: (pct: number) => void,
  ) {
    const fd = new FormData();
    fd.append('file', file);
    if (options.roomId) fd.append('roomId', options.roomId);
    if (options.visibility) fd.append('visibility', options.visibility);

    const res = await apiClient.upload<{ data: { cardId: string; status: string } }>(
      '/upload/card',
      fd,
      onProgress,
    );
    return res.data;
  },

  async getCard(cardId: string) {
    const res = await apiClient.get<{ data: CardDetail }>(`/cards/${cardId}`);
    return res.data;
  },

  async getCardStatus(cardId: string) {
    const res = await apiClient.get<{ data: CardStatus }>(`/cards/${cardId}/status`);
    return res.data;
  },

  async updateCard(
    cardId: string,
    patch: { roomId?: string | null; visibility?: 'public' | 'private' },
  ) {
    const res = await apiClient.patch<{ data: CardDetail }>(`/cards/${cardId}`, patch);
    return res.data;
  },

  async deleteCard(cardId: string) {
    await apiClient.delete(`/cards/${cardId}`);
  },

  async getMyCards(params?: { page?: number; pageSize?: number }) {
    const res = await apiClient.get<{ data: CardDetail[]; pagination: Pagination }>(
      '/users/me/cards',
      params as Record<string, number>,
    );
    return res;
  },
};

export const boxesApi = {
  async uploadBox(
    file: File,
    options: { roomId?: string; visibility?: 'public' | 'private' },
  ) {
    const fd = new FormData();
    fd.append('file', file);
    if (options.roomId) fd.append('roomId', options.roomId);
    if (options.visibility) fd.append('visibility', options.visibility);

    const res = await apiClient.upload<{ data: { boxId: string; title: string } }>(
      '/upload/box',
      fd,
    );
    return res.data;
  },

  async getBox(boxId: string) {
    const res = await apiClient.get<{ data: BoxDetail }>(`/boxes/${boxId}`);
    return res.data;
  },

  async updateBox(
    boxId: string,
    patch: { roomId?: string | null; visibility?: 'public' | 'private' },
  ) {
    const res = await apiClient.patch<{ data: BoxDetail }>(`/boxes/${boxId}`, patch);
    return res.data;
  },

  async deleteBox(boxId: string) {
    await apiClient.delete(`/boxes/${boxId}`);
  },

  async getMyBoxes(params?: { page?: number; pageSize?: number }) {
    const res = await apiClient.get<{ data: BoxDetail[]; pagination: Pagination }>(
      '/users/me/boxes',
      params as Record<string, number>,
    );
    return res;
  },
};

export const discoverApi = {
  async getLatestCards(params?: { page?: number; pageSize?: number }) {
    return apiClient.get<{ data: CardSummary[]; pagination: Pagination }>(
      '/discover/cards',
      params as Record<string, number>,
    );
  },

  async getLatestBoxes(params?: { page?: number; pageSize?: number }) {
    return apiClient.get<{ data: BoxSummary[]; pagination: Pagination }>(
      '/discover/boxes',
      params as Record<string, number>,
    );
  },

  async search(params: { q: string; type?: string; page?: number; pageSize?: number }) {
    return apiClient.get<{
      data: {
        cards?: CardSummary[];
        boxes?: BoxDetail[];
        users?: import('./auth').PublicUserProfile[];
      };
      pagination: { page: number; pageSize: number };
    }>('/search', params as Record<string, string | number>);
  },
};
