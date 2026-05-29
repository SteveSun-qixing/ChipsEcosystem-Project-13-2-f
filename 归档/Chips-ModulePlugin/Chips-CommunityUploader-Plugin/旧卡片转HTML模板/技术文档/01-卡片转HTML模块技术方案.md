# 卡片转HTML模块技术方案

## 1. 当前实现状态

本仓已完成正式 `card -> html` 原子能力替换，当前对外暴露：

- capability：`converter.card.to-html`
- method：`convert`
- mode：`job`

当前代码分为四个核心文件：

- `src/index.ts`：模块 provider 定义
- `src/types.ts`：输入输出与 Host 上下文类型
- `src/errors.ts`：结构化错误与警告类型
- `src/exporter.ts`：转换主流程、路径处理、资源复制与打包

## 2. 转换主流程

主流程按以下阶段执行：

1. `prepare`
   - 校验输入
   - 校验卡片源是否存在
   - 校验输出路径是否可写，必要时按 `overwrite=true` 删除旧产物
2. `render-html`
   - 调用 `ctx.host.invoke("card.render", { cardFile, options })`
   - 固定传入 `target: "offscreen-render"`
   - 按需透传 `themeId` 与 `locale`
3. `rewrite-assets`
   - 识别 Host 当前正式复合文档中的两类基础卡片子文档来源：
     - 旧口径 `iframe[srcdoc]`
     - 当前正式 render session 口径 `iframe[src]`
   - 对 `iframe[src]` 通过 `card.resolveDocumentPath` 解析 render session 子文档真实落点
   - 从基础卡片子文档内的 `base href="file://..."`、`base href="chips-render://card-root/..."` 或其他受控绝对资源引用推导资源根目录
   - 把资源复制到 `assets/content/`
   - 把 HTML 内的 `file://` 与受控渲染协议资源地址改写为相对路径
4. `write-output`
   - 在最终 HTML 上补充导出展示壳层
   - 把复合卡片中的每个基础卡片 iframe 子文档统一外置为 sibling HTML 文件
   - 提供网页背景、响应式居中宽度与上下留白
   - 写出 `index.html`
   - 写出 `<node-id>.html`
   - 按需写出 `conversion-manifest.json`
5. `release-session`
   - 调用 `ctx.host.invoke("card.releaseRenderSession", { sessionId })`
   - 释放 `card.render` 创建的 render session 临时目录
6. `package-html`
   - 仅 `zip` 模式执行
   - 调用 `ctx.host.invoke("zip.compress", ...)` 打包目录
7. `cleanup`
   - 删除 ZIP 构建临时目录
   - 失败时清理部分输出

## 3. 渲染来源与边界

HTML 原文必须来自 Host 正式卡片渲染结果：

- 调用 `card.render(..., { target: "offscreen-render" })`
- 获取 Host 返回的复合卡片 HTML 文档、`documentUrl` 与 `sessionId`
- 仅在 Host 输出结果之上执行离线化、导出展示壳层包装与打包处理
- 不复制基础卡片前端代码，不切换 Host 全局主题/语言状态绕行
- 当前 Host 正式以 render session 目录持久化复合文档和基础卡片节点文档；转换模块必须基于 `documentUrl` 解析这些正式子文档，而不是假设 Host 继续返回内联 `srcdoc`

导出展示壳层的职责边界：

- 只负责导出网页的背景、留白与居中宽度控制
- 不复写卡片内部 DOM 结构
- 不引入查看器运行时标识或查看器业务逻辑
- 不改变 Host `card.render` 生成的卡片内容语义

## 4. 资源处理策略

当前实现遵循以下规则：

- 资源根优先从基础卡片子文档中的 `base href` 推导，既支持 `file://` 也支持受控渲染协议资源根
- 若不存在唯一 `base href`，则回退到所有可解析绝对资源引用的共享祖先目录
- 复制时保留资源树相对结构，统一落到 `assets/content/`
- 仅改写资源根范围内的本地/受控资源链接；根外链接保持原样
- render session 子文档通过 `card.resolveDocumentPath` 解析真实文件路径后再读取，避免依赖 `documentUrl` 的协议前缀或磁盘目录结构
- `includeAssets=false` 时不复制资源、不改写链接，并返回 `CONVERTER_HTML_ASSETS_SKIPPED`

## 5. 输出模式

- `directory`：作为下游中间产物
- `zip`：作为最终 HTML 交付物

这两种模式必须复用同一份目录构建逻辑，只在最后一步是否压缩上分叉。

当前输出结构如下：

```text
<output>/
├─ index.html
├─ <node-id>.html               # 复合卡片中每个基础卡片 iframe 的离线文档
├─ assets/
│  └─ content/                  # includeAssets=true 时存在
└─ conversion-manifest.json     # includeManifest=true 时存在
```

当前版本不单独产出 `assets/theme/`。若未来 Host 渲染链路输出独立主题工件，应在不改变公共入口能力的前提下落位到该目录。

补充约束：

- `index.html` 只负责复合卡片壳层与 iframe `src` 引用，不再保留大体积 `srcdoc`，也不再继续引用 render session 内部的 `./nodes/*`
- sibling HTML 文件名优先复用 `data-node-id`，便于排查与长期稳定产物命名
- 转换结束后必须释放 `card.render` 返回的 render session，避免 Host 渲染临时目录泄漏

## 6. 导出展示壳层

当前导出 HTML 在 `<body>` 外层统一补充导出展示容器：

- `body` 使用纯内容背景，不再额外叠加舞台渐变
- `.chips-export-stage` 负责全视口承载和水平居中，不再引入顶部块向留白
- `.chips-export-stage__viewport` 负责响应式最大宽度，并与视口高度保持对齐
- `.chips-export-stage__content` 负责承载 Host 返回的 `.chips-composite`

设计原则：

- 桌面端维持稳定阅读宽度，避免卡片内容无限拉伸
- 移动端降级为全宽内容区，不额外保留导出舞台边距
- 导出页首屏不应露出额外顶部背景条
- 导出样式必须保持幂等，多次处理同一 HTML 不得重复注入
## 7. Manifest 策略

`conversion-manifest.json` 当前记录：

- 生成时间与 schemaVersion
- 源卡片路径、标题、语义哈希
- 请求级 `themeId / locale`
- 输出模式、入口文件与 manifest 文件名
- 资源包含情况与计数
- 生成时警告列表

`includeManifest=false` 时：

- 结果对象中的 `manifestFile` 省略
- 输出目录不写入 manifest
- 返回 `CONVERTER_HTML_MANIFEST_SKIPPED`
- 该结果不得再进入 PDF / 图片正式链路

## 8. 错误与清理策略

当前实现区分以下主要错误：

- `CONVERTER_INPUT_INVALID`
- `CONVERTER_OUTPUT_EXISTS`
- `CONVERTER_JOB_CANCELLED`
- `CONVERTER_HTML_RENDER_FAILED`
- `CONVERTER_HTML_ASSET_REWRITE_FAILED`
- `CONVERTER_OUTPUT_WRITE_FAILED`
- `CONVERTER_HTML_PACKAGE_FAILED`

清理规则：

- 目录态输出失败时删除部分输出目录
- ZIP 输出失败时删除部分 ZIP 文件
- ZIP 构建临时目录始终在 `finally` 中做 best-effort 清理

## 9. 测试重点

- Host 渲染结果接入测试
- render session `iframe[src]` 子文档解析测试
- `chips-render://card-root/...` 资源重写测试
- `themeId / locale` 单次覆盖透传测试
- 资源重写与资源复制测试
- 导出展示壳层注入与卡片内容保留测试
- 目录态和压缩态输出测试
- `includeAssets=false` / `includeManifest=false` 警告测试
- render session 回收测试
- 写入失败时的错误分类与清理测试
