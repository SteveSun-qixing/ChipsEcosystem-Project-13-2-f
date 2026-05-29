import { apiClient } from './client';
import type { PublicUserProfile } from './auth';

export interface CardSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  coverFragmentUrl?: string | null;
  coverRenderMode?: 'fragment-shadow' | 'iframe' | null;
  coverRatio: string | null;
  htmlUrl: string | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  visibility: 'public' | 'private';
  createdAt: string;
}

export interface BoxSummary {
  id: string;
  title: string;
  coverUrl: string | null;
  coverFragmentUrl?: string | null;
  coverRenderMode?: 'fragment-shadow' | 'iframe' | null;
  coverRatio: string | null;
  documentUrl: string | null;
  layoutPlugin: string | null;
  visibility: 'public' | 'private';
  createdAt: string;
}

export interface CardDetail {
  id: string;
  cardFileId: string | null;
  userId: string;
  roomId: string | null;
  title: string;
  coverUrl: string | null;
  coverFragmentUrl?: string | null;
  coverRenderMode?: 'fragment-shadow' | 'iframe' | null;
  coverRatio: string | null;
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

export interface CardOpenView {
  id: string;
  title: string;
  coverUrl: string | null;
  coverFragmentUrl?: string | null;
  coverRenderMode?: 'fragment-shadow' | 'iframe' | null;
  coverRatio: string | null;
  viewUrl: string;
  renderStatusUrl: string;
  viewState?: 'cache_ready' | 'rendering' | 'render_error' | 'pending' | 'processing' | 'ready' | 'error';
  renderCache?: {
    status: string;
    generatedAt: string | null;
    lastAccessedAt: string | null;
    expiresAt: string | null;
    errorMessage?: string | null;
  } | null;
  status: 'pending' | 'processing' | 'ready' | 'error';
  visibility: 'public' | 'private';
  user?: PublicUserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardStatus {
  cardId: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  errorMessage: string | null;
  htmlUrl: string | null;
  viewUrl?: string | null;
  renderStatusUrl?: string | null;
  updatedAt: string;
}

export interface CardRenderStatus {
  cardId: string;
  status: string;
  viewState: 'cache_ready' | 'rendering' | 'render_error';
  attemptCount: number;
  updatedAt: string;
  viewUrl: string;
  error: {
    code: string;
    message: string;
  } | null;
}

export interface BoxDetail {
  id: string;
  boxFileId: string | null;
  userId: string;
  roomId: string | null;
  title: string;
  coverUrl: string | null;
  coverFragmentUrl?: string | null;
  coverRenderMode?: 'fragment-shadow' | 'iframe' | null;
  coverRatio: string | null;
  documentUrl: string | null;
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
    communityViewUrl?: string;
    communityRenderStatusUrl?: string;
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

interface SearchResultEnvelope {
  data: {
    cards?: CardSummary[];
    boxes?: BoxSummary[];
    users?: PublicUserProfile[];
  };
  pagination: {
    page: number;
    pageSize: number;
  };
}

interface PaginatedEnvelope<T> {
  data: T[];
  pagination: Pagination;
}

interface UploadSessionResponse {
  uploadId: string;
  resourcePrefix: string;
  expiresAt: string;
}

interface CardUploadResponse {
  cardId: string;
  status: string;
  renderStatus?: string;
  renderStatusUrl?: string;
  communityUrl?: string;
}

async function fetchAllPages<T>(
  loader: (page: number, pageSize: number) => Promise<PaginatedEnvelope<T>>,
  pageSize = 100,
): Promise<T[]> {
  const firstPage = await loader(1, pageSize);

  if (firstPage.pagination.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = Array.from(
    { length: firstPage.pagination.totalPages - 1 },
    (_, index) => loader(index + 2, pageSize),
  );
  const rest = await Promise.all(remainingPages);

  return [firstPage, ...rest].flatMap((page) => page.data);
}

export const cardsApi = {
  async uploadCard(
    file: File,
    options: { roomId?: string; visibility?: 'public' | 'private' },
    onProgress?: (pct: number) => void,
  ) {
    const session = await apiClient.post<{ data: UploadSessionResponse }>('/upload-sessions', {
      contentType: 'card',
      fileName: file.name,
      roomId: options.roomId ?? null,
      visibility: options.visibility ?? 'public',
      client: {
        name: 'ccps-web-workspace',
        version: '1.0.0',
        platform: 'web',
      },
    });
    const fd = new FormData();
    fd.append('file', file);
    fd.append('manifest', JSON.stringify({
      client: 'ccps-web-workspace',
      mode: 'source-card-submit',
      resources: [],
      resourcePrefix: session.data.resourcePrefix,
    }));

    const res = await apiClient.upload<{ data: CardUploadResponse }>(
      `/upload-sessions/${session.data.uploadId}/card`,
      fd,
      onProgress,
    );
    return res.data;
  },

  async getCard(cardId: string) {
    const res = await apiClient.get<{ data: CardDetail }>(`/cards/${cardId}`);
    return res.data;
  },

  async getCardOpenView(cardId: string) {
    const res = await apiClient.get<{ data: CardOpenView }>(`/cards/${cardId}/open-view`);
    return res.data;
  },

  async getCardStatus(cardId: string) {
    const res = await apiClient.get<{ data: CardStatus }>(`/cards/${cardId}/status`);
    return res.data;
  },

  async getCardRenderStatus(cardId: string) {
    const res = await apiClient.get<{ data: CardRenderStatus }>(`/cards/${cardId}/render-status`);
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
    const res = await apiClient.get<PaginatedEnvelope<CardSummary>>(
      '/users/me/cards',
      params as Record<string, number>,
    );
    return res;
  },

  async getUserCards(username: string, params?: { page?: number; pageSize?: number }) {
    const res = await apiClient.get<PaginatedEnvelope<CardSummary>>(
      `/users/${username}/cards`,
      params as Record<string, number>,
    );
    return res;
  },

  async getAllUserCards(username: string) {
    return fetchAllPages<CardSummary>((page, pageSize) => cardsApi.getUserCards(username, { page, pageSize }));
  },
};

export const boxesApi = {
  async uploadBox(
    file: File,
    options: { roomId?: string; visibility?: 'public' | 'private' },
    onProgress?: (pct: number) => void,
  ) {
    const fd = new FormData();
    fd.append('file', file);
    if (options.roomId) fd.append('roomId', options.roomId);
    if (options.visibility) fd.append('visibility', options.visibility);

    const res = await apiClient.upload<{ data: { boxId: string; title: string } }>(
      '/upload/box',
      fd,
      onProgress,
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
    const res = await apiClient.get<PaginatedEnvelope<BoxSummary>>(
      '/users/me/boxes',
      params as Record<string, number>,
    );
    return res;
  },

  async getUserBoxes(username: string, params?: { page?: number; pageSize?: number }) {
    const res = await apiClient.get<PaginatedEnvelope<BoxSummary>>(
      `/users/${username}/boxes`,
      params as Record<string, number>,
    );
    return res;
  },

  async getAllUserBoxes(username: string) {
    return fetchAllPages<BoxSummary>((page, pageSize) => boxesApi.getUserBoxes(username, { page, pageSize }));
  },
};

export const discoverApi = {
  async getLatestCards(params?: { page?: number; pageSize?: number }) {
    return apiClient.get<PaginatedEnvelope<CardSummary>>(
      '/discover/cards',
      params as Record<string, number>,
    );
  },

  async getLatestBoxes(params?: { page?: number; pageSize?: number }) {
    return apiClient.get<PaginatedEnvelope<BoxSummary>>(
      '/discover/boxes',
      params as Record<string, number>,
    );
  },

  async search(params: { q: string; type?: string; page?: number; pageSize?: number }) {
    return apiClient.get<SearchResultEnvelope>(
      '/search',
      params as Record<string, string | number>,
    );
  },
};
