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

vi.mock('../services/card.service', () => ({
  CardService: cardServiceMock,
}));

vi.mock('../services/user.service', () => ({
  UserService: userServiceMock,
}));

describe('cards route authorization', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
      htmlUrl: 'https://file.example/chips-card-html/owner-user/card-1/index.html',
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
    expect(payload.data.htmlUrl).toBe('https://file.example/chips-card-html/owner-user/card-1/index.html');

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
        htmlUrl: status === 'ready' ? 'https://file.example/chips-card-html/owner-user/card/index.html' : null,
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
      htmlUrl: 'http://localhost:9000/chips-card-html/owner-user/card-1/index.html',
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
