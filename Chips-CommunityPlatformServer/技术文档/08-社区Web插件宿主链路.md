# 社区 Web 插件宿主链路

## 1. 文档定位

本文档记录 `Chips-CommunityPlatformServer` 内部已经落地的浏览器侧应用插件宿主链路。

它描述的是社区服务器自己的正式实现，不额外定义生态公共协议；公共 Host / Bridge / Manifest 口径仍以 `生态共用技术文档/` 为准。

## 2. 当前目标

社区网页当前已经支持：

1. 在浏览器里正式承载原版 `type: app` 插件；
2. 让 `/cards/:cardId` 直接进入原版 `com.chips.card-viewer`；
3. 让卡片内图片点击后通过正式 `resource.open` 打开原版 `com.chips.photo-viewer`；
4. 不再依赖临时重写的网页查看器页面。

## 3. 服务端入口

服务端当前新增以下 Web Runtime 路由：

- `POST /api/v1/host/plugin-sessions`
- `GET /api/v1/host/plugin-sessions/:sessionId`
- `DELETE /api/v1/host/plugin-sessions/:sessionId`
- `POST /api/v1/host/resource-open-plan`
- `GET /api/v1/host/plugin-sessions/:sessionId/entry`
- `GET /api/v1/host/plugin-sessions/:sessionId/bootstrap.js`
- `GET /api/v1/host/plugin-sessions/:sessionId/assets/*`

代码位置：

- `packages/server/src/routes/host-runtime.ts`
- `packages/server/src/services/host-integration.ts`

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

1. 社区前台读取卡片详情；
2. 若卡片 `status = ready` 且存在 `htmlUrl`，前台创建 `com.chips.card-viewer` Web 会话；
3. 启动参数中写入 `webDocumentUrl`；
4. 原版 `CardViewer` 在 Web 场景下恢复为托管文档查看态；
5. `CardViewer` 用 iframe 承载对象存储中的卡片 HTML 文档；
6. `HostedDocumentWindow` 采用“先挂载 `message/load/error` 监听，再赋值 iframe `src`”的正式时序，避免浏览器加载过快时丢失 `chips.composite:ready` 或原生 `load` 信号；
7. `HostedDocumentWindow` 消费正式 `chips.composite:resize`，并向外层插件宿主页发出 `plugin.surface.resize`；
8. `HostedPluginSurface` 在 `surfaceMode = document` 下按正式高度事件同步 iframe 高度；
9. 用户最终滚动的是整个页面，而不是卡片查看器内部的小窗。

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
