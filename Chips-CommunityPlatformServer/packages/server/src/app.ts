import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from './config/env';
import errorHandlerPlugin from './plugins/error-handler.plugin';
import authenticatePlugin from './plugins/authenticate.plugin';
import healthRoute from './routes/health';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import roomRoutes from './routes/rooms';
import spaceRoutes from './routes/space';
import uploadRoutes from './routes/upload';
import cardRoutes from './routes/cards';
import boxRoutes from './routes/boxes';
import discoverRoutes from './routes/discover';
import adminRoutes from './routes/admin';
import hostRuntimeRoutes from './routes/host-runtime';

export async function buildApp() {
  const fastify = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss' },
            },
          }
        : true,
    trustProxy: true,
    pluginTimeout: 60000,
  });

  // ─── 核心插件 ───────────────────────────────────────────────────

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // CSP 由 Nginx 层控制
  });

  await fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      // 生产模式：只允许 BASE_URL 同源请求
      // 开发模式：允许 localhost 任意端口
      if (env.NODE_ENV === 'development') {
        cb(null, true);
        return;
      }
      if (!origin || origin === env.BASE_URL) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { algorithm: 'HS256' },
  });

  await fastify.register(fastifyCookie, {
    secret: env.JWT_SECRET, // 用于签名 cookie
    parseOptions: {},
  });

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: Math.max(env.MAX_CARD_SIZE_MB, env.MAX_BOX_SIZE_MB) * 1024 * 1024,
    },
    attachFieldsToBody: false,
  });

  // ─── API 文档 ───────────────────────────────────────────────────

  if (env.ENABLE_SWAGGER) {
    await fastify.register(fastifySwagger, {
      openapi: {
        info: {
          title: '薯片社区平台 API',
          description: 'Chips Community Platform Server REST API',
          version: '1.0.0',
        },
        servers: [{ url: env.BASE_URL }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/api/docs',
      uiConfig: { docExpansion: 'list' },
    });
  }

  // ─── 业务插件 ───────────────────────────────────────────────────

  await errorHandlerPlugin(fastify, {});
  await authenticatePlugin(fastify, {});

  // ─── 路由 ───────────────────────────────────────────────────────

  await fastify.register(healthRoute);
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(roomRoutes);
  await fastify.register(spaceRoutes);
  await fastify.register(uploadRoutes);
  await fastify.register(cardRoutes);
  await fastify.register(boxRoutes);
  await fastify.register(discoverRoutes);
  await fastify.register(hostRuntimeRoutes);
  await fastify.register(adminRoutes, { prefix: '/admin' });

  // ─── 生命周期 ───────────────────────────────────────────────────

  fastify.addHook('onReady', async () => {
    const { hostIntegration } = await import('./services/host-integration.js');
    await hostIntegration.init();
  });

  fastify.addHook('onClose', async () => {
    const { hostIntegration } = await import('./services/host-integration.js');
    await hostIntegration.stop();
  });

  return fastify;
}
