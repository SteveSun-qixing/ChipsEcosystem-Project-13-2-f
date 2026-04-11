import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

const cardServiceMock = {
  getAccessible: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  listByUser: vi.fn(),
  toDTO: vi.fn((card: Record<string, unknown>) => card),
  toSummaryDTO: vi.fn((card: Record<string, unknown>) => card),
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
