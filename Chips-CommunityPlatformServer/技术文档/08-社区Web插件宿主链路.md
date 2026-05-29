# 社区 Web 插件宿主链路

## 1. 文档定位

本文档记录 `Chips-CommunityPlatformServer` 内部已经落地的浏览器侧应用插件宿主链路。

它描述的是社区服务器自己的正式实现，不额外定义生态公共协议；公共 Host / Bridge / Manifest 口径仍以 `生态共用技术文档/` 为准。

最后核对时间：2026-05-24。

## 2. 当前目标

社区网页当前已经支持：

1. 在浏览器里正式承载原版 `type: app` 插件；
2. 让 `/cards/:cardId` 直接进入原版 `com.chips.card-viewer`；
3. 让卡片内图片点击后通过正式 `resource.open` 打开原版 `com.chips.photo-viewer`；
4. `/cards/:cardId` 打开前只读取轻量 `open-view` 数据，`coverRatio` 走普通列，不把 `cardMetadata` / `cardStructure` JSONB 放入打开热路径；
5. 不再依赖临时重写的网页查看器页面。

## 3. 服务端入口

服务端当前新增以下 Web Runtime 路由：

- `POST /api/v1/host/plugin-sessions`
- `GET /api/v1/host/plugin-sessions/:sessionId`
- `DELETE /api/v1/host/plugin-sessions/:sessionId`
- `POST /api/v1/host/resource-open-plan`
- `GET /api/v1/host/plugin-sessions/:sessionId/entry`
- `GET /api/v1/host/plugin-sessions/:sessionId/bootstrap.js`
- `GET /api/v1/host/plugin-sessions/:sessionId/assets/*`

卡片打开页还使用社区内容接口：

- `GET /api/v1/cards/:cardId/open-view`

代码位置：

- `packages/server/src/routes/host-runtime.ts`
- `packages/server/src/services/host-integration.ts`
- `packages/server/src/routes/cards.ts`
- `packages/server/src/services/card.service.ts`

## 4. 服务端宿主职责

`HostIntegrationService` 当前除原有 `HeadlessHostShell` 集成外，还承担了浏览器插件会话宿主的服务端职责：

1. 安装并启用支持 `runtime.targets.web.supported = true` 的 app 插件；
2. 为浏览器创建正式插件会话，并复用 Host Runtime 的 `pluginInit / completeHandshake`；
3. 解析插件 HTML 入口与静态资源；
4. 在浏览器请求 `resource.open` 时，按正式 `resource-handler / file-handler` 能力解析目标插件；
5. 关闭浏览器侧插件会话。

当前默认纳入社区服务器 Host 的 app 插件：

1. `com.chips.card-viewer`
2. `com.chips.photo-viewer`

当前默认纳入社区服务器 Host 的基础卡片插件：

1. `chips.basecard.richtext`，支持 `base.richtext`
2. `chips.basecard.image`，支持 `base.image`
3. `chips.basecard.webpage`，支持 `base.webpage`
4. `chips.basecard.music`，支持 `base.music`
5. `chips.basecard.video`，支持 `base.video`
6. `chips.basecard.score`，支持 `base.score`
7. `chips.basecard.book`，支持 `base.book`
8. `chips.basecard.hyperlink`，支持 `base.hyperlink`

## 5. 前端宿主页职责

社区前台当前通过以下组件承载 Web 插件：

- `packages/web/src/components/HostedPluginSurface.tsx`
- `packages/web/src/pages/HostedPluginSessionPage.tsx`
- `packages/web/src/lib/host-runtime.ts`

外层宿主页负责：

1. 请求创建插件会话；
2. 用 iframe 承载 `/api/v1/host/plugin-sessions/:sessionId/entry`；
3. 处理 iframe 内 `window.chips.invoke(...)` 发出的 Host 调用；
4. 把 `resource.open / surface.open / plugin.launch / transfer.openExternal` 等动作映射为浏览器导航行为；
5. 生产环境在路由页卸载时自动关闭会话，开发环境禁用自动清理以避免 React 开发态重复卸载把会话提前删掉。

当前正式导航策略补充：

1. 由插件内部触发的“打开新网页”动作，默认优先使用新标签页承载；
2. 若浏览器阻止弹窗，再回退到当前页导航；
3. 社区前台自己的入口路由，例如用户直接进入 `/cards/:cardId`，仍然沿用当前标签页进入。
4. `resource.open` 在命中图片查看器等二级应用时，会先预打开空白标签页，再把会话路由替换进去，避免一次点击同时打开当前页和新标签页。

## 6. 浏览器侧 `window.chips` 注入

当前插件页面里的 `window.chips` 由两部分共同提供：

1. 服务端在插件入口 HTML 中注入 `<base>` 与 `bootstrap.js`
2. 外层 `HostedPluginSurface` 通过 `postMessage` 接住 iframe 发出的 Host 调用

当前 bootstrap 已覆盖的本地能力包括：

1. `platform.getInfo`
2. `platform.getCapabilities`
3. `theme.getCurrent`
4. `i18n.getCurrent`
5. `resource.resolve`
6. `platform.dialogOpenFile`
7. `platform.dialogSaveFile`
8. `platform.dialogShowMessage`
9. `platform.dialogShowConfirm`

其余需要浏览器顶层窗口处理的动作，会转发到外层宿主页。

## 7. 正式链路

### 7.1 卡片内容页

`/cards/:cardId` 当前链路：

1. 社区前台读取 `GET /api/v1/cards/:cardId/open-view`；
2. 若 `viewState = cache_ready` 且存在 `viewUrl`，前台创建 `com.chips.card-viewer` Web 会话；
3. 启动参数中写入结构化 `cardSource`，其 `documentUrl/viewUrl` 指向 `GET /api/v1/cards/:cardId/view`；
4. 原版 `CardViewer` 在 Web 场景下恢复为托管文档查看态；
5. `CardViewer` 用 iframe 承载 `/view` 重定向后的 view 渲染缓存；
6. `HostedDocumentWindow` 采用“先挂载 `message/load/error` 监听，再赋值 iframe `src`”的正式时序，避免浏览器加载过快时丢失 `chips.composite:ready` 或原生 `load` 信号；
7. `HostedDocumentWindow` 消费正式 `chips.composite:resize`，测量 CardViewer 自身真实文档流高度，并向外层插件宿主页发出 `plugin.surface.resize`；
8. `HostedPluginSurface` 在 `surfaceMode = document` 下按正式高度事件同步 iframe 高度；
9. 用户最终滚动的是整个页面，而不是卡片查看器内部的小窗。

当前高度事件遵循生态公共 `DocumentSurfaceResizePayload`：

```ts
interface DocumentSurfaceResizePayload {
  height: number;
  contentHeight: number;
  safeBlockEnd: number;
  viewportHeight: number;
  reason: "initial" | "content-resize" | "asset-load" | "font-load" | "viewport-resize";
  stable: boolean;
}
```

社区链路补充实现规则：

1. `HostedDocumentWindow` 是 Web 卡片查看态的高度发布方；它不会直接把内部复合卡片高度原样透传，而是统一测量自身文档流、内部 iframe、加载态和底部阅读安全区；
2. 底部阅读安全区由 `--chips-document-safe-area-block-end` 驱动，社区宿主在 document surface 上提供默认 token 值；
3. 高度发布使用 `requestAnimationFrame` 合并，连续资源加载、字体加载和窗口缩放会先发布 `stable=false`，约 160ms 稳定窗口后再发布 `stable=true`；
4. 内容增长会即时撑开外层 iframe；内容变短时，CardViewer 与 `HostedPluginSurface` 都只在 `stable=true` 后收缩高度，避免用户阅读底部时页面突然上跳；
5. `HostedPluginSurface(surfaceMode=document)` 只负责把稳定后的文档 surface 高度应用到插件 iframe，不承担卡片内容测量职责；
6. 用户点击外层插件工具栏动作前，`HostedPluginSurface(surfaceMode=document)` 会先把插件 iframe 高度重置到当前浏览器视口并滚动到 surface 顶部，再把 `plugin.chrome.action` 投递给插件。这样从长正文切到封面时，不会让旧正文高度继续参与 CardViewer 内部 `vh` 计算；
7. CardViewer 的封面态仍使用正式 `coverUrl` iframe 展示 `.card/cover.html`，并由 `ViewerCoverSurface` 发布自己的 `plugin.surface.resize` 高度事件；社区文档流宿主下的封面态不使用旧正文高度做垂直居中基准。

### 7.2 图片打开

卡片内图片点击链路：

1. 基础卡片发出 `chips.basecard:resource-open`；
2. 复合卡片文档汇总为 `chips.composite:resource-open`；
3. 原版 `CardViewer` 调用 `client.resource.open(...)`；
4. 外层宿主页请求 `/api/v1/host/resource-open-plan`；
5. 服务端命中 `com.chips.photo-viewer`；
6. 前台创建新的图片查看器 Web 会话；
7. 浏览器导航到 `/host/plugins/:sessionId`；
8. 原版 `PhotoViewer` 从 `launchParams.resourceOpen` 恢复图片查看态。

## 8. Web Surface 映射

当前社区前台对 `surface` 的映射策略：

1. 在浏览器顶层由插件触发的 `route / tab / window` 打开请求，都会优先落到新标签页；
2. 若浏览器阻止弹出，则回退到当前页导航；
3. 当前没有单独实现浏览器内 modal / sheet 容器，相关请求仍会落到路由页承载。

## 9. 社区前台路由壳模式

社区前台当前把页面宿主拆为三类正式路由壳：

1. `default`
2. `document`
3. `immersive`

当前映射规则：

1. 普通社区页面走 `default`，保留社区背景与 `SiteFooter`；
2. `/cards/:cardId` 走 `document`，关闭社区装饰背景，恢复页面级文档流滚动；
3. `/host/plugins/:sessionId` 与 `/boxes/:boxId` 当前走 `immersive`，保持沉浸式全窗插件承载；
4. `document` 和 `immersive` 两类内容直达页都不显示社区页脚。

承载约束：

1. `document` 模式下，`app-shell__main` 参与正常文档流高度计算，不使用固定定位全窗承载；
2. `HostedPluginSurface(surfaceMode=document)` 必须使用普通文档流容器，并跟随 `plugin.surface.resize` 调整 iframe 高度；
3. `immersive` 模式下，`app-shell` 与 `HostedPluginSurface` 才采用固定定位全窗承载；
4. 卡片查看页不得再复用沉浸式应用窗口样式，否则会重新制造中间小窗与内部滚动；
5. 卡片 HTML 正式导出壳层采用纯内容背景与零块向舞台留白，避免在社区 Web 查看链路顶部露出导出背景条；
6. `PhotoViewer` Web 根舞台改为纯色背景，不再额外叠加顶部渐变层。

卡片查看页当前已经拆出独立阅读体验壳层：

1. `CardViewerPageShell` 不再提供顶部菜单栏，而是提供独立悬浮返回按钮、悬浮信息窗和后续功能按钮 slot；
2. `CardViewerPageStage` 只承载卡片查看 surface，后续评论、分享、收藏等功能不得塞进 CardViewer 插件 iframe；
3. 页面底部保留轻量阅读结束空间，最后一张卡不会紧贴浏览器底边；
4. `/cards/:cardId` 不再提供“访问作者主页”入口；
5. `/cards/:cardId` 的返回按钮优先走浏览器历史；无历史时回到作者主页，再无作者信息时回到首页。
6. 卡片查看页顶部保留阅读安全区，避免悬浮控件遮挡卡片正文；卡片信息窗采用顶部居中的药丸形态，只展示卡片标题与创建日期两行信息。

## 9.1 打开页预取与资源预连接

社区前台当前为卡片打开页补充了两类轻量加速：

1. `packages/web/src/lib/card-open-view-prefetch.ts`
   - 以 `cardId` 为 key 维护内存 Promise 缓存；
   - `CardDetailPage` 读取缓存命中结果，否则发起 `GET /api/v1/cards/:cardId/open-view`；
   - 失败请求会从缓存移除，避免缓存错误状态。
2. `packages/web/src/components/WorkTile.tsx`
   - 对 `type = card` 且不处于管理模式的作品卡片启用预取；
   - hover、focus 和接近视口时会调用 `prefetchCardOpenView(cardId)`；
   - 管理模式下不触发打开页预取。

前端启动时还会执行 `packages/web/src/lib/resource-hints.ts`：

- 默认对 `https://file.chipscard.space` 写入 `dns-prefetch` 与 `preconnect`；
- 若配置 `VITE_CCPS_RESOURCE_ORIGIN`，则使用该来源；
- 若资源来源与当前页面同源，则不写入额外 hint。

这些动作只预热轻量 API 与对象存储连接，不提前创建 Host 插件会话，也不绕开 `com.chips.card-viewer`。

## 10. Web 手势接管约束

`PhotoViewer` 在 Web 宿主下需要完整接管用户的缩放和平移手势。

当前实现约束：

1. 视口元素通过原生非被动 `wheel` 监听处理缩放与平移；
2. 当命中图片查看交互时，阻止浏览器默认的页面缩放与页面滚动；
3. 额外拦截 `gesturestart / gesturechange / gestureend`，降低触控板缩放联动浏览器缩放的概率；
4. 视口与根页面统一启用 `overscroll-behavior: none`。

## 11. 当前实现边界

1. 这条链路已经满足社区前台“原版插件正式接入 Web”的业务要求；
2. 当前落地点是社区服务器内部 Web 插件宿主，不等价于 `chips-host` 已对外发布通用 `WebHostShell` 包导出；
3. Web 场景下承载远端卡片 HTML 或图片资源的 app 插件，入口 HTML 的 CSP 必须显式放行 `http:` 与 `https:` 的 `img-src / font-src / connect-src / frame-src`；
4. 对象存储中历史导出的卡片 HTML 如果早于本轮 Host 输出修正，重新导出后才能获得新的 HTML CSP；
5. 社区前台归档目录中的临时图片查看页实现已停用，不再参与正式编译。

## 12. 本地联调补充

当前社区前台开发代理已支持通过环境变量覆盖目标实例：

1. `CCPS_WEB_PORT`
2. `CCPS_API_PROXY_TARGET`
3. `CCPS_CDN_PROXY_TARGET`

这使得当前分支可以在不停止旧版 `3000 / 5173` 进程的情况下，额外拉起一套新的联调实例，例如：

1. 社区 API：`PORT=3001 BASE_URL=http://localhost:3001 npm run dev`
2. 社区前台：`CCPS_WEB_PORT=5175 CCPS_API_PROXY_TARGET=http://localhost:3001 CCPS_CDN_PROXY_TARGET=http://localhost:9000 npm run dev`

补充约束：

1. `HeadlessHostShell` 启动前，默认纳入安装的 `Chips-BoxLayoutPlugin/grid-BLP` 必须先完成构建，使其 `dist/` 入口存在；
2. 若默认 layout 插件尚未构建，服务端会在 Host 插件安装阶段报 `PLUGIN_ENTRY_NOT_FOUND: dist`，而不是进入业务接口阶段。
