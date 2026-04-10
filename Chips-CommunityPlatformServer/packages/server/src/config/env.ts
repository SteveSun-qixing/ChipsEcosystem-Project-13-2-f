import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 优先加载 deploy/.env，允许通过环境变量覆盖
dotenv.config({ path: path.resolve(__dirname, '../../../../deploy/.env') });

const EnvSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  BASE_URL: z.string().url('BASE_URL must be a valid URL'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // S3 / MinIO
  S3_ENDPOINT: z.string().url('S3_ENDPOINT must be a valid URL'),
  S3_PUBLIC_URL: z.string().url('S3_PUBLIC_URL must be a valid URL').optional(),
  S3_ACCESS_KEY: z.string().min(1, 'S3_ACCESS_KEY is required'),
  S3_SECRET_KEY: z.string().min(1, 'S3_SECRET_KEY is required'),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Upload limits
  MAX_CARD_SIZE_MB: z.coerce.number().int().positive().default(500),
  MAX_BOX_SIZE_MB: z.coerce.number().int().positive().default(100),
  MAX_AVATAR_SIZE_MB: z.coerce.number().int().positive().default(5),

  // Admin bootstrap
  ADMIN_USERNAME: z.string().min(3).max(32).optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Swagger UI (可在生产环境关闭)
  ENABLE_SWAGGER: z.coerce.boolean().default(true),

  // Host 插件安装配置
  HOST_CARD_PLUGIN_PATHS: z.string().optional(),
  HOST_LAYOUT_PLUGIN_PATHS: z.string().optional(),
  HOST_APP_PLUGIN_PATHS: z.string().optional(),
  HOST_THEME_PLUGIN_PATHS: z.string().optional(),
  HOST_MODULE_PLUGIN_PATHS: z.string().optional(),
  HOST_ACTIVE_THEME_ID: z.string().default('chips-official.default-theme'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env: Env = loadEnv();
