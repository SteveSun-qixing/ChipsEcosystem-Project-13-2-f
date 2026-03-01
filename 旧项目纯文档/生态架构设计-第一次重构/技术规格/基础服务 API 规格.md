# 基础服务 API 规格

**文档版本**：1.1.0  
**状态**：Draft（阶段一任务 1.4 交付）  
**适用范围**：Chips-Host 主进程基础服务层（第 4 层）  
**更新日期**：2026-02-26

---

## 1. 目标与边界

本规格定义 Chips-Host 基础服务层 14 类服务、92 个动作的统一 API 合同，供以下角色直接使用：

- 阶段二服务开发者（按规格实现服务）
- 阶段三 Bridge/SDK 开发者（按规格暴露 `window.chips.*` 与 SDK）
- 阶段五应用迁移开发者（按规格替换旧 IPC 调用）

本文件是“实现前规格”，不是示例性文档。所有动作均提供：

- TypeScript 函数签名（参数类型、返回类型）
- Zod 参数校验 Schema
- 错误码清单
- `chips.invoke(namespace, action, params)` 使用示例

---

## 2. 通用约定

### 2.1 调用模型

- 主进程内服务调用：`kernel.router.invoke(namespace, action, params)`
- 渲染进程调用：`window.chips.invoke(namespace, action, params)`
- 禁止服务间直接 `import` 调用

### 2.2 标准错误格式

```ts
export interface ChipsError {
  code: string;
  message: string;
  details?: unknown;
}
```

### 2.3 公共类型

```ts
export type ChipsId = string; // 10 位 62 进制 ID
export type IsoDateTime = string; // ISO 8601 UTC
export type AbsolutePath = string;
export type RelativePath = string;
export type UrlString = string;

export type PluginType = 'app' | 'card' | 'layout' | 'module' | 'theme';

export interface FileStat {
  path: string;
  exists: boolean;
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  createdAt: IsoDateTime;
  modifiedAt: IsoDateTime;
  accessedAt: IsoDateTime;
  mimeType?: string;
}

export interface WatchHandle {
  watchId: string;
  startedAt: IsoDateTime;
}

export interface ResourceIdentifier {
  raw: string;
  kind: 'relative' | 'absolute' | 'url';
}
```

### 2.4 通用 Zod 片段

```ts
import { z } from 'zod';

export const chipsIdSchema = z.string().regex(/^[0-9A-Za-z]{10}$/);
export const isoDateTimeSchema = z.string().datetime({ offset: true });
export const nonEmptyStringSchema = z.string().min(1);
export const absolutePathSchema = z.string().min(1);
export const relativePathSchema = z.string().min(1);
export const urlSchema = z.string().url();

export const errorSchema = z.object({
  code: nonEmptyStringSchema,
  message: nonEmptyStringSchema,
  details: z.unknown().optional()
});
```

### 2.5 超时默认值

- 普通调用：10s
- 文件/卡片/箱子调用：30s
- 资源网络调用：60s
- ZIP 大文件调用：120s

---

## 3. 服务总览

| 服务 | 命名空间 | 动作数 |
|---|---|---:|
| 文件服务 | `file.*` | 11 |
| 卡片服务 | `card.*` | 12 |
| 箱子服务 | `box.*` | 8 |
| 资源服务 | `resource.*` | 6 |
| ZIP 服务 | `zip.*` | 4 |
| 配置服务 | `config.*` | 4 |
| 主题服务 | `theme.*` | 9 |
| 多语言服务 | `i18n.*` | 6 |
| 凭证服务 | `credential.*` | 4 |
| 日志服务 | `log.*` | 3 |
| 标签服务 | `tag.*` | 6 |
| 序列化服务 | `serializer.*` | 4 |
| 平台服务 | `platform.*` | 11 |
| 模块加载服务 | `module.*` | 4 |

---

## 4. 服务规格（14 类）

## 4.1 文件服务 `file.*`

### 4.1.1 服务说明

- 命名空间：`file`
- 职责：统一本地文件系统能力、跨平台路径规范化、监听、类型识别与元信息读取
- 跨平台路径规则：
  - 输入路径先执行 `normalize`（Windows 分隔符 `\\` → `/`）
  - 对磁盘大小写敏感性由 PAL 决定
  - 相对路径按调用上下文工作区根目录解析
- 大文件策略：
  - `file.read` 支持 `mode: 'stream'`
  - 默认单次内存读取阈值 16MB；超过阈值必须走流式读取

### 4.1.2 TypeScript API

```ts
export interface FileServiceApi {
  read(params: {
    path: string;
    encoding?: 'utf8' | 'base64' | 'binary';
    mode?: 'buffer' | 'stream';
    offset?: number;
    length?: number;
  }): Promise<{ content: string; encoding: 'utf8' | 'base64' | 'binary'; size: number }>;

  write(params: {
    path: string;
    content: string;
    encoding?: 'utf8' | 'base64' | 'binary';
    overwrite?: boolean;
    createDirs?: boolean;
  }): Promise<{ writtenBytes: number }>;

  exists(params: { path: string }): Promise<{ exists: boolean }>;

  list(params: {
    path: string;
    recursive?: boolean;
    includeHidden?: boolean;
    extensions?: string[];
  }): Promise<{ entries: Array<{ path: string; name: string; isDirectory: boolean }> }>;

  mkdir(params: { path: string; recursive?: boolean }): Promise<{ created: boolean }>;

  delete(params: { path: string; recursive?: boolean; force?: boolean }): Promise<{ deleted: boolean }>;

  copy(params: {
    source: string;
    target: string;
    overwrite?: boolean;
  }): Promise<{ copied: boolean }>;

  move(params: {
    source: string;
    target: string;
    overwrite?: boolean;
  }): Promise<{ moved: boolean }>;

  watch(params: {
    path: string;
    recursive?: boolean;
    debounceMs?: number;
  }): Promise<{ watchId: string }>;

  identify(params: {
    path: string;
    sniffBytes?: number;
  }): Promise<{ ext: string; mime: string; kind: 'card' | 'box' | 'media' | 'text' | 'unknown' }>;

  stat(params: { path: string }): Promise<FileStat>;
}
```

### 4.1.3 Zod Schema

```ts
export const fileSchemas = {
  read: z.object({
    path: nonEmptyStringSchema,
    encoding: z.enum(['utf8', 'base64', 'binary']).optional(),
    mode: z.enum(['buffer', 'stream']).optional(),
    offset: z.number().int().min(0).optional(),
    length: z.number().int().positive().optional()
  }),
  write: z.object({
    path: nonEmptyStringSchema,
    content: z.string(),
    encoding: z.enum(['utf8', 'base64', 'binary']).optional(),
    overwrite: z.boolean().optional(),
    createDirs: z.boolean().optional()
  }),
  exists: z.object({ path: nonEmptyStringSchema }),
  list: z.object({
    path: nonEmptyStringSchema,
    recursive: z.boolean().optional(),
    includeHidden: z.boolean().optional(),
    extensions: z.array(nonEmptyStringSchema).optional()
  }),
  mkdir: z.object({ path: nonEmptyStringSchema, recursive: z.boolean().optional() }),
  delete: z.object({
    path: nonEmptyStringSchema,
    recursive: z.boolean().optional(),
    force: z.boolean().optional()
  }),
  copy: z.object({
    source: nonEmptyStringSchema,
    target: nonEmptyStringSchema,
    overwrite: z.boolean().optional()
  }),
  move: z.object({
    source: nonEmptyStringSchema,
    target: nonEmptyStringSchema,
    overwrite: z.boolean().optional()
  }),
  watch: z.object({
    path: nonEmptyStringSchema,
    recursive: z.boolean().optional(),
    debounceMs: z.number().int().min(0).max(60_000).optional()
  }),
  identify: z.object({
    path: nonEmptyStringSchema,
    sniffBytes: z.number().int().min(128).max(65_536).optional()
  }),
  stat: z.object({ path: nonEmptyStringSchema })
} as const;
```

### 4.1.4 错误码

| 动作 | 错误码 |
|---|---|
| `read` | `FILE_NOT_FOUND`, `FILE_PERMISSION_DENIED`, `FILE_READ_FAILED`, `FILE_TOO_LARGE` |
| `write` | `FILE_PERMISSION_DENIED`, `FILE_ALREADY_EXISTS`, `FILE_WRITE_FAILED` |
| `exists` | `FILE_INVALID_PATH` |
| `list` | `FILE_NOT_FOUND`, `FILE_LIST_FAILED` |
| `mkdir` | `FILE_PERMISSION_DENIED`, `FILE_CREATE_DIR_FAILED` |
| `delete` | `FILE_NOT_FOUND`, `FILE_DELETE_FAILED` |
| `copy` | `FILE_NOT_FOUND`, `FILE_ALREADY_EXISTS`, `FILE_COPY_FAILED` |
| `move` | `FILE_NOT_FOUND`, `FILE_ALREADY_EXISTS`, `FILE_MOVE_FAILED` |
| `watch` | `FILE_NOT_FOUND`, `FILE_WATCH_FAILED` |
| `identify` | `FILE_NOT_FOUND`, `FILE_IDENTIFY_FAILED` |
| `stat` | `FILE_NOT_FOUND`, `FILE_STAT_FAILED` |

### 4.1.5 使用示例

```ts
await chips.invoke('file', 'read', { path: '/workspace/a.card' });
await chips.invoke('file', 'write', { path: '/workspace/note.txt', content: 'hello' });
await chips.invoke('file', 'exists', { path: '/workspace/note.txt' });
await chips.invoke('file', 'list', { path: '/workspace', recursive: false });
await chips.invoke('file', 'mkdir', { path: '/workspace/new-dir', recursive: true });
await chips.invoke('file', 'delete', { path: '/workspace/tmp', recursive: true });
await chips.invoke('file', 'copy', { source: '/workspace/a.card', target: '/backup/a.card' });
await chips.invoke('file', 'move', { source: '/workspace/a.card', target: '/workspace/b.card' });
await chips.invoke('file', 'watch', { path: '/workspace', recursive: true, debounceMs: 300 });
await chips.invoke('file', 'identify', { path: '/workspace/a.card' });
await chips.invoke('file', 'stat', { path: '/workspace/a.card' });
```

---

## 4.2 卡片服务 `card.*`

### 4.2.1 服务说明

- 命名空间：`card`
- 职责：`.card` 打包/解包、结构读取、基础卡片配置维护、封面读写、快速预览、完整性校验
- 卡片工作区：
  - `card.open` 将 `.card` 解包到 `~/.chips/workspace/cards/{sessionId}`
  - `card.save` 从工作区回写并打包
- 卡片锁机制：
  - 打开时创建写锁 `lockId`
  - 只有持有 `lockId` 的调用方可以写入
  - 默认锁超时 30 分钟，支持续约

### 4.2.2 TypeScript API

```ts
export interface CardServiceApi {
  open(params: {
    cardPath: string;
    mode?: 'read' | 'write';
  }): Promise<{ sessionId: string; workspacePath: string; lockId?: string }>;

  save(params: {
    sessionId: string;
    outputPath?: string;
    lockId?: string;
    validateBeforeSave?: boolean;
  }): Promise<{ cardPath: string; savedAt: IsoDateTime }>;

  getMetadata(params: {
    sessionId?: string;
    cardPath?: string;
  }): Promise<{ metadata: Record<string, unknown> }>;

  getStructure(params: {
    sessionId?: string;
    cardPath?: string;
  }): Promise<{ structure: Array<{ id: ChipsId; type: string }>; manifest: Record<string, unknown> }>;

  getBaseCardConfig(params: {
    sessionId: string;
    baseCardId: ChipsId;
  }): Promise<{ config: Record<string, unknown> }>;

  updateBaseCardConfig(params: {
    sessionId: string;
    baseCardId: ChipsId;
    config: Record<string, unknown>;
    lockId: string;
  }): Promise<{ updated: boolean }>;

  addBaseCard(params: {
    sessionId: string;
    type: string;
    config: Record<string, unknown>;
    position?: number;
    lockId: string;
  }): Promise<{ baseCardId: ChipsId }>;

  removeBaseCard(params: {
    sessionId: string;
    baseCardId: ChipsId;
    lockId: string;
  }): Promise<{ removed: boolean }>;

  getCover(params: {
    sessionId?: string;
    cardPath?: string;
  }): Promise<{ html: string }>;

  updateCover(params: {
    sessionId: string;
    html: string;
    lockId: string;
  }): Promise<{ updated: boolean }>;

  quickPreview(params: {
    cardPath: string;
  }): Promise<{ metadata: Record<string, unknown>; baseCardCount: number; resourceCount: number }>;

  validate(params: {
    cardPath?: string;
    sessionId?: string;
    checkResources?: boolean;
  }): Promise<{ valid: boolean; errors: ChipsError[] }>;
}
```

### 4.2.3 Zod Schema

```ts
export const cardSchemas = {
  open: z.object({
    cardPath: nonEmptyStringSchema,
    mode: z.enum(['read', 'write']).optional()
  }),
  save: z.object({
    sessionId: nonEmptyStringSchema,
    outputPath: nonEmptyStringSchema.optional(),
    lockId: nonEmptyStringSchema.optional(),
    validateBeforeSave: z.boolean().optional()
  }),
  getMetadata: z.object({
    sessionId: nonEmptyStringSchema.optional(),
    cardPath: nonEmptyStringSchema.optional()
  }).refine((v) => Boolean(v.sessionId || v.cardPath), 'sessionId or cardPath is required'),
  getStructure: z.object({
    sessionId: nonEmptyStringSchema.optional(),
    cardPath: nonEmptyStringSchema.optional()
  }).refine((v) => Boolean(v.sessionId || v.cardPath), 'sessionId or cardPath is required'),
  getBaseCardConfig: z.object({ sessionId: nonEmptyStringSchema, baseCardId: chipsIdSchema }),
  updateBaseCardConfig: z.object({
    sessionId: nonEmptyStringSchema,
    baseCardId: chipsIdSchema,
    config: z.record(z.string(), z.unknown()),
    lockId: nonEmptyStringSchema
  }),
  addBaseCard: z.object({
    sessionId: nonEmptyStringSchema,
    type: nonEmptyStringSchema,
    config: z.record(z.string(), z.unknown()),
    position: z.number().int().min(0).optional(),
    lockId: nonEmptyStringSchema
  }),
  removeBaseCard: z.object({
    sessionId: nonEmptyStringSchema,
    baseCardId: chipsIdSchema,
    lockId: nonEmptyStringSchema
  }),
  getCover: z.object({
    sessionId: nonEmptyStringSchema.optional(),
    cardPath: nonEmptyStringSchema.optional()
  }).refine((v) => Boolean(v.sessionId || v.cardPath), 'sessionId or cardPath is required'),
  updateCover: z.object({
    sessionId: nonEmptyStringSchema,
    html: z.string(),
    lockId: nonEmptyStringSchema
  }),
  quickPreview: z.object({ cardPath: nonEmptyStringSchema }),
  validate: z.object({
    cardPath: nonEmptyStringSchema.optional(),
    sessionId: nonEmptyStringSchema.optional(),
    checkResources: z.boolean().optional()
  }).refine((v) => Boolean(v.sessionId || v.cardPath), 'sessionId or cardPath is required')
} as const;
```

### 4.2.4 错误码

| 动作 | 错误码 |
|---|---|
| `open` | `CARD_NOT_FOUND`, `CARD_INVALID_FORMAT`, `CARD_OPEN_FAILED`, `CARD_LOCK_CONFLICT` |
| `save` | `CARD_SESSION_NOT_FOUND`, `CARD_LOCK_REQUIRED`, `CARD_SAVE_FAILED`, `CARD_VALIDATE_FAILED` |
| `getMetadata` | `CARD_NOT_FOUND`, `CARD_METADATA_NOT_FOUND` |
| `getStructure` | `CARD_NOT_FOUND`, `CARD_STRUCTURE_NOT_FOUND` |
| `getBaseCardConfig` | `CARD_BASE_CARD_NOT_FOUND`, `CARD_CONFIG_NOT_FOUND` |
| `updateBaseCardConfig` | `CARD_LOCK_REQUIRED`, `CARD_BASE_CARD_NOT_FOUND`, `CARD_CONFIG_INVALID` |
| `addBaseCard` | `CARD_LOCK_REQUIRED`, `CARD_BASE_CARD_TYPE_INVALID` |
| `removeBaseCard` | `CARD_LOCK_REQUIRED`, `CARD_BASE_CARD_NOT_FOUND` |
| `getCover` | `CARD_COVER_NOT_FOUND` |
| `updateCover` | `CARD_LOCK_REQUIRED`, `CARD_COVER_INVALID_HTML` |
| `quickPreview` | `CARD_NOT_FOUND`, `CARD_INVALID_FORMAT` |
| `validate` | `CARD_NOT_FOUND`, `CARD_INVALID_FORMAT`, `CARD_RESOURCE_MISSING` |

### 4.2.5 使用示例

```ts
await chips.invoke('card', 'open', { cardPath: '/workspace/demo.card', mode: 'write' });
await chips.invoke('card', 'save', { sessionId: 'sess-1', lockId: 'lock-1' });
await chips.invoke('card', 'getMetadata', { cardPath: '/workspace/demo.card' });
await chips.invoke('card', 'getStructure', { sessionId: 'sess-1' });
await chips.invoke('card', 'getBaseCardConfig', { sessionId: 'sess-1', baseCardId: 'a1B2c3D4e5' });
await chips.invoke('card', 'updateBaseCardConfig', { sessionId: 'sess-1', baseCardId: 'a1B2c3D4e5', config: { title: 'new' }, lockId: 'lock-1' });
await chips.invoke('card', 'addBaseCard', { sessionId: 'sess-1', type: 'ImageCard', config: { image_file: 'a.png' }, lockId: 'lock-1' });
await chips.invoke('card', 'removeBaseCard', { sessionId: 'sess-1', baseCardId: 'a1B2c3D4e5', lockId: 'lock-1' });
await chips.invoke('card', 'getCover', { sessionId: 'sess-1' });
await chips.invoke('card', 'updateCover', { sessionId: 'sess-1', html: '<html></html>', lockId: 'lock-1' });
await chips.invoke('card', 'quickPreview', { cardPath: '/workspace/demo.card' });
await chips.invoke('card', 'validate', { cardPath: '/workspace/demo.card', checkResources: true });
```

---

## 4.3 箱子服务 `box.*`

### 4.3.1 服务说明

- 命名空间：`box`
- 职责：`.box` 打包/解包、卡片列表维护、布局配置读取、外部卡片扫描
- 外部卡片扫描逻辑：
  - 默认扫描 `.box` 同级目录
  - 可传入额外扫描路径（本地目录/URL/WebDAV 挂载点）
  - 按 `structure.yaml` 中 external 引用匹配并输出状态

### 4.3.2 TypeScript API

```ts
export interface BoxServiceApi {
  open(params: { boxPath: string; mode?: 'read' | 'write' }): Promise<{ sessionId: string; workspacePath: string }>;
  save(params: { sessionId: string; outputPath?: string }): Promise<{ boxPath: string; savedAt: IsoDateTime }>;
  getMetadata(params: { sessionId?: string; boxPath?: string }): Promise<{ metadata: Record<string, unknown> }>;
  getCardList(params: { sessionId?: string; boxPath?: string }): Promise<{ cards: Array<Record<string, unknown>> }>;
  getLayoutConfig(params: { sessionId?: string; boxPath?: string }): Promise<{ config: Record<string, unknown> }>;
  addCard(params: { sessionId: string; cardRef: Record<string, unknown> }): Promise<{ added: boolean }>;
  removeCard(params: { sessionId: string; cardId: ChipsId }): Promise<{ removed: boolean }>;
  scanExternal(params: {
    sessionId?: string;
    boxPath?: string;
    scanPaths?: string[];
  }): Promise<{ found: Array<{ cardId: ChipsId; location: string; status: 'found' | 'missing' }> }>;
}
```

### 4.3.3 Zod Schema

```ts
export const boxSchemas = {
  open: z.object({ boxPath: nonEmptyStringSchema, mode: z.enum(['read', 'write']).optional() }),
  save: z.object({ sessionId: nonEmptyStringSchema, outputPath: nonEmptyStringSchema.optional() }),
  getMetadata: z.object({ sessionId: nonEmptyStringSchema.optional(), boxPath: nonEmptyStringSchema.optional() })
    .refine((v) => Boolean(v.sessionId || v.boxPath), 'sessionId or boxPath is required'),
  getCardList: z.object({ sessionId: nonEmptyStringSchema.optional(), boxPath: nonEmptyStringSchema.optional() })
    .refine((v) => Boolean(v.sessionId || v.boxPath), 'sessionId or boxPath is required'),
  getLayoutConfig: z.object({ sessionId: nonEmptyStringSchema.optional(), boxPath: nonEmptyStringSchema.optional() })
    .refine((v) => Boolean(v.sessionId || v.boxPath), 'sessionId or boxPath is required'),
  addCard: z.object({ sessionId: nonEmptyStringSchema, cardRef: z.record(z.string(), z.unknown()) }),
  removeCard: z.object({ sessionId: nonEmptyStringSchema, cardId: chipsIdSchema }),
  scanExternal: z.object({
    sessionId: nonEmptyStringSchema.optional(),
    boxPath: nonEmptyStringSchema.optional(),
    scanPaths: z.array(nonEmptyStringSchema).optional()
  }).refine((v) => Boolean(v.sessionId || v.boxPath), 'sessionId or boxPath is required')
} as const;
```

### 4.3.4 错误码

| 动作 | 错误码 |
|---|---|
| `open` | `BOX_NOT_FOUND`, `BOX_INVALID_FORMAT`, `BOX_OPEN_FAILED` |
| `save` | `BOX_SESSION_NOT_FOUND`, `BOX_SAVE_FAILED` |
| `getMetadata` | `BOX_NOT_FOUND`, `BOX_METADATA_NOT_FOUND` |
| `getCardList` | `BOX_NOT_FOUND`, `BOX_STRUCTURE_NOT_FOUND` |
| `getLayoutConfig` | `BOX_LAYOUT_CONFIG_NOT_FOUND`, `BOX_LAYOUT_CONFIG_INVALID` |
| `addCard` | `BOX_CARD_REF_INVALID`, `BOX_ADD_CARD_FAILED` |
| `removeCard` | `BOX_CARD_NOT_FOUND`, `BOX_REMOVE_CARD_FAILED` |
| `scanExternal` | `BOX_SCAN_PATH_INVALID`, `BOX_SCAN_FAILED` |

### 4.3.5 使用示例

```ts
await chips.invoke('box', 'open', { boxPath: '/workspace/demo.box', mode: 'write' });
await chips.invoke('box', 'save', { sessionId: 'box-sess-1' });
await chips.invoke('box', 'getMetadata', { boxPath: '/workspace/demo.box' });
await chips.invoke('box', 'getCardList', { sessionId: 'box-sess-1' });
await chips.invoke('box', 'getLayoutConfig', { sessionId: 'box-sess-1' });
await chips.invoke('box', 'addCard', { sessionId: 'box-sess-1', cardRef: { id: 'a1B2c3D4e5', location: 'internal', path: 'a.card' } });
await chips.invoke('box', 'removeCard', { sessionId: 'box-sess-1', cardId: 'a1B2c3D4e5' });
await chips.invoke('box', 'scanExternal', { sessionId: 'box-sess-1', scanPaths: ['/cards', '/archive/cards'] });
```

---

## 4.4 资源服务 `resource.*`

### 4.4.1 服务说明

- 命名空间：`resource`
- 职责：统一本地/远程资源访问、解析、缓存、健康检查
- 资源标识符格式：
  - 相对路径：`content/a.png`
  - 绝对路径：`/Users/name/data/a.png`
  - URL：`https://example.com/a.png`
- 缓存策略：
  - 主键：`sha256(rawIdentifier + headers + authScope)`
  - 默认 TTL：24h
  - LRU + TTL 双策略

### 4.4.2 TypeScript API

```ts
export interface ResourceServiceApi {
  fetch(params: {
    identifier: string;
    responseType?: 'text' | 'json' | 'base64' | 'buffer';
    useCache?: boolean;
    timeoutMs?: number;
  }): Promise<{ data: string; fromCache: boolean; mimeType?: string }>;

  resolve(params: {
    identifier: string;
    basePath?: string;
  }): Promise<{ resolved: string; kind: 'relative' | 'absolute' | 'url' }>;

  cache(params: {
    identifier: string;
    ttlSeconds?: number;
  }): Promise<{ cacheKey: string; expiresAt: IsoDateTime }>;

  check(params: { identifier: string }): Promise<{ available: boolean; reason?: string }>;

  getMeta(params: { identifier: string }): Promise<{
    size?: number;
    mimeType?: string;
    etag?: string;
    modifiedAt?: IsoDateTime;
  }>;

  clearCache(params: {
    prefix?: string;
    all?: boolean;
  }): Promise<{ cleared: number }>;
}
```

### 4.4.3 Zod Schema

```ts
export const resourceSchemas = {
  fetch: z.object({
    identifier: nonEmptyStringSchema,
    responseType: z.enum(['text', 'json', 'base64', 'buffer']).optional(),
    useCache: z.boolean().optional(),
    timeoutMs: z.number().int().min(1000).max(300_000).optional()
  }),
  resolve: z.object({
    identifier: nonEmptyStringSchema,
    basePath: nonEmptyStringSchema.optional()
  }),
  cache: z.object({
    identifier: nonEmptyStringSchema,
    ttlSeconds: z.number().int().min(1).max(30 * 24 * 3600).optional()
  }),
  check: z.object({ identifier: nonEmptyStringSchema }),
  getMeta: z.object({ identifier: nonEmptyStringSchema }),
  clearCache: z.object({
    prefix: nonEmptyStringSchema.optional(),
    all: z.boolean().optional()
  }).refine((v) => Boolean(v.all || v.prefix), 'all=true or prefix is required')
} as const;
```

### 4.4.4 错误码

| 动作 | 错误码 |
|---|---|
| `fetch` | `RESOURCE_NOT_FOUND`, `RESOURCE_FETCH_FAILED`, `NETWORK_TIMEOUT`, `CREDENTIAL_REQUIRED` |
| `resolve` | `RESOURCE_INVALID_IDENTIFIER`, `RESOURCE_RESOLVE_FAILED` |
| `cache` | `RESOURCE_CACHE_FAILED`, `RESOURCE_FETCH_FAILED` |
| `check` | `RESOURCE_INVALID_IDENTIFIER`, `RESOURCE_CHECK_FAILED` |
| `getMeta` | `RESOURCE_NOT_FOUND`, `RESOURCE_META_FAILED` |
| `clearCache` | `RESOURCE_CACHE_CLEAR_FAILED` |

### 4.4.5 使用示例

```ts
await chips.invoke('resource', 'fetch', { identifier: 'https://example.com/a.png', responseType: 'base64' });
await chips.invoke('resource', 'resolve', { identifier: 'content/a.png', basePath: '/workspace/demo.card' });
await chips.invoke('resource', 'cache', { identifier: 'https://example.com/a.png', ttlSeconds: 3600 });
await chips.invoke('resource', 'check', { identifier: '/workspace/a.png' });
await chips.invoke('resource', 'getMeta', { identifier: '/workspace/a.png' });
await chips.invoke('resource', 'clearCache', { all: true });
```

---

## 4.5 ZIP 服务 `zip.*`

### 4.5.1 服务说明

- 命名空间：`zip`
- 职责：ZIP 创建/解压/条目读取/条目枚举
- `.card` 与 `.box` 默认使用零压缩模式（`store`）

### 4.5.2 TypeScript API

```ts
export interface ZipServiceApi {
  create(params: {
    sourceDir: string;
    outputPath: string;
    compression?: 'store' | 'deflate';
  }): Promise<{ outputPath: string; entries: number }>;

  extract(params: {
    zipPath: string;
    targetDir: string;
    overwrite?: boolean;
  }): Promise<{ targetDir: string; entries: number }>;

  readEntry(params: {
    zipPath: string;
    entryPath: string;
    encoding?: 'utf8' | 'base64';
  }): Promise<{ content: string; encoding: 'utf8' | 'base64' }>;

  listEntries(params: {
    zipPath: string;
  }): Promise<{ entries: Array<{ path: string; size: number; compressedSize: number }> }>;
}
```

### 4.5.3 Zod Schema

```ts
export const zipSchemas = {
  create: z.object({
    sourceDir: nonEmptyStringSchema,
    outputPath: nonEmptyStringSchema,
    compression: z.enum(['store', 'deflate']).optional()
  }),
  extract: z.object({
    zipPath: nonEmptyStringSchema,
    targetDir: nonEmptyStringSchema,
    overwrite: z.boolean().optional()
  }),
  readEntry: z.object({
    zipPath: nonEmptyStringSchema,
    entryPath: nonEmptyStringSchema,
    encoding: z.enum(['utf8', 'base64']).optional()
  }),
  listEntries: z.object({ zipPath: nonEmptyStringSchema })
} as const;
```

### 4.5.4 错误码

| 动作 | 错误码 |
|---|---|
| `create` | `ZIP_CREATE_FAILED`, `FILE_NOT_FOUND` |
| `extract` | `ZIP_EXTRACT_FAILED`, `ZIP_INVALID_FORMAT` |
| `readEntry` | `ZIP_ENTRY_NOT_FOUND`, `ZIP_READ_ENTRY_FAILED` |
| `listEntries` | `ZIP_INVALID_FORMAT`, `ZIP_LIST_FAILED` |

### 4.5.5 使用示例

```ts
await chips.invoke('zip', 'create', { sourceDir: '/workspace/card-folder', outputPath: '/workspace/a.card', compression: 'store' });
await chips.invoke('zip', 'extract', { zipPath: '/workspace/a.card', targetDir: '/workspace/tmp-a' });
await chips.invoke('zip', 'readEntry', { zipPath: '/workspace/a.card', entryPath: '.card/metadata.yaml', encoding: 'utf8' });
await chips.invoke('zip', 'listEntries', { zipPath: '/workspace/a.card' });
```

---

## 4.6 配置服务 `config.*`

### 4.6.1 服务说明

- 命名空间：`config`
- 职责：分层配置读写、覆盖合并、配置变更发布
- 配置层级（低→高）：
  1. `default`
  2. `system`
  3. `user`
  4. `app`
  5. `plugin`
  6. `runtime`
- 合并算法：
  - 对象：深合并
  - 数组：替换（不拼接）
  - 标量：高优先级覆盖

### 4.6.2 TypeScript API

```ts
export interface ConfigServiceApi {
  get(params: {
    key: string;
    scope?: 'effective' | 'default' | 'system' | 'user' | 'app' | 'plugin' | 'runtime';
    fallback?: unknown;
  }): Promise<{ value: unknown }>;

  set(params: {
    key: string;
    value: unknown;
    scope?: 'user' | 'app' | 'plugin' | 'runtime';
    pluginId?: string;
  }): Promise<{ updated: boolean }>;

  delete(params: {
    key: string;
    scope?: 'user' | 'app' | 'plugin' | 'runtime';
    pluginId?: string;
  }): Promise<{ deleted: boolean }>;

  list(params: {
    prefix?: string;
    scope?: 'effective' | 'default' | 'system' | 'user' | 'app' | 'plugin' | 'runtime';
  }): Promise<{ items: Array<{ key: string; value: unknown }> }>;
}
```

### 4.6.3 Zod Schema

```ts
export const configSchemas = {
  get: z.object({
    key: nonEmptyStringSchema,
    scope: z.enum(['effective', 'default', 'system', 'user', 'app', 'plugin', 'runtime']).optional(),
    fallback: z.unknown().optional()
  }),
  set: z.object({
    key: nonEmptyStringSchema,
    value: z.unknown(),
    scope: z.enum(['user', 'app', 'plugin', 'runtime']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }),
  delete: z.object({
    key: nonEmptyStringSchema,
    scope: z.enum(['user', 'app', 'plugin', 'runtime']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }),
  list: z.object({
    prefix: nonEmptyStringSchema.optional(),
    scope: z.enum(['effective', 'default', 'system', 'user', 'app', 'plugin', 'runtime']).optional()
  })
} as const;
```

### 4.6.4 错误码

| 动作 | 错误码 |
|---|---|
| `get` | `CONFIG_KEY_NOT_FOUND`, `CONFIG_READ_FAILED` |
| `set` | `CONFIG_SCOPE_INVALID`, `CONFIG_WRITE_FAILED` |
| `delete` | `CONFIG_SCOPE_INVALID`, `CONFIG_DELETE_FAILED` |
| `list` | `CONFIG_READ_FAILED` |

### 4.6.5 使用示例

```ts
await chips.invoke('config', 'get', { key: 'theme.current', scope: 'effective' });
await chips.invoke('config', 'set', { key: 'language.current', value: 'en-US', scope: 'user' });
await chips.invoke('config', 'delete', { key: 'app.editor.lastLayout', scope: 'app' });
await chips.invoke('config', 'list', { prefix: 'theme.', scope: 'effective' });
```

---

## 4.7 主题服务 `theme.*`

### 4.7.1 服务说明

- 命名空间：`theme`
- 职责：主题包注册、查询、应用、卸载、层级解析、合同查询
- 阶段05冻结：Bridge 外部运行时动作为 `list/apply/getCurrent/getAllCss/resolve/contract.get`
- 治理动作：`install/uninstall` 允许 `permissioned` 调用（受 `theme.write` 权限约束）；`get` 保持 `internal`
- 五级主题继承（低→高）：
  1. 组件级
  2. 卡片级
  3. 工作区级
  4. 应用级
  5. 全局级
- 解析算法：先按 `global -> app -> workspace -> card -> component` 合并 token，再以高层覆盖低层同名 token

### 4.7.2 TypeScript API

```ts
export interface ThemeServiceApi {
  list(params?: { publisher?: string }): Promise<{ themes: Array<{ id: string; name: string; version: string }> }>;

  get(params: { themeId: string }): Promise<{ theme: Record<string, unknown> }>;

  apply(params: { id: string }): Promise<{ applied: boolean; themeId: string }>;

  getCurrent(params?: { appId?: string; pluginId?: string }): Promise<{ themeId: string }>;

  getAllCss(params?: { appId?: string; pluginId?: string }): Promise<{
    css: Record<string, string>;
  }>;

  install(params: {
    packagePath: string;
    overwrite?: boolean;
  }): Promise<{ themeId: string; installed: boolean }>;

  uninstall(params: {
    themeId: string;
    force?: boolean;
  }): Promise<{ uninstalled: boolean }>;

  resolve(params: {
    chain: {
      component?: string;
      card?: string;
      workspace?: string;
      app?: string;
      global?: string;
    };
  }): Promise<{ resolvedThemeId: string; mergedTokens: Record<string, string> }>;

  contractGet(params?: { themeId?: string; component?: string }): Promise<{ contract: Record<string, unknown> }>;
}
```

### 4.7.3 Zod Schema

```ts
export const themeSchemas = {
  list: z.object({ publisher: nonEmptyStringSchema.optional() }).optional(),
  get: z.object({ themeId: nonEmptyStringSchema }),
  apply: z.object({ id: nonEmptyStringSchema }),
  getCurrent: z.object({ appId: nonEmptyStringSchema.optional(), pluginId: nonEmptyStringSchema.optional() }).optional(),
  getAllCss: z
    .object({
      appId: nonEmptyStringSchema.optional(),
      pluginId: nonEmptyStringSchema.optional()
    })
    .optional(),
  install: z.object({ packagePath: nonEmptyStringSchema, overwrite: z.boolean().optional() }),
  uninstall: z.object({ themeId: nonEmptyStringSchema, force: z.boolean().optional() }),
  resolve: z.object({
    chain: z
      .object({
        component: nonEmptyStringSchema.optional(),
        card: nonEmptyStringSchema.optional(),
        workspace: nonEmptyStringSchema.optional(),
        app: nonEmptyStringSchema.optional(),
        global: nonEmptyStringSchema.optional()
      })
      .strict()
      .refine((chain) => Object.keys(chain).length > 0, { message: 'chain must include at least one scope' })
  }),
  contractGet: z
    .object({
      themeId: nonEmptyStringSchema.optional(),
      component: nonEmptyStringSchema.optional()
    })
    .optional()
} as const;
```

### 4.7.4 错误码

| 动作 | 错误码 |
|---|---|
| `list` | `THEME_LIST_FAILED` |
| `get` | `THEME_NOT_FOUND`, `THEME_READ_FAILED` |
| `apply` | `THEME_APPLY_FAILED`, `VALIDATION_INVALID_PARAMS`, `THEME_NOT_FOUND` |
| `getCurrent` | `THEME_CURRENT_NOT_SET` |
| `getAllCss` | `THEME_CSS_NOT_FOUND`, `THEME_CURRENT_NOT_SET`, `THEME_NOT_FOUND` |
| `install` | `THEME_PACKAGE_INVALID`, `THEME_INSTALL_FAILED` |
| `uninstall` | `THEME_NOT_FOUND`, `THEME_IN_USE`, `THEME_UNINSTALL_FAILED` |
| `resolve` | `THEME_RESOLVE_FAILED`, `THEME_NOT_FOUND` |
| `contract.get` | `THEME_CONTRACT_NOT_FOUND`, `THEME_CONTRACT_INVALID`, `THEME_NOT_FOUND` |

### 4.7.5 使用示例

```ts
await chips.invoke('theme', 'apply', { id: 'chips-official.default-theme' });
await chips.invoke('theme', 'getCurrent', { appId: 'chips-official.editor' });
await chips.invoke('theme', 'getAllCss', { appId: 'chips-official.editor' });
await chips.invoke('theme', 'resolve', { chain: { component: 'x', card: 'y', workspace: 'w', app: 'a', global: 'chips-official.default-theme' } });
await chips.invoke('theme', 'contract.get', { component: 'ChipsButton' });
// 内部治理路径（非 Bridge 外部主路径）
await kernel.router.invoke('theme', 'list', {});
await kernel.router.invoke('theme', 'get', { themeId: 'chips-official.default-theme' });
await kernel.router.invoke('theme', 'install', { packagePath: '/downloads/default-theme.cpk' });
await kernel.router.invoke('theme', 'uninstall', { themeId: 'community.theme-x', force: false });
```

---

## 4.8 多语言服务 `i18n.*`

### 4.8.1 服务说明

- 命名空间：`i18n`
- 职责：词条翻译、批量翻译、语言切换、插件词汇注册
- 阶段05冻结动作：`list/getCurrent/setCurrent/translate/translateBatch/registerVocabulary`
- 编码替换机制：开发期 key（如 `common.save`）在打包期替换为编码（如 `i18n.core.000003`）

### 4.8.2 TypeScript API

```ts
export interface I18nServiceApi {
  list(params?: {}): Promise<{ locales: string[] }>;

  translate(params: {
    key: string;
    locale?: string;
    vars?: Record<string, string | number>;
    fallback?: string;
  }): Promise<{ text: string; locale: string }>;

  translateBatch(params: {
    keys: string[];
    locale?: string;
    vars?: Record<string, Record<string, string | number>>;
  }): Promise<{ items: Array<{ key: string; text: string }> }>;

  getCurrent(params?: {}): Promise<{ locale: string }>;

  setCurrent(params: {
    locale: string;
    persist?: boolean;
  }): Promise<{ changed: boolean }>;

  registerVocabulary(params: {
    pluginId: string;
    entries: Record<string, Record<string, string>>;
  }): Promise<{ registered: number }>;
}
```

### 4.8.3 Zod Schema

```ts
export const i18nSchemas = {
  list: z.object({}).optional(),
  translate: z.object({
    key: nonEmptyStringSchema,
    locale: nonEmptyStringSchema.optional(),
    vars: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    fallback: z.string().optional()
  }),
  translateBatch: z.object({
    keys: z.array(nonEmptyStringSchema).min(1),
    locale: nonEmptyStringSchema.optional(),
    vars: z.record(z.string(), z.record(z.string(), z.union([z.string(), z.number()]))).optional()
  }),
  getCurrent: z.object({}).optional(),
  setCurrent: z.object({
    locale: nonEmptyStringSchema,
    persist: z.boolean().optional()
  }),
  registerVocabulary: z.object({
    pluginId: nonEmptyStringSchema,
    entries: z.record(z.string(), z.record(z.string(), z.string()))
  })
} as const;
```

### 4.8.4 错误码

| 动作 | 错误码 |
|---|---|
| `list` | `I18N_LIST_LOCALES_FAILED` |
| `translate` | `I18N_KEY_NOT_FOUND`, `I18N_TRANSLATE_FAILED` |
| `translateBatch` | `I18N_KEY_NOT_FOUND`, `I18N_TRANSLATE_FAILED` |
| `getCurrent` | `I18N_LANGUAGE_NOT_SET` |
| `setCurrent` | `I18N_LANGUAGE_UNSUPPORTED`, `I18N_SET_LANGUAGE_FAILED` |
| `registerVocabulary` | `I18N_VOCAB_INVALID`, `I18N_REGISTER_FAILED` |

### 4.8.5 使用示例

```ts
await chips.invoke('i18n', 'list', {});
await chips.invoke('i18n', 'translate', { key: 'i18n.core.000003' });
await chips.invoke('i18n', 'translateBatch', { keys: ['i18n.core.000001', 'i18n.core.000002'] });
await chips.invoke('i18n', 'getCurrent', {});
await chips.invoke('i18n', 'setCurrent', { locale: 'en-US', persist: true });
await chips.invoke('i18n', 'registerVocabulary', { pluginId: 'community.todo', entries: { 'i18n.plugin.600001': { 'zh-CN': '待办', 'en-US': 'Todo' } } });
```

---

## 4.9 凭证服务 `credential.*`

### 4.9.1 服务说明

- 命名空间：`credential`
- 职责：认证凭证安全存取
- 加密存储方案：
  - 使用 OS 密钥链（macOS Keychain / Windows Credential Manager / Linux Secret Service）
  - 数据层采用 `AES-256-GCM` 二次封装

### 4.9.2 TypeScript API

```ts
export interface CredentialServiceApi {
  save(params: {
    key: string;
    value: string;
    scope?: 'global' | 'plugin';
    pluginId?: string;
  }): Promise<{ saved: boolean }>;

  get(params: {
    key: string;
    scope?: 'global' | 'plugin';
    pluginId?: string;
  }): Promise<{ value?: string }>;

  delete(params: {
    key: string;
    scope?: 'global' | 'plugin';
    pluginId?: string;
  }): Promise<{ deleted: boolean }>;

  list(params?: {
    scope?: 'global' | 'plugin';
    pluginId?: string;
  }): Promise<{ keys: string[] }>;
}
```

### 4.9.3 Zod Schema

```ts
export const credentialSchemas = {
  save: z.object({
    key: nonEmptyStringSchema,
    value: nonEmptyStringSchema,
    scope: z.enum(['global', 'plugin']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }),
  get: z.object({
    key: nonEmptyStringSchema,
    scope: z.enum(['global', 'plugin']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }),
  delete: z.object({
    key: nonEmptyStringSchema,
    scope: z.enum(['global', 'plugin']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }),
  list: z.object({
    scope: z.enum(['global', 'plugin']).optional(),
    pluginId: nonEmptyStringSchema.optional()
  }).optional()
} as const;
```

### 4.9.4 错误码

| 动作 | 错误码 |
|---|---|
| `save` | `CREDENTIAL_SAVE_FAILED`, `CREDENTIAL_STORE_UNAVAILABLE` |
| `get` | `CREDENTIAL_NOT_FOUND`, `CREDENTIAL_READ_FAILED` |
| `delete` | `CREDENTIAL_DELETE_FAILED` |
| `list` | `CREDENTIAL_LIST_FAILED` |

### 4.9.5 使用示例

```ts
await chips.invoke('credential', 'save', { key: 'webdav.main.password', value: '***', scope: 'global' });
await chips.invoke('credential', 'get', { key: 'webdav.main.password', scope: 'global' });
await chips.invoke('credential', 'delete', { key: 'webdav.main.password', scope: 'global' });
await chips.invoke('credential', 'list', { scope: 'global' });
```

---

## 4.10 日志服务 `log.*`

### 4.10.1 服务说明

- 命名空间：`log`
- 职责：结构化日志写入、查询、导出
- 日志级别：`debug | info | warn | error`
- 日志格式：JSON 行式（JSONL）

### 4.10.2 TypeScript API

```ts
export interface LogServiceApi {
  write(params: {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
    source?: string;
  }): Promise<{ written: boolean }>;

  query(params: {
    levels?: Array<'debug' | 'info' | 'warn' | 'error'>;
    from?: IsoDateTime;
    to?: IsoDateTime;
    keyword?: string;
    limit?: number;
  }): Promise<{ items: Array<Record<string, unknown>> }>;

  export(params: {
    outputPath: string;
    format?: 'jsonl' | 'json' | 'txt';
    from?: IsoDateTime;
    to?: IsoDateTime;
  }): Promise<{ outputPath: string; exported: number }>;
}
```

### 4.10.3 Zod Schema

```ts
export const logSchemas = {
  write: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']),
    message: nonEmptyStringSchema,
    context: z.record(z.string(), z.unknown()).optional(),
    source: nonEmptyStringSchema.optional()
  }),
  query: z.object({
    levels: z.array(z.enum(['debug', 'info', 'warn', 'error'])).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    keyword: nonEmptyStringSchema.optional(),
    limit: z.number().int().min(1).max(10_000).optional()
  }),
  export: z.object({
    outputPath: nonEmptyStringSchema,
    format: z.enum(['jsonl', 'json', 'txt']).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional()
  })
} as const;
```

### 4.10.4 错误码

| 动作 | 错误码 |
|---|---|
| `write` | `LOG_WRITE_FAILED` |
| `query` | `LOG_QUERY_FAILED` |
| `export` | `LOG_EXPORT_FAILED`, `FILE_WRITE_FAILED` |

### 4.10.5 使用示例

```ts
await chips.invoke('log', 'write', { level: 'info', message: 'card opened', source: 'chips-official.viewer' });
await chips.invoke('log', 'query', { levels: ['error'], limit: 200 });
await chips.invoke('log', 'export', { outputPath: '/workspace/logs.jsonl', format: 'jsonl' });
```

---

## 4.11 标签服务 `tag.*`

### 4.11.1 服务说明

- 命名空间：`tag`
- 职责：标签映射维护、组合查询、模糊检索
- 性能要求：
  - `queryFiles` 在 100 万条映射下 P95 < 80ms
  - `search` 在 10 万标签下 P95 < 40ms
- 索引建议：
  - `(tag_key, tag_value)` 复合索引
  - `file_path` 单列索引

### 4.11.2 TypeScript API

```ts
export interface TagServiceApi {
  add(params: {
    filePath: string;
    tags: Array<{ key: string; value: string }>;
    replace?: boolean;
  }): Promise<{ updated: boolean }>;

  remove(params: {
    filePath: string;
    tags?: Array<{ key: string; value?: string }>;
    removeAll?: boolean;
  }): Promise<{ updated: boolean }>;

  queryFiles(params: {
    include: Array<{ key: string; value: string }>;
    exclude?: Array<{ key: string; value: string }>;
    mode?: 'and' | 'or';
    limit?: number;
    offset?: number;
  }): Promise<{ files: string[]; total: number }>;

  getFileTags(params: { filePath: string }): Promise<{ tags: Array<{ key: string; value: string }> }>;

  search(params: {
    keyword: string;
    limit?: number;
  }): Promise<{ tags: Array<{ key: string; value: string; count: number }> }>;

  batchUpdate(params: {
    operations: Array<
      | { op: 'add'; filePath: string; tags: Array<{ key: string; value: string }> }
      | { op: 'remove'; filePath: string; tags?: Array<{ key: string; value?: string }>; removeAll?: boolean }
    >;
  }): Promise<{ success: number; failed: number }>;
}
```

### 4.11.3 Zod Schema

```ts
const tagPairSchema = z.object({ key: nonEmptyStringSchema, value: nonEmptyStringSchema });

export const tagSchemas = {
  add: z.object({
    filePath: nonEmptyStringSchema,
    tags: z.array(tagPairSchema).min(1),
    replace: z.boolean().optional()
  }),
  remove: z.object({
    filePath: nonEmptyStringSchema,
    tags: z.array(z.object({ key: nonEmptyStringSchema, value: nonEmptyStringSchema.optional() })).optional(),
    removeAll: z.boolean().optional()
  }).refine((v) => Boolean(v.removeAll || (v.tags && v.tags.length > 0)), 'removeAll=true or tags is required'),
  queryFiles: z.object({
    include: z.array(tagPairSchema).min(1),
    exclude: z.array(tagPairSchema).optional(),
    mode: z.enum(['and', 'or']).optional(),
    limit: z.number().int().min(1).max(10_000).optional(),
    offset: z.number().int().min(0).optional()
  }),
  getFileTags: z.object({ filePath: nonEmptyStringSchema }),
  search: z.object({ keyword: nonEmptyStringSchema, limit: z.number().int().min(1).max(1000).optional() }),
  batchUpdate: z.object({
    operations: z.array(
      z.union([
        z.object({ op: z.literal('add'), filePath: nonEmptyStringSchema, tags: z.array(tagPairSchema).min(1) }),
        z.object({
          op: z.literal('remove'),
          filePath: nonEmptyStringSchema,
          tags: z.array(z.object({ key: nonEmptyStringSchema, value: nonEmptyStringSchema.optional() })).optional(),
          removeAll: z.boolean().optional()
        })
      ])
    ).min(1)
  })
} as const;
```

### 4.11.4 错误码

| 动作 | 错误码 |
|---|---|
| `add` | `TAG_ADD_FAILED`, `TAG_INVALID` |
| `remove` | `TAG_REMOVE_FAILED` |
| `queryFiles` | `TAG_QUERY_FAILED`, `TAG_QUERY_LIMIT_EXCEEDED` |
| `getFileTags` | `TAG_FILE_NOT_FOUND`, `TAG_QUERY_FAILED` |
| `search` | `TAG_SEARCH_FAILED` |
| `batchUpdate` | `TAG_BATCH_FAILED`, `TAG_INVALID` |

### 4.11.5 使用示例

```ts
await chips.invoke('tag', 'add', { filePath: '/workspace/a.card', tags: [{ key: '项目', value: '重构' }] });
await chips.invoke('tag', 'remove', { filePath: '/workspace/a.card', tags: [{ key: '项目', value: '重构' }] });
await chips.invoke('tag', 'queryFiles', { include: [{ key: '月份', value: '三月' }], mode: 'and' });
await chips.invoke('tag', 'getFileTags', { filePath: '/workspace/a.card' });
await chips.invoke('tag', 'search', { keyword: '项目', limit: 20 });
await chips.invoke('tag', 'batchUpdate', { operations: [{ op: 'add', filePath: '/workspace/a.card', tags: [{ key: '状态', value: '完成' }] }] });
```

---

## 4.12 序列化服务 `serializer.*`

### 4.12.1 服务说明

- 命名空间：`serializer`
- 职责：YAML/JSON 序列化与反序列化
- 安全约束：
  - 禁止 YAML 执行类型（仅安全子集）
  - JSON 解析默认拒绝原型污染键

### 4.12.2 TypeScript API

```ts
export interface SerializerServiceApi {
  parseYaml(params: { text: string }): Promise<{ data: unknown }>;
  stringifyYaml(params: { data: unknown; indent?: number }): Promise<{ text: string }>;
  parseJson(params: { text: string }): Promise<{ data: unknown }>;
  stringifyJson(params: { data: unknown; indent?: number }): Promise<{ text: string }>;
}
```

### 4.12.3 Zod Schema

```ts
export const serializerSchemas = {
  parseYaml: z.object({ text: z.string() }),
  stringifyYaml: z.object({ data: z.unknown(), indent: z.number().int().min(0).max(8).optional() }),
  parseJson: z.object({ text: z.string() }),
  stringifyJson: z.object({ data: z.unknown(), indent: z.number().int().min(0).max(8).optional() })
} as const;
```

### 4.12.4 错误码

| 动作 | 错误码 |
|---|---|
| `parseYaml` | `SERIALIZER_YAML_PARSE_FAILED` |
| `stringifyYaml` | `SERIALIZER_YAML_STRINGIFY_FAILED` |
| `parseJson` | `SERIALIZER_JSON_PARSE_FAILED` |
| `stringifyJson` | `SERIALIZER_JSON_STRINGIFY_FAILED` |

### 4.12.5 使用示例

```ts
await chips.invoke('serializer', 'parseYaml', { text: 'name: chips' });
await chips.invoke('serializer', 'stringifyYaml', { data: { name: 'chips' }, indent: 2 });
await chips.invoke('serializer', 'parseJson', { text: '{"name":"chips"}' });
await chips.invoke('serializer', 'stringifyJson', { data: { name: 'chips' }, indent: 2 });
```

---

## 4.13 平台服务 `platform.*`

### 4.13.1 服务说明

- 命名空间：`platform`
- 职责：将 PAL 适配器能力映射为可路由调用 API
- 仅提供统一能力，不暴露平台私有实现细节

### 4.13.2 PAL 映射表

| platform 动作 | PAL 适配器接口 |
|---|---|
| `getSystemInfo` | `SystemAdapter.getSystemInfo()` |
| `getScreenInfo` | `ScreenAdapter.getScreenInfo()` |
| `hasCapability` | `PlatformManager.hasCapability()` |
| `listCapabilities` | `PlatformManager.listCapabilities()` |
| `getAppearance` | `AppearanceAdapter.getAppearance()` |
| `getPowerStatus` | `PowerAdapter.getPowerStatus()` |
| `registerShortcut` | `ShortcutAdapter.register()` |
| `unregisterShortcut` | `ShortcutAdapter.unregister()` |
| `setAutoLaunch` | `AutoLaunchAdapter.setEnabled()` |
| `showInFileManager` | `ShellAdapter.showInFileManager()` |
| `openExternal` | `ShellAdapter.openExternal()` |

### 4.13.3 TypeScript API

```ts
export interface PlatformServiceApi {
  getSystemInfo(params?: {}): Promise<{ os: string; version: string; cpu: string; memoryBytes: number }>;

  getScreenInfo(params?: {}): Promise<{
    displays: Array<{ id: string; width: number; height: number; scaleFactor: number; primary: boolean }>;
  }>;

  hasCapability(params: { capability: string }): Promise<{ supported: boolean }>;

  listCapabilities(params?: {}): Promise<{ capabilities: string[] }>;

  getAppearance(params?: {}): Promise<{ scheme: 'light' | 'dark'; accentColor?: string }>;

  getPowerStatus(params?: {}): Promise<{ onBattery: boolean; batteryLevel?: number; charging?: boolean }>;

  registerShortcut(params: {
    accelerator: string;
    eventName: string;
  }): Promise<{ registered: boolean }>;

  unregisterShortcut(params: {
    accelerator: string;
  }): Promise<{ unregistered: boolean }>;

  setAutoLaunch(params: {
    enabled: boolean;
  }): Promise<{ updated: boolean }>;

  showInFileManager(params: {
    path: string;
  }): Promise<{ success: boolean }>;

  openExternal(params: {
    url: string;
  }): Promise<{ success: boolean }>;
}
```

### 4.13.4 Zod Schema

```ts
export const platformSchemas = {
  getSystemInfo: z.object({}).optional(),
  getScreenInfo: z.object({}).optional(),
  hasCapability: z.object({ capability: nonEmptyStringSchema }),
  listCapabilities: z.object({}).optional(),
  getAppearance: z.object({}).optional(),
  getPowerStatus: z.object({}).optional(),
  registerShortcut: z.object({
    accelerator: nonEmptyStringSchema,
    eventName: nonEmptyStringSchema
  }),
  unregisterShortcut: z.object({
    accelerator: nonEmptyStringSchema
  }),
  setAutoLaunch: z.object({ enabled: z.boolean() }),
  showInFileManager: z.object({ path: nonEmptyStringSchema }),
  openExternal: z.object({ url: urlSchema })
} as const;
```

### 4.13.5 错误码

| 动作 | 错误码 |
|---|---|
| `getSystemInfo` | `PLATFORM_INFO_FAILED` |
| `getScreenInfo` | `PLATFORM_SCREEN_FAILED` |
| `hasCapability` | `PLATFORM_CAPABILITY_INVALID` |
| `listCapabilities` | `PLATFORM_CAPABILITY_LIST_FAILED` |
| `getAppearance` | `PLATFORM_APPEARANCE_FAILED` |
| `getPowerStatus` | `PLATFORM_POWER_FAILED` |
| `registerShortcut` | `PLATFORM_SHORTCUT_REGISTER_FAILED`, `PLATFORM_SHORTCUT_CONFLICT` |
| `unregisterShortcut` | `PLATFORM_SHORTCUT_UNREGISTER_FAILED` |
| `setAutoLaunch` | `PLATFORM_AUTO_LAUNCH_FAILED` |
| `showInFileManager` | `PLATFORM_SHELL_FAILED`, `FILE_NOT_FOUND` |
| `openExternal` | `PLATFORM_SHELL_FAILED`, `VALIDATION_INVALID_PARAMS` |

### 4.13.6 使用示例

```ts
await chips.invoke('platform', 'getSystemInfo', {});
await chips.invoke('platform', 'getScreenInfo', {});
await chips.invoke('platform', 'hasCapability', { capability: 'desktop.wallpaper' });
await chips.invoke('platform', 'listCapabilities', {});
await chips.invoke('platform', 'getAppearance', {});
await chips.invoke('platform', 'getPowerStatus', {});
await chips.invoke('platform', 'registerShortcut', { accelerator: 'CmdOrCtrl+Shift+P', eventName: 'shortcut.palette' });
await chips.invoke('platform', 'unregisterShortcut', { accelerator: 'CmdOrCtrl+Shift+P' });
await chips.invoke('platform', 'setAutoLaunch', { enabled: true });
await chips.invoke('platform', 'showInFileManager', { path: '/workspace/a.card' });
await chips.invoke('platform', 'openExternal', { url: 'https://chips.example.com' });
```

---

## 4.14 模块加载服务 `module.*`

### 4.14.1 服务说明

- 命名空间：`module`
- 职责：模块插件发现、查询、加载、信息读取
- 加载方式：
  - iframe：返回 `entryUrl`
  - ES Module：返回 `moduleUrl`
- 缓存策略：
  - 以 `moduleId@version` 作为缓存键
  - `load` 默认命中内存缓存；可通过 `preferCache: false` 强制刷新

### 4.14.2 TypeScript API

```ts
export interface ModuleServiceApi {
  load(params: {
    moduleId: string;
    prefer?: 'iframe' | 'esm' | 'auto';
    preferCache?: boolean;
  }): Promise<{
    moduleId: string;
    version: string;
    entryUrl?: string;
    moduleUrl?: string;
    capabilities: string[];
  }>;

  list(params?: {
    capability?: string;
  }): Promise<{ modules: Array<{ moduleId: string; version: string; capabilities: string[] }> }>;

  query(params: {
    capabilities: string[];
    mode?: 'all' | 'any';
  }): Promise<{ modules: Array<{ moduleId: string; score: number }> }>;

  getInfo(params: {
    moduleId: string;
  }): Promise<{ info: Record<string, unknown> }>;
}
```

### 4.14.3 Zod Schema

```ts
export const moduleSchemas = {
  load: z.object({
    moduleId: nonEmptyStringSchema,
    prefer: z.enum(['iframe', 'esm', 'auto']).optional(),
    preferCache: z.boolean().optional()
  }),
  list: z.object({ capability: nonEmptyStringSchema.optional() }).optional(),
  query: z.object({
    capabilities: z.array(nonEmptyStringSchema).min(1),
    mode: z.enum(['all', 'any']).optional()
  }),
  getInfo: z.object({ moduleId: nonEmptyStringSchema })
} as const;
```

### 4.14.4 错误码

| 动作 | 错误码 |
|---|---|
| `load` | `MODULE_NOT_FOUND`, `MODULE_LOAD_FAILED`, `MODULE_ENTRY_NOT_FOUND` |
| `list` | `MODULE_LIST_FAILED` |
| `query` | `MODULE_QUERY_FAILED` |
| `getInfo` | `MODULE_NOT_FOUND`, `MODULE_INFO_FAILED` |

### 4.14.5 使用示例

```ts
await chips.invoke('module', 'load', { moduleId: 'chips-module-video-player', prefer: 'auto' });
await chips.invoke('module', 'list', { capability: 'media.video' });
await chips.invoke('module', 'query', { capabilities: ['media.video', 'subtitle'], mode: 'all' });
await chips.invoke('module', 'getInfo', { moduleId: 'chips-module-video-player' });
```

---

## 5. 错误码前缀规范

| 前缀 | 说明 |
|---|---|
| `FILE_` | 文件与路径错误 |
| `CARD_` | 卡片格式与会话错误 |
| `BOX_` | 箱子格式与结构错误 |
| `RESOURCE_` | 资源访问与缓存错误 |
| `ZIP_` | ZIP 处理错误 |
| `CONFIG_` | 配置读写与合并错误 |
| `THEME_` | 主题包与解析错误 |
| `I18N_` | 翻译与词汇错误 |
| `CREDENTIAL_` | 凭证安全存储错误 |
| `LOG_` | 日志系统错误 |
| `TAG_` | 标签映射与查询错误 |
| `SERIALIZER_` | 序列化与反序列化错误 |
| `PLATFORM_` | 平台适配错误 |
| `MODULE_` | 模块插件加载错误 |
| `VALIDATION_` | 参数校验错误 |
| `PERMISSION_` | 权限错误 |
| `SYSTEM_` | 系统级兜底错误 |

---

## 6. 实现约束（阶段二落地检查项）

1. 每个服务按统一注册模式实现：`initialize()` + `registerRoutes(kernel)`。
2. 所有参数先经 Zod 校验，失败返回 `VALIDATION_INVALID_PARAMS`。
3. 所有 async 动作必须捕获并转换为标准错误格式。
4. 服务间调用只能通过 `kernel.router.invoke()`。
5. 渲染进程不得绕过 Bridge API 调用系统能力。
6. 每个服务模块单元测试至少 8 条，覆盖正常/异常/边界。

---

## 7. 与其他规格文档的对齐关系

- 对齐 `生态架构设计/03-基础服务层设计.md`（14 类服务与动作数量）
- 对齐 `生态架构设计/11-架构审核与修正.md`（修正二：模块插件；修正三：platform 命名空间）
- 对齐 `生态共用/02-卡片文件格式规范.md`、`生态共用/03-箱子文件格式规范.md`（文件结构）
- 对齐 `生态共用/11-多语言系统规范.md`（编码替换机制）
- 对齐 `生态架构设计/08-平台抽象层与跨平台策略.md`（PAL 映射）
