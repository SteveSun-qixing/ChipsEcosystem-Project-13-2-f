# Host集成与插件管理

## 1. 文档范围

本文描述社区服务器如何把 Host 作为唯一运行时承载接入服务端处理链路，覆盖：

- `packages/server/src/services/host-integration.ts`
- `packages/server/src/pipeline/card-pipeline.ts`
- `packages/server/src/config/env.ts`

## 2. 设计定位

社区服务器当前不会自己实现：

- `.card` 正式打包器
- 文件转换模块运行时
- 主题应用运行时
- 模块 job 轮询协议

这些能力统一通过 `HostApplication` 暴露的正式内核服务获得。

当前服务端把 Host 当作“嵌入式运行时宿主”，只负责：

1. 初始化 Host 工作区
2. 安装插件
3. 调用 Host 内核服务
4. 读取转换结果

## 3. Host 工作区策略

### 3.1 工作区目录

服务端专用 Host 工作区固定为：

- `.chips-server-host`

### 3.2 初始化策略

`hostIntegration.init()` 当前会：

1. 删除旧工作区
2. 重新创建空目录
3. 创建 `HostApplication({ workspacePath, builtInPlugins: [] })`
4. 调用 `host.start()`
5. 如果首次启动失败，清空工作区后重试一次

这保证了：

- 不复用旧插件状态
- 不依赖开发者本机已有的 Host 用户工作区
- 服务端每次启动时都以干净环境装载插件

## 4. 内核调用身份

当前 Host 集成层固定使用如下调用者身份：

- `id = community-platform-server`
- `type = app`
- `permissions = ['plugin.manage', 'theme.read', 'theme.write', 'module.invoke', 'module.read', 'card.write']`

所有 Host 能力调用都会带上新的 `requestId`。

## 5. 插件来源解析

### 5.1 默认来源

若环境变量未覆盖，当前默认插件源为：

- 卡片插件
  - `Chips-BaseCardPlugin/richtext-BCP/manifest.yaml`
  - `Chips-BaseCardPlugin/image-BCP/manifest.yaml`
- 主题插件
  - `ThemePack/Chips-default/manifest.yaml`
- 模块插件
  - `Chips-ModulePlugin/Chips-CardtoHTML-Plugin`
  - `Chips-ModulePlugin/Chips-FileConversion-Plugin`

### 5.2 环境变量覆盖

支持的动态配置项：

- `HOST_CARD_PLUGIN_PATHS`
- `HOST_THEME_PLUGIN_PATHS`
- `HOST_MODULE_PLUGIN_PATHS`
- `HOST_ACTIVE_THEME_ID`

路径配置支持：

- 绝对路径
- 相对生态根目录路径
- 逗号分隔或换行分隔的多值列表

### 5.3 `.cpk` 优先策略

模块插件默认会优先查找插件目录下的 `dist/*.cpk`：

- 若存在 `.cpk`，优先安装 `.cpk`
- 否则退回安装 `manifest.yaml`

这让服务端可以随部署形态切换“装源码 manifest”或“装打包产物”。

## 6. 生态根目录定位

`resolveEcosystemRoot()` 会从当前 `cwd` 逐级向上查找：

- `ThemePack/Chips-default/manifest.yaml`

找到后将该目录视为生态工作区根目录。

因此，社区服务器当前默认假设自己运行在完整生态工作区之中，而不是一个被裁剪到只剩本仓库的目录。

## 7. 插件安装顺序

当前初始化时按以下顺序安装并启用：

1. 卡片插件
2. 模块插件
3. 主题插件
4. 应用主题 `theme.apply`

每个插件源都会执行：

1. `plugin.install`
2. `plugin.enable`

## 8. 暴露给服务端的正式能力

### 8.1 `card.pack`

用于把“资源 URL 已重写、资源文件已删除”的临时卡片目录重新打包为新 `.card`。

### 8.2 `module.invoke`

用于启动正式模块能力调用。当前服务端最重要的用途是：

- `converter.file.convert.convert`

### 8.3 `module.job.get`

当 `module.invoke` 返回 `mode = job` 时，Host 集成层会轮询 job 状态直到：

- `completed`
- `failed`
- `cancelled`

当前轮询间隔固定为 50ms。

## 9. 文件转换调用模型

`convertCardToHtml(...)` 当前向模块系统提交的输入结构为：

- `source.type = card`
- `source.path = cardFile`
- `target.type = html`
- `output.path = outputPath`
- `output.overwrite = true`
- `options.html.packageMode = directory`
- `options.html.includeAssets = true`
- `options.html.includeManifest = false`
- 可选 `locale`
- 可选 `themeId`

这意味着：

1. 转换插件是可替换的
2. 只要插件遵守 Host 模块能力契约，服务端无需改写业务链路
3. HTML 最终效果由正式插件决定，而不是由社区服务器决定

## 10. 与业务流水线的关系

当前 Host 集成只承担两件事：

1. `packCard(...)`
2. `convertCardToHtml(...)`

其余能力仍由社区服务器自己负责：

- 上传受理
- 数据库存储
- 资源枚举
- CDN 上传
- URL 替换
- HTML 目录再次发布到 CDN

因此 Host 集成层是“运行时能力桥接层”，不是上传编排层。

## 11. 正式边界

当前已经明确禁止的做法：

1. 直接在社区服务器里复制 Host 的运行时实现
2. 直接 `import` 一套本地 HTML 渲染器代替转换插件
3. 把插件能力写死为不可替换实现
4. 绕过 Host 内核直接跨层调用插件内部代码

## 12. 当前限制

当前 Host 集成层还没有：

- 多实例 Host 池
- 插件安装缓存
- 插件版本锁定策略文档化界面
- 插件健康检查面板
- 长任务并发队列治理

但对当前第一版社区服务器来说，现有设计已经满足：

- 动态安装插件
- 主题应用
- 正式卡片重打包
- 正式文件转换
