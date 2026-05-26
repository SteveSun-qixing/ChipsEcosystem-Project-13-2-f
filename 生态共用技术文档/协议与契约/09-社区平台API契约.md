# 薯片社区平台 HTTP API 契约

**文档编号**：协议与契约 / 09
**文档版本**：v1.2
**最后核对时间**：2026-05-24
**适用范围**：所有需要与薯片社区平台服务器交互的客户端、工具与生态内其他系统。

## 1. 基础约定

### 1.1 基础路径

- 前台 API 前缀：`/api/v1`
- 后台 API 前缀：`/admin/api/v1`

### 1.2 数据格式

- 普通请求 / 响应：JSON
- 文件上传：`multipart/form-data`
- 字符集：UTF-8
- 时间格式：ISO 8601
- 主键 ID：UUID v4

### 1.3 统一响应结构

除 `GET /api/v1/health` 外，业务接口统一使用：

**成功：**

```json
{
  "data": {}
}
```

或：

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**错误：**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable message",
    "details": {}
  }
}
```

### 1.4 健康检查例外

`GET /api/v1/health` 当前直接返回：

```json
{
  "status": "ok",
  "timestamp": "2026-03-25T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 2. 认证契约

### 2.1 Access Token

受保护接口使用：

```http
Authorization: Bearer <access_token>
```

### 2.2 Refresh Token

当前第一方实现默认使用：

- Cookie 名称：`chips_refresh_token`
- HttpOnly
- path：`/api/v1/auth`
- `Secure` 属性跟随公共访问基地址协议：
  - `BASE_URL` 为 `https://...` 时启用 `Secure`
  - `BASE_URL` 为 `http://...` 时不启用 `Secure`

### 2.3 登录 / 注册响应

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

当前都会：

1. 在响应体中返回 `accessToken`
2. 在 Cookie 中写入 refresh token
3. 不在 JSON 体中返回 refresh token 明文

### 2.4 刷新接口

`POST /api/v1/auth/refresh` 当前接受：

1. Cookie 中的 refresh token
2. 或请求体中的 `refreshToken`

当前返回口径：

- 若存在可恢复会话：返回 `200`，响应体只包含新的 `accessToken`，同时服务端会重新设置 refresh token Cookie；
- 若当前没有可恢复会话（例如未携带 refresh token、refresh token 已失效、已吊销或用户已不可用）：返回 `204 No Content`，表示“当前没有可恢复登录态”，不再把这类情况视为接口错误。

## 3. 权限总则

### 3.1 公开 / 私有

当前社区服务器的内容权限只分两类：

- `public`
- `private`

### 3.2 不可见资源的返回口径

以下资源对无权访问者通常按 404 处理，不暴露存在性：

- 私有房间
- 私有卡片
- 私有箱子

### 3.3 房间与房间内内容的关系

房间公开不代表房间内所有内容都公开。

正式契约：

- 房间本身可公开
- 但房间中的卡片 / 箱子仍以各自 `visibility` 为准
- 非所有者访问公开房间时，只能看到其中公开内容

### 3.4 房间计数口径

房间 DTO 中的：

- `cardCount`
- `boxCount`

表示“当前请求者可见内容数量”，而不是绝对原始总量。

## 4. 错误码

当前服务端已经实现的核心错误码包括：

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_USER_EXISTS`
- `AUTH_ACCOUNT_LOCKED`
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_INSUFFICIENT_PERMISSION`
- `USER_NOT_FOUND`
- `USER_ACCOUNT_DISABLED`
- `ROOM_NOT_FOUND`
- `ROOM_FORBIDDEN`
- `CARD_NOT_FOUND`
- `CARD_FORBIDDEN`
- `CARD_RENDER_ERROR`
- `CARD_RENDER_NOT_READY`
- `BOX_NOT_FOUND`
- `BOX_FORBIDDEN`
- `FILE_TYPE_INVALID`
- `FILE_TOO_LARGE`
- `FILE_CORRUPT`
- `UPLOAD_SESSION_NOT_FOUND`
- `UPLOAD_SESSION_EXPIRED`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`

## 5. 核心接口清单

### 5.1 认证

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### 5.2 用户

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `PUT /api/v1/users/me/password`
- `POST /api/v1/users/me/avatar`
- `GET /api/v1/users/:username`

### 5.3 空间与房间

- `GET /api/v1/users/:username/space`
- `POST /api/v1/rooms`
- `GET /api/v1/users/:username/rooms`
- `GET /api/v1/rooms/:roomId`
- `PATCH /api/v1/rooms/:roomId`
- `DELETE /api/v1/rooms/:roomId`
- `POST /api/v1/rooms/:roomId/cover`
- `GET /api/v1/rooms/:roomId/contents`

### 5.4 上传

- `POST /api/v1/upload-sessions`
- `POST /api/v1/upload-sessions/:uploadId/resources/presign`
- `POST /api/v1/upload-sessions/:uploadId/card`
- `POST /api/v1/upload/card`
- `POST /api/v1/upload/box`

### 5.5 卡片

- `GET /api/v1/cards/:cardId`
- `GET /api/v1/cards/:cardId/open-view`
- `GET /api/v1/cards/:cardId/status`
- `GET /api/v1/cards/:cardId/render-status`
- `GET /api/v1/cards/:cardId/view`
- `GET /api/v1/cards/:cardId/cover`
- `GET /api/v1/cards/:cardId/render-cache/:cacheVersion/*`
- `GET /api/v1/cards/:cardId/cover-cache/:cacheVersion/*`
- `PATCH /api/v1/cards/:cardId`
- `DELETE /api/v1/cards/:cardId`
- `GET /api/v1/users/me/cards`
- `GET /api/v1/users/:username/cards`

### 5.6 箱子

- `GET /api/v1/boxes/:boxId`
- `PATCH /api/v1/boxes/:boxId`
- `DELETE /api/v1/boxes/:boxId`
- `GET /api/v1/users/me/boxes`
- `GET /api/v1/users/:username/boxes`

### 5.7 发现与搜索

- `GET /api/v1/discover/cards`
- `GET /api/v1/discover/boxes`
- `GET /api/v1/search`

### 5.8 后台

- `GET /admin/api/v1/stats`
- `GET /admin/api/v1/users`
- `PATCH /admin/api/v1/users/:userId`
- `GET /admin/api/v1/content`
- `DELETE /admin/api/v1/content/:type/:id`

## 6. 核心资源 DTO 口径

### 6.1 Room

```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "房间名",
  "slug": "room-slug",
  "description": null,
  "coverUrl": null,
  "visibility": "public",
  "cardCount": 3,
  "boxCount": 1,
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z"
}
```

### 6.2 Card Summary

卡片列表、房间内容与发现/搜索中的卡片项使用 summary DTO。`coverRatio` 来自卡片表普通列，列表热路径不读取 `cardMetadata` 或 `cardStructure` JSONB。

```json
{
  "id": "uuid",
  "title": "卡片标题",
  "coverUrl": "/api/v1/cards/uuid/cover",
  "coverRatio": "3:4",
  "htmlUrl": "https://.../index.html",
  "status": "ready",
  "visibility": "public",
  "createdAt": "2026-03-25T00:00:00.000Z"
}
```

说明：

- `status = ready` 表示源 `.card` 已保存可用，不表示查看缓存已经生成；
- `coverUrl` 在卡片场景中是独立封面入口，通常为 `/api/v1/cards/:cardId/cover`；
- `htmlUrl` 为历史兼容字段，不作为社区前台正式打开入口。

### 6.3 Card Detail

```json
{
  "id": "uuid",
  "cardFileId": "abc123def0",
  "userId": "uuid",
  "roomId": "uuid",
  "title": "卡片标题",
  "coverUrl": "/api/v1/cards/uuid/cover",
  "htmlUrl": "https://.../index.html",
  "sourceCardSha256": "sha256",
  "viewUrl": "/api/v1/cards/uuid/view",
  "renderStatusUrl": "/api/v1/cards/uuid/render-status",
  "status": "ready",
  "visibility": "public",
  "fileSizeBytes": 1024,
  "cardMetadata": {},
  "cardStructure": {},
  "user": {
    "username": "alice",
    "displayName": "Alice",
    "bio": null,
    "avatarUrl": null,
    "createdAt": "2026-03-25T00:00:00.000Z"
  },
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z"
}
```

### 6.4 Box Detail

```json
{
  "id": "uuid",
  "boxFileId": "abc123def0",
  "userId": "uuid",
  "roomId": null,
  "title": "箱子标题",
  "coverUrl": null,
  "layoutPlugin": "chips-official.grid-layout",
  "visibility": "public",
  "fileSizeBytes": 2048,
  "metadata": {},
  "cards": [],
  "user": {
    "username": "alice",
    "displayName": "Alice",
    "bio": null,
    "avatarUrl": null,
    "createdAt": "2026-03-25T00:00:00.000Z"
  },
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z"
}
```

### 6.4.1 Box Summary

箱子列表、房间内容与发现/搜索中的箱子项使用 summary DTO。`coverRatio` 来自箱子表普通列，列表热路径不读取 `metadata` 或 `structure` JSONB。

```json
{
  "id": "uuid",
  "title": "箱子标题",
  "coverUrl": "https://...",
  "coverRatio": "3:4",
  "documentUrl": "https://...",
  "layoutPlugin": "chips-official.grid-layout",
  "visibility": "public",
  "createdAt": "2026-03-25T00:00:00.000Z"
}
```

### 6.5 Card Open View

`GET /api/v1/cards/:cardId/open-view` 用于社区前台卡片打开页的轻量读取。访问权限与 `GET /api/v1/cards/:cardId` 一致，私有卡片对非所有者仍按 404 处理。

该接口只读取打开页所需列；`coverRatio` 来自卡片表普通列，不从 `cardMetadata` JSONB 取值。接口不返回 `cardMetadata`、`cardStructure`、`fileSizeBytes` 等详情字段。

```json
{
  "id": "uuid",
  "title": "卡片标题",
  "coverUrl": "/api/v1/cards/uuid/cover",
  "coverRatio": "3:4",
  "htmlUrl": "https://.../index.html",
  "viewUrl": "/api/v1/cards/uuid/view",
  "renderStatusUrl": "/api/v1/cards/uuid/render-status",
  "viewState": "cache_ready",
  "renderCache": {
    "status": "ready",
    "generatedAt": "2026-03-25T00:00:00.000Z",
    "lastAccessedAt": "2026-03-25T00:00:00.000Z",
    "expiresAt": "2026-04-24T00:00:00.000Z"
  },
  "status": "ready",
  "visibility": "public",
  "user": {
    "username": "alice",
    "displayName": "Alice",
    "bio": null,
    "avatarUrl": null,
    "createdAt": "2026-03-25T00:00:00.000Z"
  },
  "createdAt": "2026-03-25T00:00:00.000Z",
  "updatedAt": "2026-03-25T00:00:00.000Z"
}
```

`viewState` 当前取值：

- `cache_ready`：当前查看缓存可用；
- `rendering`：源 `.card` 已保存，查看缓存正在生成或等待生成；
- `render_error`：最新查看缓存任务失败；
- `pending` / `processing` / `ready` / `error`：保留卡片源文件状态透传。

`open-view` 不返回完整 `cardMetadata`、`cardStructure` 或资源 manifest。

## 7. 上传与查看行为

### 7.1 官方上传会话

官方本地上传器和其他受信客户端使用上传会话发布卡片。资源直传对象存储，社区 API 只接收处理后的 `.card` 源文件。

#### 7.1.1 创建上传会话

```http
POST /api/v1/upload-sessions
Authorization: Bearer <access_token>
Content-Type: application/json
```

请求：

```json
{
  "contentType": "card",
  "fileName": "demo.card",
  "roomId": null,
  "visibility": "public",
  "idempotencyKey": "client-generated-key",
  "client": {
    "name": "Chips Community Uploader Plugin",
    "version": "0.1.0",
    "platform": "darwin"
  }
}
```

响应：

```json
{
  "data": {
    "uploadId": "uuid",
    "resourcePrefix": "users/user-id/uploads/upload-id/resources",
    "expiresAt": "2026-05-24T00:00:00.000Z"
  }
}
```

#### 7.1.2 申请资源直传地址

```http
POST /api/v1/upload-sessions/:uploadId/resources/presign
Authorization: Bearer <access_token>
Content-Type: application/json
```

请求：

```json
{
  "resources": [
    {
      "relativePath": "hero.png",
      "sizeBytes": 2048,
      "sha256": "sha256",
      "mimeType": "image/png"
    }
  ]
}
```

响应：

```json
{
  "data": {
    "resources": [
      {
        "relativePath": "hero.png",
        "publicUrl": "https://file.example/chips-card-resources/users/user-id/uploads/upload-id/resources/hero.png",
        "uploadUrl": "https://s3.example/...",
        "method": "PUT",
        "headers": {
          "content-type": "image/png",
          "x-amz-meta-chips-sha256": "sha256",
          "x-amz-meta-chips-upload-session": "uuid"
        },
        "expiresAt": "2026-05-24T00:00:00.000Z"
      }
    ]
  }
}
```

客户端必须用响应中的 `method`、`uploadUrl` 和 `headers` 原样 PUT 资源。服务端提交 `.card` 时会 Head 对象并校验大小与元数据摘要。

#### 7.1.3 提交处理后的 `.card`

```http
POST /api/v1/upload-sessions/:uploadId/card
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

表单字段：

- `file`：处理后的 `.card`；
- `manifest`：客户端发布 manifest JSON。

响应：

```json
{
  "data": {
    "cardId": "uuid",
    "status": "ready",
    "renderStatus": "queued",
    "renderStatusUrl": "/api/v1/cards/uuid/render-status",
    "communityUrl": "https://www.chipscard.space/cards/uuid"
  }
}
```

提交时服务端会校验：

- 上传会话归属与过期状态；
- 已直传资源存在、大小一致、元数据摘要一致；
- 提交的 `.card` 不再包含本会话外置资源文件；
- 提交的 `.card` 的 metadata、structure、content 或 cover 中引用了本会话每个资源的 `publicUrl`；
- `.card` 结构符合卡片文件安全要求。

### 7.2 网页端兼容上传

`POST /api/v1/upload/card` 仍可直接上传 `.card`，用于网页端或调试场景。该接口保存 `.card` 源文件并入队查看缓存与封面缓存任务，不等待渲染完成。

响应：

```json
{
  "data": {
    "cardId": "uuid",
    "status": "ready",
    "renderStatus": "queued",
    "renderStatusUrl": "/api/v1/cards/uuid/render-status"
  }
}
```

### 7.3 卡片查看缓存

`.card` 是永久源文件，服务器渲染结果是派生缓存。当前有两个渲染 profile：

- `community-web`：完整卡片查看缓存；
- `community-cover`：卡片封面缓存，包含 `.card/cover.html` 与 `.card/cardcover/` 所需资源。

缓存生命周期：

- 缓存生成后 `expiresAt = generatedAt + 30 days`；
- `GET /api/v1/cards/:cardId/view` 或 `GET /api/v1/cards/:cardId/cover` 命中缓存时，会更新 `lastAccessedAt` 并把 `expiresAt` 续期到最后一次访问后 30 天；
- Worker 清理 `expiresAt < now` 的 ready 缓存，只删除缓存对象，不删除源 `.card` 和资源服务器正式资源。

#### 7.3.1 查看入口

```http
GET /api/v1/cards/:cardId/view
```

行为：

- 缓存命中：权限校验通过后续期缓存，并 `302` 到缓存入口；
- 缓存缺失：去重创建 `community-web` 渲染任务，返回 `202`；
- 私有卡片无权限：按 404 处理。

`202` 响应：

```json
{
  "data": {
    "cardId": "uuid",
    "viewState": "rendering",
    "renderStatusUrl": "/api/v1/cards/uuid/render-status",
    "retryAfterSeconds": 3
  }
}
```

#### 7.3.2 封面入口

```http
GET /api/v1/cards/:cardId/cover
```

行为：

- 封面缓存命中：权限校验通过后续期缓存，并 `302` 到封面缓存入口；
- 封面缓存缺失：去重创建 `community-cover` 渲染任务，返回 `202 text/html` 的准备中封面，便于列表 iframe 嵌入。

#### 7.3.3 渲染状态

```http
GET /api/v1/cards/:cardId/render-status
```

响应：

```json
{
  "data": {
    "cardId": "uuid",
    "status": "queued",
    "viewState": "rendering",
    "attemptCount": 0,
    "updatedAt": "2026-05-24T00:00:00.000Z",
    "viewUrl": "/api/v1/cards/uuid/view",
    "error": null
  }
}
```

### 7.4 旧上传转换链路说明

旧 `card_pipeline_jobs` / `chips-card-html` 链路已从正式源码归档，并通过迁移删除旧队列表。`htmlUrl` 字段保留为历史字段或缓存入口记录，社区前台正式打开入口是 `viewUrl`；新链路使用 `card_render_jobs`、`card_render_caches`、`chips-card-files`、`chips-card-render-cache*` 与 `chips-card-cover-cache*`。

### 7.5 模块上传器能力

官方无界面上传器模块能力：

```text
capability: community.card.publish
method: publish
mode: job
```

模块职责是在用户设备上处理 `.card` 内部资源外置、链接替换、重新打包和提交。它通过 Host 正式 `card.unpack`、`card.pack`、`file.*` 能力访问本地文件，通过社区上传会话 API 发布内容，不直接持有对象存储长期密钥。

## 8. 兼容与范围说明

本文只描述当前社区服务器已经真实生效的 HTTP 契约，不扩展未实现能力。

当前不在本契约范围内的内容包括：

- 评论、点赞、关注
- 房间成员与 ACL
- 社区内 `.card` 回下载
- 箱子在线布局运行时
- 实时消息与通知
