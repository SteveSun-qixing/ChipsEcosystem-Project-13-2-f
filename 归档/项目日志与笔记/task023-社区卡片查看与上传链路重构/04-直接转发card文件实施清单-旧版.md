# 实施步骤与验收清单

## 1. 实施原则

- 不做临时版；
- 不把 HTML 转换作为主链路兜底；
- 不在本地上传器保存对象存储长期密钥；
- 不绕过社区服务器鉴权、配额、对象归属和数据库登记；
- 不引入未确认的新第三方库；
- 每个阶段都要有测试和文档同步。

## 2. 阶段一：服务器数据模型与存储

目标：让社区服务器能保存并返回 `.card` 主文件。

工作项：

1. 新增 `chips-card-files` bucket；
2. 更新 `Bucket` 常量、公开/私有 bucket 列表和初始化逻辑；
3. 新增 `cards.card_file_url`、`cards.card_file_bucket`、`cards.card_file_key`、`cards.card_file_sha256`、`cards.resource_manifest` 等字段；
4. 新增数据库 migration；
5. 更新 `CardService.toDTO`、`toSummaryDTO`、`toOpenViewDTO`；
6. 删除卡片时同时删除 `.card` 主文件和外置资源。

验收：

- 新上传卡片记录包含 `cardFileUrl`；
- 删除卡片会清理 `chips-card-files/{userId}/{cardId}/card.card`；
- 列表接口不读取大 JSONB；
- 单元测试覆盖 DTO。

## 3. 阶段二：上传会话与处理后 `.card` 提交

目标：替代旧 `/api/v1/upload/card -> pipeline -> htmlUrl` 主链路。

工作项：

1. 新增 `upload_sessions` 表；
2. 新增创建上传会话接口；
3. 新增资源上传目标签发接口；
4. 新增处理后 `.card` 提交接口；
5. 实现服务端 `.card` 结构校验；
6. 校验资源 manifest 与对象存储对象；
7. 保存处理后 `.card` 到 `chips-card-files`；
8. 创建或更新 `cards` 记录并标记 `ready`；
9. 明确旧 `/api/v1/upload/card` 的处理策略：归档、禁用或改为只接收处理后 `.card`。

验收：

- 提交处理后 `.card` 后不创建 `card_pipeline_jobs`；
- 不生成 `chips-card-html`；
- 不生成卡片封面 HTML；
- `GET /api/v1/cards/:cardId/open-view` 返回 `cardFileUrl`；
- 失败时返回结构化错误码；
- 测试覆盖成功、文件损坏、资源缺失、跨用户资源 URL、room 权限失败。

## 4. 阶段三：官方本地上传器能力

目标：本地上传器完成资源外置与处理后 `.card` 打包。

工作项：

1. 登录社区账号；
2. 创建上传会话；
3. 本地解包 `.card`；
4. 扫描资源引用；
5. 请求资源上传目标；
6. 直传资源；
7. 替换 content / cover 中的资源 URL；
8. 重新打包 `.card`；
9. 提交处理后 `.card`；
10. 展示上传状态与结果入口。

依赖能力：

- Host / SDK 卡片解包；
- Host / SDK 卡片打包；
- 资源引用替换工具；
- 本地文件 sha256；
- HTTP 上传进度。

验收：

- 本地上传一个包含图片资源的 `.card`；
- 资源直接进入 `chips-card-resources`；
- 处理后 `.card` 中图片引用变为资源 URL；
- 服务器收到的 `.card` 不含已外置的大体积资源；
- 社区页面可打开卡片。

## 5. 阶段四：社区网页查看改造

目标：社区网页不再依赖 `htmlUrl`。

工作项：

1. 更新 `CardOpenView` 类型，新增 `cardFileUrl`；
2. `CardDetailPage` 改为判断 `card.status === 'ready' && card.cardFileUrl`；
3. `DocumentPluginRoutePage` 支持传 `community-card-file` source；
4. 创建 CardViewer 会话时传 `.card` 文件引用；
5. 移除主链路对 `htmlUrl` 的依赖。

验收：

- `htmlUrl = null` 时卡片仍可打开；
- 前台 launchParams 中包含 `cardFileUrl`；
- 打开失败显示 CardViewer 错误态，不显示“未处理完成”误导状态。

## 6. 阶段五：CardViewer 远程 `.card` 渲染

目标：CardViewer 能直接消费远程 `.card`。

工作项：

1. 扩展 `CardViewerSource`，新增 `community-card-file` 或完善 `remote-card-file`；
2. `ViewerSourceProvider` 不再把远程卡片标记为 unsupported；
3. 新增远程卡片读取模块；
4. 支持 ZIP Store `.card` 读取；
5. 解析 metadata、structure、content 和 cover；
6. 通过正式基础卡片渲染链路展示；
7. 资源点击走 Web `resource.open`；
8. 加入下载进度、失败重试和缓存策略。

需要先确认：

- 是否允许引入浏览器端 ZIP 读取依赖；
- 或由 SDK / ComponentLibrary 提供正式 Web `.card` 读取模块；
- 或由社区服务器提供 `.card` 分解读取 API。

验收：

- 公开 `.card` URL 可在 CardViewer 中直接打开；
- cover 可显示；
- 多个基础卡片内容可渲染；
- 内部图片、音频、视频资源按 URL 加载；
- 资源点击可进入对应 Web 查看器；
- 损坏 `.card` 有明确错误态。

## 7. 阶段六：旧 pipeline 降级

目标：旧转换 pipeline 不再是主链路依赖。

工作项：

1. `card_pipeline_jobs` 不再由主上传接口创建；
2. `runCardPipeline` 迁移为按需转换任务或归档；
3. `htmlUrl` 降级为可空缓存字段；
4. `chips-card-html` 和 `chips-covers/cards/.../index.html` 不再由上传主链路写入；
5. 更新后台和运维文档。

验收：

- 上传 10 张卡片不会产生 pipeline job；
- 数据库中 `htmlUrl` 可为 null；
- 社区打开页不读 `htmlUrl`；
- 旧代码路径有测试证明不会被主链路调用。

## 8. 文档同步

实现落地后需要同步：

1. `生态共用技术文档/协议与契约/09-社区平台API契约.md`
2. `Chips-CommunityPlatformServer/技术文档/04-工作区上传页技术方案.md`
3. `Chips-CommunityPlatformServer/技术文档/05-数据模型与接口映射.md`
4. `Chips-CommunityPlatformServer/技术文档/09-生产域名与对象存储部署说明.md`
5. `Chips-CardViewer/README.md`
6. `Chips-SDK` / `Chips-Host` 相关卡片读取与打包说明

## 9. 最小回归测试范围

服务器：

- 上传会话创建；
- 资源 presign；
- 处理后 `.card` 提交；
- card open-view；
- card file 读取；
- 删除清理；
- 权限校验。

前台：

- `/cards/:cardId` 用 `cardFileUrl` 打开；
- `htmlUrl` 为空仍成功；
- pending/error 状态正确展示。

CardViewer：

- local-file 不回归；
- community-card-file 成功渲染；
- remote-card-file 错误态；
- cover 切换；
- resource.open。

端到端：

- 官方上传器上传真实 `.card`；
- 社区列表出现；
- 社区详情打开；
- 内部资源可查看；
- 删除后资源不可继续访问或被清理。
