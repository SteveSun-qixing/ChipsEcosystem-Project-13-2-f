# 社区服务器后端架构与性能重构方案

## 1. 文档定位

- 核对日期：2026-05-24
- 文档性质：task023 任务方案，保存于 `项目日志与笔记/`，不作为生态公共契约最终发布位置。
- 适用范围：`Chips-CommunityPlatformServer` 卡片上传、保存、打开、网页查看、对象存储、Worker、Web 插件宿主和生产部署链路。
- 核心结论：社区服务器主链路应直接保存、转发和查看处理后的 `.card` 文件，不再把 HTML 转换作为上传发布和网页查看的必经路径。

本方案补充 `01-总体重构方案.md`、`02-接口与数据模型方案.md` 与 `03-实施步骤与验收清单.md`，重点覆盖后端分层、热路径性能、部署架构、安全边界和长期扩展。

## 2. 已核对范围

本轮方案基于以下材料与代码核对：

- 生态设计原稿：
  - `生态设计原稿/20-社区服务器架构.md`
  - `生态设计原稿/05-卡片文件格式.md`
  - `生态设计原稿/09-卡片渲染机制.md`
  - `生态设计原稿/15-查看器设计.md`
  - `生态设计原稿/04-前后端完全分离架构.md`
- 生态共用技术文档：
  - `生态共用技术文档/协议与契约/09-社区平台API契约.md`
  - `生态共用技术文档/文件格式规范/01-卡片文件格式规范.md`
  - `生态共用技术文档/协议与契约/09-卡片信息与打开契约.md`
  - `生态共用技术文档/架构设计/11-性能优化架构设计.md`
  - `生态共用技术文档/部署与运维/01-部署架构设计.md`
- 社区服务器内部文档：
  - `Chips-CommunityPlatformServer/技术文档/07-启动与运行说明.md`
  - `Chips-CommunityPlatformServer/技术文档/08-社区Web插件宿主链路.md`
  - `Chips-CommunityPlatformServer/技术文档/09-生产域名与对象存储部署说明.md`
- 当前代码：
  - `packages/server/src/app.ts`
  - `packages/server/src/routes/upload.ts`
  - `packages/server/src/routes/cards.ts`
  - `packages/server/src/routes/discover.ts`
  - `packages/server/src/routes/rooms.ts`
  - `packages/server/src/routes/host-runtime.ts`
  - `packages/server/src/services/card.service.ts`
  - `packages/server/src/services/card-pipeline-queue.service.ts`
  - `packages/server/src/services/host-integration.ts`
  - `packages/server/src/pipeline/card-pipeline.ts`
  - `packages/server/src/storage/buckets.ts`
  - `packages/server/src/storage/s3.ts`
  - `packages/server/src/storage/init.ts`
  - `packages/server/src/db/schema/cards.ts`
  - `packages/server/src/db/schema/card-pipeline-jobs.ts`
  - `packages/web/src/pages/CardDetailPage.tsx`
  - `packages/web/src/pages/DocumentPluginRoutePage.tsx`
  - `packages/web/src/api/content.ts`
  - `Chips-CardViewer/src/types/viewer-source.ts`
  - `Chips-CardViewer/src/components/ViewerSourceProvider.tsx`

## 3. 当前后端架构快照

当前社区服务器由以下部分组成：

1. Fastify API 进程
   - 提供 `/api/v1` 与 `/admin/api/v1` REST API；
   - 负责认证、用户、房间、卡片、箱子、发现、搜索、上传、Web 插件会话；
   - 启动时通过 `onReady` 初始化 `HostIntegrationService`，安装 CardViewer、PhotoViewer、基础卡片插件、布局插件、主题插件和转换模块插件。
2. PostgreSQL
   - 保存用户、房间、卡片、箱子、卡片 pipeline job 等结构化数据；
   - `cards` 表当前以 `htmlUrl` 作为卡片查看主产物字段；
   - `cardMetadata`、`cardStructure` 以 JSONB 存储完整结构。
3. Redis
   - 保存登录失败计数、refresh token 吊销状态；
   - 保存卡片转换队列 `ccps:card-pipeline:queue`。
4. S3 / MinIO 对象存储
   - 当前逻辑 bucket 包含 `chips-card-resources`、`chips-card-html`、`chips-card-pipeline-inputs`、`chips-avatars`、`chips-covers`；
   - 公开资源可通过 `file.chipscard.space` 直连；
   - pipeline 原始输入对象使用私有 bucket。
5. 卡片转换 Worker
   - 消费 Redis 队列；
   - 下载 `chips-card-pipeline-inputs/{userId}/{cardId}/source.card`；
   - 调用 `runCardPipeline`，完成资源上传、URL 替换、重新打包、HTML 转换、封面 HTML 产物上传；
   - 成功后把 `cards.status` 置为 `ready`，并写入 `htmlUrl` / `coverUrl`。
6. 社区 Web 前台
   - `/cards/:cardId` 调用 `GET /api/v1/cards/:cardId/open-view`；
   - 当前只有 `status = ready` 且存在 `htmlUrl` 时，才启动 `com.chips.card-viewer`；
   - `cardSource.kind = community-card`，`documentUrl = htmlUrl`。
7. Web 插件宿主
   - API 进程内的 `HostIntegrationService` 负责创建 Web 插件会话、注入 bootstrap、代理插件资源和解析 `resource.open`。
8. Chips-CardViewer
   - 当前 `community-card` 解析为 `hosted-document`，用 iframe 打开 `documentUrl`；
   - 已声明 `remote-card-file`，但当前解析为 `unsupported`；
   - 本地 `.card` 仍走 Host / SDK 本地文件路径链路。

## 4. 当前架构问题

### 4.1 主链路职责偏重

上传 `.card` 后，服务器仍承担卡片内容处理、资源外置、URL 替换、重新打包、HTML 转换和封面 HTML 导出。对于社区服务器带宽较低的部署条件，这会让 API、Worker、对象存储和网络出口都承受不必要压力。

目标链路应把卡片处理前移到用户设备：官方本地上传器在用户设备上读取 `.card`，把大资源直传资源服务器，替换卡片内部资源链接，重新打包处理后的 `.card`，再提交给社区服务器。

### 4.2 查看热路径依赖 `htmlUrl`

当前 `open-view` 和 `CardDetailPage` 的打开判断仍依赖 `htmlUrl`。这意味着只要不生成 HTML，网页端就认为卡片不可查看。新链路必须以 `cardFileUrl` / `cardFileEndpoint` 作为主入口。

### 4.3 API 进程混合业务 API 与 Host Web Runtime

`buildApp()` 在 `onReady` 中初始化完整 HostIntegration。它让普通 API 启动与插件安装、主题应用、转换模块安装绑定在一起。新架构下：

- 普通内容 API 应尽量轻量、可快速扩容；
- Web 插件宿主可以保留，但应作为单独的 Host Runtime 服务域或至少延迟初始化；
- `.card` 文件保存和打开信息返回不应依赖 HTML 转换模块。

### 4.4 对象存储缺少 `.card` 主文件 bucket

当前对象存储有 `chips-card-html` 和 pipeline 输入 bucket，但没有正式保存发布态 `.card` 的 `chips-card-files`。这导致社区没有把 `.card` 作为主文档保存和返回的稳定模型。

### 4.5 上传缺少会话、幂等、配额和资源归属校验

当前 `/api/v1/upload/card` 是一次性 multipart 上传，并立即创建卡片记录与 pipeline job。它缺少：

- 上传会话；
- 资源预签名目标；
- 本地上传器设备会话；
- 幂等键；
- 处理后 `.card` 与资源 manifest 的一致性校验；
- 用户级并发、配额、限流。

### 4.6 一些列表与管理路径还有性能隐患

已存在的 `open-view` 轻量化方向是正确的，但仍有若干可优化点：

- `discover/cards` 当前查询未显式限制列，可能把 JSONB 大字段带入发现列表；
- 房间列表逐个调用 `getContentCounts`，存在 N+1 计数风险；
- 头像、房间封面等上传路径部分会聚合 Buffer，后续大文件类接口必须保持流式；
- Web 插件会话目前保存在 API 进程内存，多实例部署时需要会话归属、TTL 和清理策略；
- 管理后台内容检索需要分页、索引、审计与慢查询观测。

## 5. 目标架构原则

1. `.card` 是社区卡片发布态和查看态的主文档。
2. 社区主链路只保存处理后的 `.card`，不在发布阶段转换 HTML。
3. 用户设备负责卡片资源外置、链接替换和重新打包。
4. 资源流量优先直达对象存储 / CDN，社区 API 不做大文件中转。
5. 社区 API 热路径只返回打开所需轻量字段。
6. 私有内容必须在 `.card` 文件读取入口和资源读取入口都保留权限边界。
7. Worker 只处理异步、可选、非打开必需任务。
8. Web 插件宿主与内容 API 解耦，避免插件运行时拖慢普通 API。
9. 所有公开接口最终沉淀到 `生态共用技术文档/协议与契约/09-社区平台API契约.md`。

## 6. 目标后端分层

### 6.1 Edge / Nginx 层

职责：

- TLS、域名跳转、静态资源长缓存；
- API 反向代理；
- 对 `.card` 文件下载 endpoint 支持 `Range`、`ETag`、`Cache-Control`；
- 对大文件上传接口设置明确 `client_max_body_size`；
- 对可公开对象优先重定向到 `file.chipscard.space`，避免社区主站承担下载流量。

建议：

- `/api/v1/cards/:cardId/file` 对公开卡片优先返回短路径 302 到对象存储公开 URL；
- 私有卡片第一阶段可由 API 流式代理，后续应升级为短时签名 URL；
- `.card` 文件响应使用 `application/vnd.chips.card+zip`；
- 使用 `ETag` 或 `x-chips-card-sha256` 支持浏览器和 CDN 缓存。

### 6.2 API Gateway / Fastify 层

职责：

- 认证、鉴权、参数校验、统一错误；
- 上传会话创建、资源 presign、处理后 `.card` 提交；
- 卡片、箱子、房间、发现、搜索、后台管理；
- 返回轻量 DTO，不把大 JSONB 放入列表和打开热路径。

要求：

- 普通 API 启动不依赖文件转换模块；
- API 只进行必要的 `.card` 结构预检和 manifest 校验；
- 文件写入对象存储使用流式，不把 `.card` 整体读入内存；
- 需要可横向扩展，避免在 API 内存中保存不可迁移的业务状态。

### 6.3 Auth / Device Session 层

职责：

- 网页端继续使用 Cookie refresh token；
- 官方本地上传器使用设备会话；
- 设备会话记录客户端名称、版本、平台、最后使用时间、scope；
- 支持吊销单个设备或全部设备。

建议 scope：

- `upload:card`
- `upload:box`
- `content:read-own`
- `content:write-own`

本地上传器不保存对象存储长期密钥，只通过社区服务器签发的上传目标访问资源服务器。

### 6.4 Upload Session 层

职责：

- 创建发布会话；
- 记录用户、目标房间、可见性、客户端信息、资源前缀、过期时间；
- 签发资源上传目标；
- 接收处理后的 `.card`；
- 校验资源 manifest 与对象存储对象归属；
- 完成后创建 `cards` 记录并标记 `ready`。

建议状态：

- `created`
- `uploading_resources`
- `submitting_document`
- `validating`
- `ready`
- `error`
- `cancelled`
- `expired`

关键性能点：

- 资源上传走对象存储预签名 URL，不经过社区 API；
- 处理后的 `.card` 如果体积较大，后续也应支持直传或分片上传；
- API 只保存会话元数据和最终登记，不承担大资源搬运。

### 6.5 Storage Gateway 层

职责：

- 统一封装 S3 / MinIO 写入、删除、Head、签名 URL、公开 URL 构建；
- 管理逻辑 bucket 与单物理 bucket 映射；
- 校验资源对象存在性、大小、sha256；
- 管理公开、私有、短时签名策略。

建议 bucket：

- `chips-card-files`：发布态 `.card` 主文件；
- `chips-card-resources`：外置资源；
- `chips-avatars`：用户头像；
- `chips-covers`：房间、箱子和可选封面资源；
- `chips-card-pipeline-inputs`：仅保留给按需转换任务，不再是主上传链路必经；
- `chips-card-html`：仅保留给按需转换缓存，不再是主查看入口。

公开卡片对象路径建议：

```text
chips-card-files/{userId}/{cardId}/card.card
chips-card-resources/{userId}/{cardId}/resources/{relativePath}
```

### 6.6 Content Registry 层

职责：

- 维护 `cards` / `boxes` 的社区内容索引；
- 保存打开热路径需要的列；
- 保存完整 metadata / structure 作为详情和后台分析使用；
- 管理删除清理、权限、状态、搜索索引触发。

`cards` 表建议把以下字段作为热路径列：

- `id`
- `userId`
- `roomId`
- `title`
- `coverUrl`
- `coverRatio`
- `cardFileUrl`
- `cardFileBucket`
- `cardFileKey`
- `cardFileSha256`
- `status`
- `visibility`
- `fileSizeBytes`
- `createdAt`
- `updatedAt`

`cardMetadata`、`cardStructure`、`resourceManifest` 可以保留为 JSONB，但不得进入列表和打开页默认查询。

### 6.7 Card File Access 层

职责：

- `GET /api/v1/cards/:cardId/open-view` 返回轻量打开信息；
- `GET /api/v1/cards/:cardId/file` 提供 `.card` 文件读取；
- 根据公开 / 私有策略决定返回公开 URL、短时签名 URL、302 或流式响应；
- 支持 `ETag`、`Range`、`Cache-Control`。

打开信息建议：

```json
{
  "id": "uuid",
  "title": "卡片标题",
  "status": "ready",
  "visibility": "public",
  "cardFileUrl": "https://file.chipscard.space/chips-card-files/...",
  "cardFileEndpoint": "/api/v1/cards/uuid/file",
  "cardFileSha256": "...",
  "coverUrl": "https://...",
  "coverRatio": "3:4",
  "createdAt": "2026-05-24T00:00:00.000Z",
  "updatedAt": "2026-05-24T00:00:00.000Z"
}
```

前台判断可打开条件应变为：

```ts
card.status === 'ready' && Boolean(card.cardFileUrl || card.cardFileEndpoint)
```

### 6.8 Web Host Runtime 层

职责：

- 承载 `com.chips.card-viewer`、`com.chips.photo-viewer` 等 Web app 插件；
- 处理 `resource.open`；
- 注入 `window.chips` Web bridge；
- 管理插件会话生命周期。

重构建议：

1. 普通 API 与 Web Host Runtime 逻辑解耦。
2. 第一阶段可以仍部署在同一 Fastify 进程，但 HostIntegration 延迟初始化，只有访问 `/api/v1/host/*` 时启动。
3. 第二阶段拆为独立 `host-runtime` 服务，由 Nginx 将 `/api/v1/host/*` 转发过去。
4. 插件会话加 TTL、最后访问时间、最大并发和清理任务。
5. 多实例部署前，需要 sticky session、共享会话存储或会话归属路由。

### 6.9 Optional Async Jobs 层

职责：

- 搜索索引；
- 缩略图或封面缓存；
- 内容审核；
- 统计聚合；
- 旧 HTML 导出或兼容旧入口；
- 大文件病毒扫描或安全扫描。

原则：

- 不阻塞 `.card` 发布成功；
- 不作为网页查看必需产物；
- 失败只影响对应派生能力，不把 `cards.status` 从 `ready` 打回不可查看；
- 每类任务有独立 job 类型、重试策略和后台可观测状态。

### 6.10 Admin / Governance 层

职责：

- 用户、内容、上传会话、设备会话、配额、限流、审核、对象清理；
- 查看上传失败原因、资源缺失、重复上传、对象存储异常；
- 支持后台手动重试可选异步任务。

性能要求：

- 后台内容列表必须分页；
- 搜索必须走索引；
- 不在后台首屏加载大 JSONB 或大 manifest；
- 删除内容必须异步或批量清理对象，并记录清理结果。

### 6.11 Observability 层

职责：

- 请求日志、requestId、用户 ID、上传会话 ID、cardId 串联；
- 指标：API 延迟、错误率、上传会话数、对象存储 Head/Put/Get 延迟、Host Runtime 会话数；
- 慢查询、队列积压、对象清理失败、私有文件读取失败；
- 告警：5xx、对象存储错误率、Redis/PostgreSQL 不可用、磁盘临时目录异常。

建议首批指标：

- `ccps_http_request_duration_ms`
- `ccps_upload_session_created_total`
- `ccps_upload_session_completed_total`
- `ccps_card_file_upload_bytes_total`
- `ccps_card_file_open_total`
- `ccps_storage_put_duration_ms`
- `ccps_storage_head_duration_ms`
- `ccps_host_runtime_sessions_active`
- `ccps_async_jobs_failed_total`

## 7. 目标上传热路径

### 7.1 官方本地上传器路径

```text
用户登录本地上传器
  -> 创建 upload session
  -> 本地读取并校验 .card
  -> 本地扫描资源引用
  -> 请求资源上传目标
  -> 资源直传对象存储
  -> 本地替换 .card 内资源链接
  -> 本地重新打包处理后的 .card
  -> 提交处理后的 .card
  -> 服务端校验 manifest 和 .card
  -> 服务端保存 .card 到 chips-card-files
  -> 写入 cards 记录 status=ready
  -> 返回社区卡片入口
```

服务端不做 HTML 转换，也不做卡片资源 URL 替换。

### 7.2 网页端上传路径

网页端可选择两种正式策略：

1. 浏览器本地处理模式
   - 浏览器端读取 `.card`，完成资源外置、链接替换和重新打包；
   - 对大文件体验、浏览器 ZIP Store 读取、内存占用要求较高。
2. 保守上传模式
   - 网页端只提交已经由官方工具处理好的 `.card`；
   - 不提供服务器端原始 `.card` 自动转换；
   - 第一阶段更稳，后续再补浏览器处理能力。

无论选择哪种，主链路都不恢复“网页上传原始 `.card` 后由服务器完整处理”。

### 7.3 服务端提交处理后 `.card`

提交接口应做以下校验：

- 文件扩展名与 MIME；
- ZIP 魔数；
- ZIP entry 路径安全；
- 文件数量、单文件大小、总展开大小；
- `.card/metadata.yaml`、`.card/structure.yaml`、`.card/cover.html` 存在；
- metadata `card_id` / `id`、`name`、`cover_ratio` 合法；
- content YAML 可解析；
- 外置资源 URL 与 upload session manifest 一致；
- 对象存储 Head 校验资源存在、大小、sha256；
- 用户拥有目标 room；
- 用户配额、频率、并发未超限。

校验通过后，`cards.status` 直接进入 `ready`，不创建 `card_pipeline_jobs`。

## 8. 目标查看热路径

```text
用户访问 /cards/:cardId
  -> Web 前台调用 GET /api/v1/cards/:cardId/open-view
  -> API 权限校验
  -> API 返回 cardFileUrl / cardFileEndpoint 与轻量信息
  -> Web 前台创建 CardViewer Web 插件会话
  -> launchParams.cardSource 传入 community-card-file 或 remote-card-file
  -> CardViewer 读取远程 .card
  -> CardViewer / Web Runtime 按正式卡片渲染链路展示
  -> 卡片内部资源按 URL 从资源服务器读取
```

性能目标：

- `open-view` 不读取 `cardMetadata`、`cardStructure`、`resourceManifest`；
- 公开卡片 `.card` 下载流量不经过社区主站；
- 私有卡片用短时签名 URL 或流式代理，避免裸公开 URL；
- 支持浏览器缓存、ETag、Range；
- CardViewer 负责下载进度、损坏文件错误态、权限错误态和重试。

## 9. 数据库与索引方案

### 9.1 cards 表

新增字段见 `02-接口与数据模型方案.md`，本方案补充性能要求：

- 列表 DTO 使用专门 columns；
- `open-view` 使用专门 columns；
- 搜索默认只查 `title` 与必要索引列；
- `cardMetadata`、`cardStructure`、`resourceManifest` 只在详情、后台诊断或离线任务读取；
- `cardFileSha256` 可用于 ETag、重复上传检测和缓存校验。

建议索引：

```text
cards(user_id, visibility, status, created_at desc)
cards(room_id, visibility, status, created_at desc)
cards(visibility, status, created_at desc)
cards(card_file_id)
cards(card_file_sha256)
cards(card_file_bucket, card_file_key)
```

如果 PostgreSQL 版本和扩展允许，搜索后续可引入正式全文索引；第一阶段不应在热路径上做无索引模糊大表扫描。

### 9.2 upload_sessions 表

建议索引：

```text
upload_sessions(user_id, status, created_at desc)
upload_sessions(expires_at)
upload_sessions(resource_prefix)
```

需要定期清理：

- 已过期会话；
- 未完成资源前缀；
- 失败但已写入的临时对象。

### 9.3 upload_session_resources 表

建议将 manifest 拆出一张资源表，避免每次校验都读写大 JSON：

```text
id
upload_session_id
relative_path
bucket
object_key
public_url
size_bytes
sha256
mime_type
status
created_at
updated_at
```

`cards.resourceManifest` 可保存发布完成后的快照，供详情和审计使用；上传过程中的资源校验应以资源表为准。

### 9.4 异步任务表

如果保留转换、索引、缩略图、审核等异步能力，建议统一为通用 job 表或按任务域拆表，不再把 `card_pipeline_jobs` 作为卡片发布的中心模型。

可选字段：

```text
id
type
subject_type
subject_id
status
attempt_count
max_attempts
payload
last_error
locked_by
locked_at
run_after
finished_at
created_at
updated_at
```

## 10. 对象存储与带宽策略

### 10.1 公开卡片

- `.card` 主文件可放在公开 bucket；
- `open-view` 返回 `cardFileUrl`；
- 浏览器直接从 `file.chipscard.space` 下载；
- 社区主站只承担权限判断、页面和轻量 API。

### 10.2 私有卡片

私有 `.card` 不应放出长期公开 URL。建议按阶段实现：

1. 第一阶段：`GET /api/v1/cards/:cardId/file` 鉴权后流式代理；
2. 第二阶段：API 鉴权后返回短时签名 URL；
3. 第三阶段：私有资源也使用短时签名或受控资源 gateway。

如果 `.card` 内部资源被替换为公开 URL，那么私有卡片仍可能通过资源 URL 暴露内容。因此私有卡片必须同步设计资源权限策略，不能只保护 `.card` 主文件。

### 10.3 CDN / Cache

公开 `.card`：

- `Cache-Control: public, max-age=31536000, immutable` 可用于内容哈希稳定路径；
- 若路径固定为 `{cardId}/card.card`，更新内容时必须更新 ETag 并使用 `no-cache` 或版本参数；
- `ETag` 使用 `cardFileSha256`。

API 打开信息：

- 私有和用户相关接口不做公共缓存；
- 公开 open-view 可短缓存，但必须考虑卡片删除、可见性切换、封禁等失效场景；
- 第一阶段建议 API `no-store` 或短 TTL，先保证权限正确。

## 11. API 性能优化清单

P0：

1. `discover/cards` 显式限制 columns，不读取 `cardMetadata` / `cardStructure` / `resourceManifest`。
2. `open-view` 改为返回 `cardFileUrl` / `cardFileEndpoint`，不再返回或依赖 `htmlUrl`。
3. 卡片文件读取接口支持流式、ETag、Range。
4. 上传提交接口保存 `.card` 时使用流式写入对象存储。
5. 上传资源直传对象存储，社区 API 不中转资源文件。
6. 增加上传会话 TTL、用户并发上限和文件大小限制。

P1：

1. 房间列表计数批量化，避免 N+1。
2. 管理后台内容列表只读摘要列。
3. HostIntegration 延迟初始化或拆服务。
4. Web 插件 session 加 TTL 和最大并发。
5. 对象存储 Head / Put / Get 增加耗时日志与错误码分类。
6. 加入请求级 requestId，并串联上传会话、cardId、storage key。

P2：

1. 公开 open-view 短 TTL 缓存；
2. 热门 `.card` 预连接和预取；
3. 异步搜索索引；
4. 对象删除批处理与失败重试；
5. 上传断点续传与分片合并；
6. 多实例 Host Runtime 会话治理。

## 12. 安全边界

### 12.1 上传安全

- 禁止 ZIP path traversal；
- 限制 ZIP entry 数量、总大小、单文件大小；
- 禁止写入系统绝对路径、`file://`、运行时 `blob:` 作为正式内部资源；
- 校验资源 URL 来源，默认只允许本次 upload session 签发的资源 URL；
- 对允许外部 URL 的卡片类型建立白名单和安全策略；
- 校验文件 sha256，防止客户端 manifest 与实际文件不一致。

### 12.2 读取安全

- 私有卡片无权访问时继续按 404 处理；
- 私有 `.card` 文件不能使用长期公开 URL；
- 私有资源不能因资源外置而裸露；
- CardViewer 远程 `.card` 解析必须在受控 Web 运行时中执行；
- cover.html 仍需要受控 iframe，不允许直接注入社区页面 DOM。

### 12.3 本地上传器安全

- 本地上传器不保存对象存储长期密钥；
- 本地上传器通过设备会话获取社区 token；
- 上传目标 URL 有过期时间、对象前缀限制和大小限制；
- 本地上传器退出或设备吊销后，refresh token 失效。

## 13. 部署架构建议

### 13.1 第一阶段部署

保持当前 Compose 形态，但调整职责：

- `server`：普通 API + 上传会话 + 文件读取 + 可延迟 HostRuntime；
- `worker`：不再处理主上传 pipeline，只处理可选异步任务；
- `web` / `admin`：保持独立前端；
- `postgres` / `redis` / `object storage`：保持；
- `nginx`：补充 `.card` 文件读取缓存、Range、下载头策略。

### 13.2 第二阶段部署

拆分服务域：

- `api-server`：内容、上传、认证、后台；
- `host-runtime-server`：Web 插件会话和插件资源；
- `async-worker`：搜索索引、封面缓存、审核、可选转换；
- `object-storage` / CDN：承担公开资源与 `.card` 下载。

这样普通 API 可以独立扩容，Host Runtime 的插件安装、会话内存和资源打开不影响上传与列表接口。

### 13.3 生产容量关注点

- `.card` 文件下载峰值由对象存储和 CDN 承担；
- API 主要压力来自 open-view、登录刷新、列表、上传会话；
- Redis 不能成为单点队列瓶颈，异步任务需要重试和死信治理；
- PostgreSQL 需要为列表、搜索、后台和计数建立索引；
- API 临时目录只用于必要短时文件，不保存长期上传输入。

## 14. CardViewer / Web Runtime 关键依赖

后端重构要与 CardViewer 能力同步，否则服务器返回 `.card` 后网页端仍无法查看。

需要补齐：

1. `community-card-file` 或完善 `remote-card-file` source；
2. CardViewer 不再把远程 `.card` 标记为 `unsupported`；
3. 浏览器端 `.card` 读取能力；
4. ZIP Store 读取能力；
5. YAML 解析能力；
6. 按 Host / SDK 正式链路渲染复合卡片；
7. cover.html 受控 iframe 展示；
8. 资源 URL 解析与 `resource.open`；
9. 下载进度、缓存、权限错误、损坏文件错误态。

如果当前技术选型不允许直接引入浏览器 ZIP 库，则需要先决定：

- 由 Host / SDK 提供正式 Web `.card` 读取模块；
- 或批准引入明确的 ZIP 读取依赖；
- 或由社区服务器提供受控 `.card` 分解读取 API。

不论选择哪条技术实现，对外产品链路仍应表现为“CardViewer 打开 `.card` 文件”，而不是“打开转换 HTML”。

## 15. 实施分期

### 阶段 A：数据与存储地基

- 新增 `chips-card-files`；
- 新增 card file 字段；
- 新增 upload session 表；
- 更新 S3 bucket 初始化与 URL 构造；
- DTO 增加 `cardFileUrl` / `cardFileEndpoint`。

验收：

- `cards` 记录能保存 `.card` 主文件定位；
- 删除卡片会清理 `.card` 主文件；
- 列表和 open-view 不读取大 JSONB。

### 阶段 B：上传会话主链路

- 创建 upload session；
- 资源 presign；
- 处理后 `.card` 提交；
- manifest 校验；
- 保存 `.card`；
- 直接 `ready`。

验收：

- 上传成功不创建 `card_pipeline_jobs`；
- 不写 `chips-card-html`；
- `htmlUrl = null` 时卡片仍 `ready`；
- API 返回 `cardFileUrl`。

### 阶段 C：文件读取与网页打开

- 新增 `/api/v1/cards/:cardId/file`；
- `open-view` 返回 card file 字段；
- `CardDetailPage` 使用 card file 字段判断可打开；
- `DocumentPluginRoutePage` 传 `community-card-file` source。

验收：

- 网页端 launchParams 带 `.card` 文件引用；
- 未生成 HTML 的卡片能进入 CardViewer；
- 权限失败、文件缺失有明确错误态。

### 阶段 D：CardViewer 远程 `.card`

- 远程 `.card` source 解析；
- ZIP / YAML / cover / content 读取；
- 复合卡片渲染；
- 下载进度与缓存；
- 资源打开。

验收：

- 公开 `.card` URL 可直接查看；
- 图片、音频、视频等外置资源可加载；
- 损坏 `.card` 不会导致空白页；
- local-file 查看不回归。

### 阶段 E：旧 pipeline 降级

- 主上传接口停止入队；
- `card_pipeline_jobs` 不再作为发布中心；
- HTML 转换作为可选异步任务或归档；
- 后台展示可选任务状态。

验收：

- 连续上传多张卡片无 pipeline job；
- `chips-card-html` 不再被主链路写入；
- `htmlUrl` 不参与打开判断。

### 阶段 F：性能与治理收口

- 上传限流、配额、幂等；
- 房间计数批量化；
- Host Runtime 延迟初始化或拆服务；
- requestId、指标、慢查询日志；
- 管理后台上传会话与对象清理视图。

验收：

- 压测 open-view、列表、上传会话、文件读取；
- 对象存储错误可定位；
- 多实例部署策略明确。

## 16. 验收清单

服务器：

- `POST /api/v1/upload-sessions` 可创建卡片上传会话；
- 资源 presign 不暴露长期密钥；
- 处理后 `.card` 提交后直接 `ready`；
- `GET /api/v1/cards/:cardId/open-view` 返回 `cardFileUrl` 或 `cardFileEndpoint`；
- `GET /api/v1/cards/:cardId/file` 支持权限、ETag、Range；
- 删除卡片清理 `.card` 主文件与外置资源；
- 列表、发现、搜索不读取大 JSONB；
- 上传失败有结构化错误码。

前台：

- `htmlUrl = null` 时仍可打开 ready 卡片；
- CardViewer 启动参数包含 `.card` 文件引用；
- 打开失败展示真实错误，不再显示“未处理完成”误导状态。

CardViewer：

- `community-card-file` / `remote-card-file` 不再是 unsupported；
- 远程 `.card` 能显示 cover 和内容；
- 资源点击走 `resource.open`；
- 下载进度、损坏文件、权限失败有明确 UI。

运维：

- API 不承担公开 `.card` 下载流量；
- Worker 不再是主上传必需组件；
- Host Runtime 可观测、可清理、可限流；
- 对象存储、Redis、PostgreSQL 异常有日志和指标；
- 部署文档更新到新 bucket、新接口和新缓存策略。

## 17. 后续文档同步点

实际实现落地后，需要同步：

1. `生态共用技术文档/协议与契约/09-社区平台API契约.md`
2. `生态共用技术文档/协议与契约/09-卡片信息与打开契约.md`
3. `Chips-CommunityPlatformServer/技术文档/05-数据模型与接口映射.md`
4. `Chips-CommunityPlatformServer/技术文档/07-启动与运行说明.md`
5. `Chips-CommunityPlatformServer/技术文档/08-社区Web插件宿主链路.md`
6. `Chips-CommunityPlatformServer/技术文档/09-生产域名与对象存储部署说明.md`
7. `Chips-CardViewer/README.md`
8. 官方本地上传器需求文档与技术文档
