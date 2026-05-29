# 接口与数据模型方案

## 1. 数据库模型

### 1.1 cards 表建议字段

建议新增字段：

```ts
cardFileUrl: text('card_file_url')
cardFileBucket: text('card_file_bucket')
cardFileKey: text('card_file_key')
cardFileSha256: text('card_file_sha256')
resourceManifest: jsonb('resource_manifest')
publishedByClient: text('published_by_client')
publishedAt: timestamp('published_at', { withTimezone: true })
```

字段说明：

- `cardFileUrl`：社区查看链路读取 `.card` 的 URL 或受控 endpoint URL；
- `cardFileBucket` / `cardFileKey`：服务端删除、校验、重签名或内部读取所需对象定位；
- `cardFileSha256`：处理后 `.card` 的完整性标识；
- `resourceManifest`：本次发布外置资源清单，记录相对路径、URL、sha256、size、mime；
- `publishedByClient`：例如 `web`、`official-uploader`、`api`；
- `publishedAt`：卡片发布完成时间。

建议保留但降级字段：

- `htmlUrl`：不再作为主查看入口，后续仅用于旧数据或按需转换缓存；
- `coverUrl`：可以继续用于列表封面，但来源应优先来自 `.card` cover 信息或外置封面资源，不再要求封面 HTML；
- `status`：保留 `pending / processing / ready / error`，但语义调整为“发布登记与文件可读状态”，不再等同 HTML pipeline 状态。

### 1.2 上传会话表

建议新增 `upload_sessions`：

```ts
uploadSessions = {
  id: uuid,
  userId: uuid,
  contentType: 'card' | 'box',
  status:
    | 'created'
    | 'uploading_resources'
    | 'submitting_document'
    | 'validating'
    | 'ready'
    | 'error'
    | 'cancelled'
    | 'expired',
  roomId: uuid | null,
  visibility: 'public' | 'private',
  resourcePrefix: text,
  documentBucket: text | null,
  documentKey: text | null,
  errorCode: text | null,
  errorMessage: text | null,
  clientName: text | null,
  clientVersion: text | null,
  expiresAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

上传会话用于本地上传器、网页端和未来 API 客户端统一发布。

## 2. 对象存储

### 2.1 Bucket 建议

当前已有：

- `chips-card-resources`
- `chips-card-html`
- `chips-card-pipeline-inputs`
- `chips-avatars`
- `chips-covers`

建议新增：

- `chips-card-files`

路径规则：

```text
chips-card-files/{userId}/{cardId}/card.card
chips-card-resources/{userId}/{cardId}/resources/{relativePath}
```

如果使用单物理 bucket，则仍按现有逻辑加逻辑 bucket 前缀。

### 2.2 公开与私有策略

公开卡片：

- `cardFileUrl` 可以是资源域名下的公开 URL；
- 资源 URL 可以公开直连；
- 社区页面权限仍控制列表和详情展示。

私有卡片：

- 不应使用公开裸 `cardFileUrl`；
- `cardFileUrl` 应为社区 API 受控读取 endpoint，例如 `/api/v1/cards/:cardId/file`；
- 服务端校验权限后返回文件流或短时重定向；
- 资源 URL 如果也要私有，需要独立资源鉴权方案。

第一版如果只支持公开卡片，也应在接口中明确 `private` 的读取边界，避免后续口径含糊。

## 3. API 方案

### 3.1 创建上传会话

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
  "client": {
    "name": "chips-official-uploader",
    "version": "0.1.0",
    "platform": "macos"
  }
}
```

响应：

```json
{
  "data": {
    "uploadId": "uuid",
    "resourcePrefix": "users/<userId>/uploads/<uploadId>/resources/",
    "expiresAt": "2026-05-24T10:00:00.000Z"
  }
}
```

### 3.2 签发资源上传目标

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
      "relativePath": "images/photo.png",
      "sizeBytes": 1024,
      "sha256": "...",
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
        "relativePath": "images/photo.png",
        "publicUrl": "https://file.chipscard.space/chips-card-resources/...",
        "uploadUrl": "https://...",
        "method": "PUT",
        "headers": {
          "content-type": "image/png"
        },
        "expiresAt": "2026-05-24T10:00:00.000Z"
      }
    ]
  }
}
```

### 3.3 提交处理后的卡片

```http
POST /api/v1/upload-sessions/:uploadId/card
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

字段：

- `file`：处理后的 `.card`；
- `manifest`：JSON 字符串。

manifest：

```json
{
  "processedCardSha256": "...",
  "originalCardFileId": "abc123def0",
  "processedCardFileId": "abc123def0",
  "resources": [
    {
      "relativePath": "images/photo.png",
      "publicUrl": "https://file.chipscard.space/chips-card-resources/...",
      "sizeBytes": 1024,
      "sha256": "...",
      "mimeType": "image/png"
    }
  ]
}
```

响应：

```json
{
  "data": {
    "cardId": "uuid",
    "status": "ready",
    "cardFileUrl": "https://file.chipscard.space/chips-card-files/<userId>/<cardId>/card.card"
  }
}
```

### 3.4 卡片打开接口

`GET /api/v1/cards/:cardId/open-view` 返回：

```json
{
  "data": {
    "id": "uuid",
    "title": "卡片标题",
    "coverUrl": "https://...",
    "coverRatio": "3:4",
    "cardFileUrl": "https://file.chipscard.space/chips-card-files/<userId>/<cardId>/card.card",
    "status": "ready",
    "visibility": "public",
    "createdAt": "2026-05-24T00:00:00.000Z",
    "updatedAt": "2026-05-24T00:00:00.000Z",
    "user": {}
  }
}
```

不再要求返回 `htmlUrl`。

### 3.5 卡片文件读取接口

对于需要鉴权或统一读取的场景：

```http
GET /api/v1/cards/:cardId/file
```

行为：

- 公开卡片可以返回 302 到对象存储公开 URL，或直接流式返回；
- 私有卡片必须鉴权；
- 响应 `Content-Type` 建议为 `application/vnd.chips.card+zip`；
- 响应应包含 `ETag` 或 `x-chips-card-sha256`。

## 4. 前端 DTO 调整

`CardSummary`、`CardDetail`、`CardOpenView` 建议新增：

```ts
cardFileUrl: string | null;
```

并逐步降级：

```ts
htmlUrl?: string | null;
```

新代码不应以 `htmlUrl` 判断卡片是否可打开，而应以：

```ts
card.status === 'ready' && Boolean(card.cardFileUrl)
```

## 5. CardViewer Source

建议新增：

```ts
type CommunityCardFileSource = {
  kind: 'community-card-file';
  cardId: string;
  url: string;
  title: string;
  createdAt?: string;
  canonicalUrl?: string;
  coverUrl?: string;
  coverRatio?: string;
};
```

解析结果：

```ts
type ResolvedViewerSource = {
  renderKind: 'remote-card-file';
  source: CommunityCardFileSource;
  title: string;
  cardFileUrl: string;
  cover?: ViewerCoverSource;
};
```

`ViewerStage` 对 `remote-card-file` 应调用新的远程卡片窗口组件，而不是显示 unsupported。

## 6. 服务端校验规则

提交处理后的 `.card` 时，服务端至少校验：

1. 文件扩展名；
2. ZIP 魔数；
3. ZIP 路径安全，禁止 path traversal；
4. `.card/metadata.yaml` 存在；
5. `.card/structure.yaml` 存在；
6. metadata `id` 合法；
7. metadata `name` 合法；
8. `cover_ratio` 合法时写入 `coverRatio`；
9. content YAML 引用的本地资源不存在或符合允许策略；
10. manifest 中声明的资源 URL 与本次会话一致；
11. 对象存储中对应资源存在；
12. sha256 与 size 匹配；
13. 用户拥有目标 room；
14. 用户配额未超限。

校验通过后，`cards.status` 直接进入 `ready`。
