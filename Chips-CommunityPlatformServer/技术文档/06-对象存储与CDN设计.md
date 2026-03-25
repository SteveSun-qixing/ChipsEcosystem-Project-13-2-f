# 对象存储与CDN设计

## 1. 文档范围

本文描述当前社区服务器对 MinIO / S3 兼容对象存储的接入方式，以及对象 URL 的公开组织方式。

对应实现：

- `packages/server/src/storage/buckets.ts`
- `packages/server/src/storage/init.ts`
- `packages/server/src/storage/s3.ts`

## 2. Bucket 规划

当前启动时统一初始化以下公开读 bucket：

- `chips-card-resources`
- `chips-card-html`
- `chips-avatars`
- `chips-covers`

## 3. 各 bucket 职责

### 3.1 `chips-card-resources`

保存卡片内原始资源文件的 CDN 化产物，例如：

- 图片
- 视频
- 音频
- 文档附件

### 3.2 `chips-card-html`

保存转换插件输出的目录态 HTML 产物，例如：

- `index.html`
- CSS / JS / 图片等附属文件
- 可选 `cover.html`

### 3.3 `chips-avatars`

保存用户头像。

### 3.4 `chips-covers`

保存房间封面等封面资源。

## 4. 启动初始化策略

`initStorageBuckets()` 会在服务启动时执行：

1. 逐个检查 bucket 是否存在
2. 若不存在，则创建 bucket
3. 为 bucket 设置公开读策略

当前 bucket policy 为匿名 `s3:GetObject` 公共读。

## 5. URL 生成规则

### 5.1 对外公开基址

`getPublicBucketBaseUrl(bucket)` 的优先级为：

1. 若配置 `S3_PUBLIC_URL`：`{S3_PUBLIC_URL}/{bucket}`
2. 否则：`{BASE_URL}/cdn/{bucket}`

### 5.2 公开对象 URL

最终对象 URL 由：

- `buildObjectUrl(bucket, key)`

生成。

## 6. key 组织规则

### 6.1 卡片资源

- `{userId}/{cardId}/{relativePath}`

### 6.2 卡片 HTML

- `{userId}/{cardId}/{relativePath}`

### 6.3 用户头像

- `{userId}/avatar.{ext}`

### 6.4 房间封面

- `rooms/{roomId}/cover.{ext}`

## 7. 上传接口能力

### 7.1 `uploadFile(...)`

用于把磁盘文件上传到对象存储，自动按扩展名推断 `Content-Type`。

### 7.2 `uploadBuffer(...)`

用于把内存中的 Buffer / string 上传到对象存储。

当前主要用于：

- 用户头像
- 房间封面

## 8. 删除与清理

### 8.1 `deleteObject(...)`

删除单个对象。

### 8.2 `deleteObjectsByPrefix(...)`

按前缀批量删除对象，当前主要用于：

- 删除卡片资源目录
- 删除卡片 HTML 目录

## 9. URL 反解析

`parseObjectUrl(url)` 当前支持把公开 URL 反解为：

- `bucket`
- `key`

它支持两种前缀：

1. `{BASE_URL}/cdn/`
2. `{S3_PUBLIC_URL}/`

## 10. Content-Type 推断

当前已显式映射的类型包括：

- 图片：jpg / png / gif / webp / svg
- 视频：mp4 / webm / mov
- 音频：mp3 / ogg / wav / flac / aac
- 文本：html / css / js / json / yaml / yml / txt / vtt / srt

未知扩展名回退为：

- `application/octet-stream`

## 11. 当前架构口径

当前对象存储与 CDN 设计的正式口径是：

1. 业务数据存数据库
2. 二进制对象存对象存储
3. 前台直接消费对象存储生成的公开 URL
4. 卡片 HTML 也是对象存储中的正式发布产物

平台不会把卡片 HTML 再复制回数据库或本地静态目录作为第二份正式产物。
