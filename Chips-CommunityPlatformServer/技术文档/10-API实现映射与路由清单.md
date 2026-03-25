# API实现映射与路由清单

## 1. 文档范围

本文基于当前 `packages/server/src/routes/*.ts`、相关 schema 与 service 实现整理，是社区服务器项目内部的“实现映射文档”。

对外共享的稳定 HTTP 协议口径同时沉淀在：

- `生态共用技术文档/协议与契约/09-社区平台API契约.md`

## 2. 路由模块分布

| 路由文件 | 负责域 |
|---|---|
| `routes/health.ts` | 健康检查 |
| `routes/auth.ts` | 注册、登录、刷新、登出 |
| `routes/users.ts` | 当前用户资料、头像、密码、公开用户资料 |
| `routes/rooms.ts` | 房间创建、查询、更新、删除、封面、房间内容列表 |
| `routes/space.ts` | 用户空间聚合视图 |
| `routes/upload.ts` | 卡片 / 箱子上传 |
| `routes/cards.ts` | 卡片详情、状态、更新、删除、用户卡片列表 |
| `routes/boxes.ts` | 箱子详情、更新、删除、用户箱子列表 |
| `routes/discover.ts` | 发现页与搜索 |
| `routes/admin.ts` | 后台治理接口 |

## 3. 统一约定

### 3.1 统一前缀

- 前台 API：`/api/v1/*`
- 后台 API：`/admin/api/v1/*`

### 3.2 响应包裹

除 `GET /api/v1/health` 外，其余业务接口统一返回：

- 成功：`{ data: ... }` 或 `{ data: ..., pagination: ... }`
- 错误：`{ error: { code, message, details? } }`

### 3.3 校验方式

当前参数校验主要来自：

- `auth.schemas.ts`
- `content.schemas.ts`
- 路由内显式 `zod.parse(...)`

### 3.4 鉴权方式

- `authenticate`
- `optionalAuthenticate`
- `requireAdmin`

## 4. 系统接口

### 4.1 `GET /api/v1/health`

- 文件：`routes/health.ts`
- 鉴权：无
- 返回：`{ status, timestamp, version }`
- 说明：这是当前唯一不走统一 `data` 包裹的接口

## 5. 认证接口

### 5.1 `POST /api/v1/auth/register`

- 路由：`routes/auth.ts`
- 校验：`RegisterSchema`
- 服务：`UserService.create(...)`、`AuthService.generateTokenPair(...)`
- 行为：
  - 创建用户
  - 返回 `user + accessToken`
  - 写入 refresh token Cookie

### 5.2 `POST /api/v1/auth/login`

- 路由：`routes/auth.ts`
- 校验：`LoginSchema`
- 服务：`AuthService.isAccountLocked(...)`、`UserService.validatePassword(...)`
- 行为：
  - 错误密码累计失败次数
  - 成功后清空失败计数
  - 返回 `user + accessToken`
  - 写入 refresh token Cookie

### 5.3 `POST /api/v1/auth/refresh`

- 路由：`routes/auth.ts`
- 鉴权：无，依赖 refresh token
- refresh token 来源：
  - Cookie `chips_refresh_token`
  - 或请求体 `refreshToken`
- 返回：新的 `accessToken`
- 同时重新写入新的 refresh token Cookie

### 5.4 `POST /api/v1/auth/logout`

- 路由：`routes/auth.ts`
- 行为：
  - 若存在 refresh token，则吊销旧 token
  - 清除 refresh token Cookie
- 返回：`204`

## 6. 用户接口

### 6.1 `GET /api/v1/users/me`

- 鉴权：`authenticate`
- 服务：`UserService.findById(...)`
- 返回：当前用户私有资料

### 6.2 `PATCH /api/v1/users/me`

- 鉴权：`authenticate`
- 校验：`UpdateProfileSchema`
- 服务：`UserService.update(...)`
- 返回：更新后的私有资料

### 6.3 `PUT /api/v1/users/me/password`

- 鉴权：`authenticate`
- 校验：`ChangePasswordSchema`
- 服务：`UserService.changePassword(...)`
- 返回：`204`

### 6.4 `POST /api/v1/users/me/avatar`

- 鉴权：`authenticate`
- 上传：multipart，限制 5MB
- 允许类型：JPEG / PNG / WebP / GIF
- 存储：`Bucket.AVATARS`
- 返回：`{ avatarUrl }`

### 6.5 `GET /api/v1/users/:username`

- 鉴权：无
- 服务：`UserService.findByUsername(...)`
- 返回：公开资料
- 过滤：禁用用户返回 404

## 7. 空间与房间接口

### 7.1 `GET /api/v1/users/:username/space`

- 路由：`routes/space.ts`
- 鉴权：`optionalAuthenticate`
- 聚合内容：
  - 公开用户资料
  - 房间列表
  - 根目录卡片
  - 根目录箱子
- 计数口径：
  - 所有者：完整计数
  - 非所有者：只返回当前请求者可见内容的计数

### 7.2 `POST /api/v1/rooms`

- 鉴权：`authenticate`
- 校验：`CreateRoomSchema`
- 服务：`RoomService.create(...)`
- 返回：新房间 DTO（含计数）

### 7.3 `GET /api/v1/users/:username/rooms`

- 鉴权：`optionalAuthenticate`
- 服务：`RoomService.listByUser(...)`
- 返回：房间数组
- 计数口径：与当前请求者可见内容一致
- 无分页

### 7.4 `GET /api/v1/rooms/:roomId`

- 鉴权：`optionalAuthenticate`
- 服务：`RoomService.getAccessible(...)`
- 返回：单房间 DTO（含计数）
- 私有房间对非所有者返回 404

### 7.5 `PATCH /api/v1/rooms/:roomId`

- 鉴权：`authenticate`
- 校验：`UpdateRoomSchema`
- 服务：`RoomService.update(...)`
- 返回：更新后的房间 DTO

### 7.6 `DELETE /api/v1/rooms/:roomId`

- 鉴权：`authenticate`
- 服务：`RoomService.delete(...)`
- 返回：`204`
- 行为：先删房间内卡片 / 箱子，再删房间

### 7.7 `POST /api/v1/rooms/:roomId/cover`

- 鉴权：`authenticate`
- 上传：multipart，限制 5MB
- 允许类型：JPEG / PNG / WebP
- 存储：`Bucket.COVERS`
- 返回：`{ coverUrl }`

### 7.8 `GET /api/v1/rooms/:roomId/contents`

- 鉴权：`optionalAuthenticate`
- 校验：`PaginationSchema`
- 服务：
  - `RoomService.getAccessible(...)`
  - `CardService.listByRoom(...)`
  - `BoxService.listByRoom(...)`
- 返回结构：
  - `data.cards`
  - `data.boxes`
  - `pagination.cardsPagination`
  - `pagination.boxesPagination`
- 权限口径：
  - 房间所有者可看到私有卡片 / 私有箱子
  - 非所有者只看到房间内公开内容

## 8. 上传接口

### 8.1 `POST /api/v1/upload/card`

- 鉴权：`authenticate`
- 上传：multipart
- 允许扩展名：`.card`
- 校验：`UploadCardSchema`
- 服务：`CardService.create(...)` + `runCardPipeline(...)`
- 返回：`202` + `{ cardId, status: 'pending' }`

### 8.2 `POST /api/v1/upload/box`

- 鉴权：`authenticate`
- 上传：multipart
- 允许扩展名：`.box`
- 校验：`UploadBoxSchema`
- 服务：`BoxService.create(...)`
- 返回：`201` + `{ boxId, title }`

## 9. 卡片接口

### 9.1 `GET /api/v1/cards/:cardId`

- 鉴权：`optionalAuthenticate`
- 服务：`CardService.getAccessible(...)`
- 返回：卡片详情 + 所有者公开资料
- 说明：详情接口当前不额外强制 `status = ready`

### 9.2 `GET /api/v1/cards/:cardId/status`

- 鉴权：`authenticate`
- 服务：`CardService.findById(...)`
- 只允许卡片所有者查询
- 返回：`cardId / status / errorMessage / htmlUrl / updatedAt`

### 9.3 `PATCH /api/v1/cards/:cardId`

- 鉴权：`authenticate`
- 校验：`UpdateCardSchema`
- 可修改：`roomId`、`visibility`
- 若指定新 `roomId`，会校验该房间归当前用户所有

### 9.4 `DELETE /api/v1/cards/:cardId`

- 鉴权：`authenticate`
- 服务：`CardService.delete(...)`
- 删除内容：
  - `Bucket.CARD_RESOURCES`
  - `Bucket.CARD_HTML`
  - 数据库记录

### 9.5 `GET /api/v1/users/me/cards`

- 鉴权：`authenticate`
- 校验：`PaginationSchema`
- 返回：当前用户全部卡片分页列表

### 9.6 `GET /api/v1/users/:username/cards`

- 鉴权：`optionalAuthenticate`
- 校验：`PaginationSchema`
- 返回：目标用户卡片分页列表
- 过滤：非所有者只能看到 `public` 卡片

## 10. 箱子接口

### 10.1 `GET /api/v1/boxes/:boxId`

- 鉴权：`optionalAuthenticate`
- 服务：`BoxService.getAccessible(...)`
- 增强：`BoxService.enrichCardRefs(...)`
- 返回：箱子详情 + 箱内卡片引用映射 + 所有者公开资料

### 10.2 `PATCH /api/v1/boxes/:boxId`

- 鉴权：`authenticate`
- 校验：`UpdateBoxSchema`
- 可修改：`roomId`、`visibility`

### 10.3 `DELETE /api/v1/boxes/:boxId`

- 鉴权：`authenticate`
- 服务：`BoxService.delete(...)`
- 返回：`204`

### 10.4 `GET /api/v1/users/me/boxes`

- 鉴权：`authenticate`
- 校验：`PaginationSchema`
- 返回：当前用户箱子分页列表

### 10.5 `GET /api/v1/users/:username/boxes`

- 鉴权：`optionalAuthenticate`
- 校验：`PaginationSchema`
- 返回：目标用户箱子分页列表
- 过滤：非所有者只能看到 `public` 箱子

## 11. 发现与搜索接口

### 11.1 `GET /api/v1/discover/cards`

- 鉴权：无
- 校验：`PaginationSchema`
- 过滤：`public + ready`
- 排序：按创建时间倒序

### 11.2 `GET /api/v1/discover/boxes`

- 鉴权：无
- 校验：`PaginationSchema`
- 过滤：`public`
- 排序：按创建时间倒序

### 11.3 `GET /api/v1/search`

- 鉴权：无
- 校验：`SearchSchema`
- `type` 支持：`card,box,user`
- 返回：`data.cards?`、`data.boxes?`、`data.users?`
- 当前分页返回仅包含：`page`、`pageSize`
- 不返回全量总数

## 12. 后台接口

后台全部通过 `requireAdmin` 保护。

### 12.1 `GET /admin/api/v1/stats`

- 返回：
  - 用户总数
  - 卡片总数
  - 箱子总数
  - 存储总量
  - 今日新增统计

### 12.2 `GET /admin/api/v1/users`

- 查询参数：`page`、`pageSize`、`q`
- 返回：用户分页列表
- 当前额外计算每个用户的内容占用空间

### 12.3 `PATCH /admin/api/v1/users/:userId`

- 请求体：`{ isActive: boolean }`
- 返回：更新后的 `{ id, isActive }`

### 12.4 `GET /admin/api/v1/content`

- 查询参数：`page`、`pageSize`、`type`、`q`
- `type` 支持：`card | box`
- 返回：内容分页列表

### 12.5 `DELETE /admin/api/v1/content/:type/:id`

- `type` 支持：`card | box`
- 删除卡片时同时清理 CDN 资源
- 删除箱子时只删除数据库记录

## 13. 关键实现差异与注意事项

### 13.1 计数不再是“总量固定值”

房间 `cardCount` / `boxCount` 现在依赖当前请求者身份：

- 所有者看到完整值
- 非所有者只看到可见内容数量

### 13.2 卡片详情与卡片发现页的状态过滤不同

- 详情接口允许读取公开但未 `ready` 的卡片元数据
- 发现页与房间公开内容列表只返回 `ready` 卡片

### 13.3 健康检查接口不走统一包裹

这是当前实现中的例外，需要客户端单独处理。
