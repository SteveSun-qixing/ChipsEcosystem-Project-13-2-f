import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const cardServiceMock = {
  getAccessible: vi.fn(),
  getOpenViewAccessible: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listByUser: vi.fn(),
  toDTO: vi.fn((card: Record<string, unknown>) => card),
  toSummaryDTO: vi.fn((card: Record<string, unknown>) => card),
  toOpenViewDTO: vi.fn((card: Record<string, unknown>) => {
    const { cardMetadata: _cardMetadata, cardStructure: _cardStructure, ...rest } = card;
    return rest;
  }),
};

const userServiceMock = {
  findById: vi.fn(),
  findByUsername: vi.fn(),
  toPublicProfile: vi.fn((user: Record<string, unknown>) => user),
};

const cardRenderCacheServiceMock = {
  viewRenderProfile: 'community-web',
  coverRenderProfile: 'community-cover',
  findReadyCache: vi.fn(),
  getLatestJob: vi.fn(),
  touchCache: vi.fn(),
  enqueueForCard: vi.fn(),
  streamPrivateCache: vi.fn(),
};

vi.mock('../services/card.service', () => ({
  CardService: cardServiceMock,
}));

vi.mock('../services/user.service', () => ({
  UserService: userServiceMock,
}));

vi.mock('../services/card-render-cache.service', () => ({
  CardRenderCacheService: cardRenderCacheServiceMock,
}));

describe('cards route authorization', () => {
  afterEach(() => {
    vi.clearAllMocks();
    cardRenderCacheServiceMock.findReadyCache.mockResolvedValue(null);
    cardRenderCacheServiceMock.getLatestJob.mockResolvedValue(null);
    cardRenderCacheServiceMock.enqueueForCard.mockResolvedValue(null);
  });

  it('公开卡片状态接口允许未登录访问并按可见性口径读取状态', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async () => {});

    cardServiceMock.getAccessible.mockResolvedValue({
      id: 'card-1',
      userId: 'owner-user',
      status: 'processing',
      errorMessage: null,
      htmlUrl: null,
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    });

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-1/status',
    });

    expect(response.statusCode).toBe(200);
    expect(cardServiceMock.getAccessible).toHaveBeenCalledWith('card-1', null);

    await app.close();
  });

  it('卡片 view 接口在缓存命中时续期并重定向到渲染缓存入口', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async () => {});

    cardServiceMock.getAccessible.mockResolvedValue({
      id: 'card-ready',
      userId: 'owner-user',
      status: 'ready',
      visibility: 'public',
    });
    cardRenderCacheServiceMock.findReadyCache.mockResolvedValue({
      id: 'cache-1',
      entryUrl: 'https://file.example/chips-card-render-cache/card-ready/cache/index.html',
    });
    cardRenderCacheServiceMock.touchCache.mockResolvedValue({
      id: 'cache-1',
      entryUrl: 'https://file.example/chips-card-render-cache/card-ready/cache/index.html',
    });

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-ready/view',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('https://file.example/chips-card-render-cache/card-ready/cache/index.html');
    expect(cardRenderCacheServiceMock.touchCache).toHaveBeenCalledWith('cache-1');

    await app.close();
  });

  it('卡片 view 接口在缓存缺失时入队视图渲染任务', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async () => {});

    cardServiceMock.getAccessible.mockResolvedValue({
      id: 'card-miss',
      userId: 'owner-user',
      status: 'ready',
      visibility: 'public',
    });
    cardRenderCacheServiceMock.findReadyCache.mockResolvedValue(null);

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-miss/view',
    });

    expect(response.statusCode).toBe(202);
    expect(cardRenderCacheServiceMock.enqueueForCard).toHaveBeenCalledWith({
      cardId: 'card-miss',
      createdBy: 'view_miss',
      renderProfile: 'community-web',
      priority: 10,
    });

    await app.close();
  });

  it('卡片 cover 接口在缓存缺失时返回可嵌入的准备中封面并入队封面渲染任务', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async () => {});

    cardServiceMock.getAccessible.mockResolvedValue({
      id: 'card-cover-miss',
      userId: 'owner-user',
      title: '封面准备中',
      status: 'ready',
      visibility: 'public',
    });
    cardRenderCacheServiceMock.findReadyCache.mockResolvedValue(null);

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-cover-miss/cover',
    });

    expect(response.statusCode).toBe(202);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<!doctype html>');
    expect(response.body).toContain('封面准备中');
    expect(cardRenderCacheServiceMock.enqueueForCard).toHaveBeenCalledWith({
      cardId: 'card-cover-miss',
      createdBy: 'cover_miss',
      renderProfile: 'community-cover',
      priority: 20,
    });

    await app.close();
  });

  it('卡片打开轻量接口允许未登录访问公开卡片且不返回完整 JSONB 字段', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async () => {});

    cardServiceMock.getOpenViewAccessible.mockResolvedValue({
      id: 'card-1',
      userId: 'owner-user',
      title: '公开卡片',
      coverUrl: 'https://file.example/chips-covers/cards/owner-user/card-1/index.html',
      coverRatio: '3:4',
      htmlUrl: null,
      status: 'ready',
      visibility: 'public',
      cardMetadata: { heavy: true },
      cardStructure: { heavy: true },
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    });
    userServiceMock.findById.mockResolvedValue({
      username: 'alice',
      displayName: 'Alice',
    });

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-1/open-view',
    });

    expect(response.statusCode).toBe(200);
    expect(cardServiceMock.getOpenViewAccessible).toHaveBeenCalledWith('card-1', null);
    const payload = response.json();
    expect(payload.data.cardMetadata).toBeUndefined();
    expect(payload.data.cardStructure).toBeUndefined();
    expect(payload.data.htmlUrl).toBeNull();

    await app.close();
  });

  it('卡片打开轻量接口在已登录场景下继续按请求者身份判定私有卡片', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async (request: { user?: unknown }) => {
      request.user = { userId: 'owner-user', role: 'user', jti: 'jwt-1' };
    });

    cardServiceMock.getOpenViewAccessible.mockResolvedValue({
      id: 'card-private',
      userId: 'owner-user',
      title: '私有卡片',
      coverUrl: null,
      coverRatio: null,
      htmlUrl: null,
      status: 'pending',
      visibility: 'private',
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    });

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-private/open-view',
    });

    expect(response.statusCode).toBe(200);
    expect(cardServiceMock.getOpenViewAccessible).toHaveBeenCalledWith('card-private', 'owner-user');

    await app.close();
  });

  it.each(['pending', 'error', 'ready'] as const)(
    '卡片打开轻量接口保留 %s 状态',
    async (status) => {
      const { default: cardRoutes } = await import('./cards');
      const app = Fastify();

      app.decorate('authenticate', async () => {});
      app.decorate('optionalAuthenticate', async () => {});

      cardServiceMock.getOpenViewAccessible.mockResolvedValue({
        id: `card-${status}`,
        userId: 'owner-user',
        title: `${status} card`,
        coverUrl: null,
        coverRatio: null,
        htmlUrl: status === 'ready' ? 'https://file.example/chips-card-render-cache/card/cache/index.html' : null,
        status,
        visibility: 'public',
        createdAt: new Date('2026-04-09T00:00:00.000Z'),
        updatedAt: new Date('2026-04-09T00:00:00.000Z'),
      });

      await app.register(cardRoutes);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/cards/card-${status}/open-view`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.status).toBe(status);

      await app.close();
    },
  );

  it('卡片状态接口在已登录场景下继续按请求者身份判定可见性', async () => {
    const { default: cardRoutes } = await import('./cards');
    const app = Fastify();

    app.decorate('authenticate', async () => {});
    app.decorate('optionalAuthenticate', async (request: { user?: unknown }) => {
      request.user = { userId: 'owner-user', role: 'user', jti: 'jwt-1' };
    });

    cardServiceMock.getAccessible.mockResolvedValue({
      id: 'card-1',
      userId: 'owner-user',
      status: 'ready',
      errorMessage: null,
      htmlUrl: 'http://localhost:9000/chips-card-render-cache/card-1/cache/index.html',
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
    });

    await app.register(cardRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cards/card-1/status',
    });

    expect(response.statusCode).toBe(200);
    expect(cardServiceMock.getAccessible).toHaveBeenCalledWith('card-1', 'owner-user');

    await app.close();
  });
});
