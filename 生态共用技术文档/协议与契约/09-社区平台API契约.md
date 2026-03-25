# 薯片社区平台 HTTP API 契约

**文档编号**：协议与契约 / 09  
**文档版本**：v1.1  
**最后核对时间**：2026-03-25  
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

当前成功响应体只返回新的 `accessToken`，同时服务端会重新设置 refresh token Cookie。

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
- `CARD_PIPELINE_ERROR`
- `BOX_NOT_FOUND`
- `BOX_FORBIDDEN`
- `FILE_TYPE_INVALID`
- `FILE_TOO_LARGE`
- `FILE_CORRUPT`
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

- `POST /api/v1/upload/card`
- `POST /api/v1/upload/box`

### 5.5 卡片

- `GET /api/v1/cards/:cardId`
- `GET /api/v1/cards/:cardId/status`
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

```json
{
  "id": "uuid",
  "title": "卡片标题",
  "coverUrl": "https://...",
  "htmlUrl": "https://.../index.html",
  "status": "ready",
  "visibility": "public",
  "createdAt": "2026-03-25T00:00:00.000Z"
}
```

### 6.3 Card Detail

```json
{
  "id": "uuid",
  "cardFileId": "abc123def0",
  "userId": "uuid",
  "roomId": "uuid",
  "title": "卡片标题",
  "coverUrl": "https://...",
  "htmlUrl": "https://.../index.html",
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

## 7. 上传与查看行为

### 7.1 卡片上传

`POST /api/v1/upload/card` 当前返回：

```json
{
  "data": {
    "cardId": "uuid",
    "status": "pending"
  }
}
```

服务端后续会异步完成：

1. 资源上传 CDN
2. URL 替换
3. 重新打包 `.card`
4. 调用 Host 已安装的正式转换插件输出 HTML
5. 上传 HTML 目录到 CDN

### 7.2 卡片查看

当前平台查看卡片时，最终呈现的是转换插件导出的 HTML 页面本身，而不是社区平台额外包装的一层查看器 UI。

## 8. 兼容与范围说明

本文只描述当前社区服务器已经真实生效的 HTTP 契约，不扩展未实现能力。

当前不在本契约范围内的内容包括：

- 评论、点赞、关注
- 房间成员与 ACL
- 社区内 `.card` 回下载
- 箱子在线布局运行时
- 实时消息与通知
