# 社区卡片查看与上传链路总体重构方案

## 1. 背景

当前社区服务器上传 `.card` 后，会把卡片文件交给服务端 pipeline。pipeline 负责资源上传、URL 替换、重新打包、HTML 转换、封面 HTML 生成和 HTML 产物上传。社区网页打开卡片时，前台读取 `htmlUrl`，再通过 Web 插件宿主打开 `com.chips.card-viewer`，CardViewer 最终 iframe 展示的是转换后的 HTML。

新的目标是：社区主链路不再把卡片转换为 HTML 或任何特定查看格式。上传和查看都围绕 `.card` 文件本身工作。

## 2. 目标原则

1. `.card` 是社区卡片发布态的唯一主文档。
2. 社区服务器保存处理后的 `.card`，并返回可按权限读取的 `cardFileUrl` 或 `cardFileEndpoint`。
3. 社区网页打开卡片时，把 `.card` 文件引用传给网页端 CardViewer。
4. CardViewer 直接读取 `.card`，解析 metadata、structure、content 和 cover，并按正式卡片渲染链路展示。
5. 上传阶段不生成 HTML、封面 HTML 或其他特定查看格式。
6. 服务端后续如果需要转换，只能作为独立按需能力，例如搜索索引、缩略图、离线缓存或兼容旧入口，不影响主查看链路。
7. 对象存储长期密钥只能留在服务器；本地上传器通过受限上传会话或预签名目标直传资源。
8. 私有卡片不能仅依赖隐藏列表，必须让 `.card` 文件读取入口也受权限控制。

## 3. 当前链路差距

### 3.1 上传链路差距

当前 `Chips-CommunityPlatformServer/packages/server/src/routes/upload.ts`：

- 接收 `.card` multipart；
- 写入服务端临时文件；
- 创建 `cards` 记录；
- 调用 `CardPipelineQueueService.enqueue(...)`。

当前 `CardPipelineQueueService`：

- 把原始 `.card` 上传到 `chips-card-pipeline-inputs`；
- 创建 `card_pipeline_jobs`；
- worker 下载 source.card 后运行 `runCardPipeline(...)`。

当前 `runCardPipeline(...)`：

- 解包；
- 处理富文本文件资源；
- 上传卡片资源；
- 替换 URL；
- 重新打包；
- 调用 Host 转换插件输出 HTML；
- 输出封面 HTML；
- 上传 HTML 和封面 HTML；
- 更新 `cards.htmlUrl` 与 `cards.coverUrl`。

这与新目标不一致。新目标下，主上传接口应接收已经处理好的 `.card`，保存该 `.card` 并登记 metadata，不再进入 HTML pipeline。

### 3.2 查看链路差距

当前 `Chips-CommunityPlatformServer/packages/web/src/pages/CardDetailPage.tsx`：

- 只有 `card.status === 'ready' && card.htmlUrl` 时才创建 `community-card` source；
- source 的 `documentUrl` 来自 `card.htmlUrl`。

当前 `Chips-CardViewer`：

- `community-card` 被解析为 `hosted-document`，用 iframe 打开 `documentUrl`；
- `remote-card-file` 已有类型，但在 `ViewerSourceProvider` 中被解析为 `unsupported`；
- 本地 `.card` 通过 `client.document.window.render({ filePath })` 渲染，不等于远程 URL 渲染。

这与新目标不一致。新目标下，社区前台应传 `remote-card-file` 或新的 `community-card-file` source，CardViewer 应能读取远程 `.card` 并渲染。

## 4. 目标上传链路

### 4.1 官方本地上传器

本地上传器负责：

1. 登录社区账号；
2. 读取本地 `.card`；
3. 解包并校验 `.card`；
4. 扫描卡片内部资源；
5. 通过社区服务器签发的上传目标，把资源直传资源服务器；
6. 把 `.card` 内部资源引用替换为资源服务器 URL；
7. 移除已经外置的大体积资源；
8. 重新打包处理后的 `.card`；
9. 把处理后的 `.card` 提交给社区服务器。

本地上传器不负责：

- HTML 转换；
- 封面 HTML 导出；
- 社区数据库登记；
- 资源权限最终判定；
- 公开入口生成。

### 4.2 社区服务器

社区服务器负责：

1. 鉴权；
2. 创建发布会话；
3. 签发资源上传目标；
4. 接收处理后的 `.card`；
5. 校验 `.card` 结构；
6. 校验 `.card` 内的资源 URL 是否属于本次发布会话或允许的外部资源策略；
7. 保存处理后的 `.card`；
8. 写入 `cards` 记录；
9. 返回社区卡片入口。

社区服务器在主链路中不做：

- 资源上传；
- URL 替换；
- HTML 转换；
- 封面 HTML 转换。

### 4.3 网页端上传

网页端上传可以有两种正式方向，建议第一版选择其一并冻结：

1. **浏览器本地处理模式**：网页端也在浏览器内完成资源外置、URL 替换和重新打包，再提交处理后的 `.card`。
2. **保守上传模式**：网页端只允许提交已经由官方工具处理过的 `.card`，不提供原始 `.card` 自动处理。

不建议继续保留“网页端原始 `.card` 上传后由服务器完整处理”的主链路，因为它会让服务器继续承担带宽和处理职责。

## 5. 目标查看链路

1. 用户访问 `/cards/:cardId`；
2. 社区前台调用 `GET /api/v1/cards/:cardId/open-view`；
3. 服务端按权限返回卡片打开信息，包括 `cardFileUrl` 或受控读取 endpoint；
4. 前台创建 `com.chips.card-viewer` Web 插件会话；
5. launchParams 中传入 `.card` 文件引用；
6. CardViewer 读取 `.card`；
7. CardViewer 解析 metadata、structure、content 和 cover；
8. CardViewer 按正式基础卡片渲染链路展示；
9. 卡片内部资源已经是 URL，直接从资源服务器读取；
10. 卡片内部资源打开仍走 `resource.open` / Web 插件宿主能力。

建议 CardViewer source：

```json
{
  "cardSource": {
    "kind": "community-card-file",
    "cardId": "uuid",
    "url": "https://www.chipscard.space/api/v1/cards/uuid/file",
    "title": "卡片标题",
    "createdAt": "2026-05-24T00:00:00.000Z",
    "coverUrl": "https://..."
  }
}
```

也可以复用现有 `remote-card-file`，但建议新增 `community-card-file`，因为社区卡片需要携带 `cardId`、canonicalUrl、权限上下文、封面和社区来源信息。

## 6. CardViewer / Web Runtime 能力要求

要让网页端直接查看 `.card`，需要补齐以下能力：

1. 远程 `.card` 下载或读取能力；
2. 浏览器端 ZIP Store `.card` 读取能力；
3. YAML metadata / structure / content 解析能力；
4. cover.html 安全承载能力；
5. 基础卡片插件 Web 渲染能力；
6. `resource.open` 在 Web 插件宿主中的正式路由；
7. 错误态、加载态、卡片损坏态和权限失败态；
8. 大卡片的下载进度与缓存策略。

如果当前技术选型中没有浏览器端 ZIP 读取库，不能随意新增第三方库。需要在实现前确认是：

- 在 SDK / ComponentLibrary 中提供正式 Web `.card` 读取模块；
- 或批准引入已有 ZIP 读取依赖；
- 或由社区服务器提供受控 `.card` 内容分解 API。

但不论选择哪种，查看链路对外仍应表现为“CardViewer 打开 `.card`”，而不是“打开转换后的 HTML”。

## 7. 箱子链路关系

本任务聚焦卡片 `.card`。

箱子 `.box` 可以后续按同一原则收口：社区保存 `.box` 主文件，网页端箱子查看器直接读取 `.box`，不预先转换为社区专用 HTML。当前箱子还有布局运行时导出能力差距，应另行设计。

## 8. 删除旧职责的目标边界

重构完成后，以下职责不应在主上传/查看链路中出现：

- `cards.htmlUrl` 作为打开卡片的必需字段；
- 上传后自动生成 `chips-card-html/{userId}/{cardId}/index.html`；
- 上传后自动生成 `chips-covers/cards/{userId}/{cardId}/index.html` 作为主封面入口；
- CardViewer iframe 打开转换 HTML 作为社区卡片主展示方式；
- `card_pipeline_jobs` 作为所有卡片上传的必经队列。

这些能力可以保留为独立按需任务，但不再是主链路依赖。
