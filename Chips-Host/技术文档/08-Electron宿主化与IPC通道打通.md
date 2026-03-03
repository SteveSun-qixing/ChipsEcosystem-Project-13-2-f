# Electron 宿主化与 IPC 通道打通

## 1. 目标

- 落地主机 IPC 通道：`chips:invoke`、`chips:emit`、`chips:event:<name>`。
- 在 Electron 运行时打通 `ipcMain/ipcRenderer`，而非仅进程内直连调用。
- 固化 preload 主线：`contextBridge.exposeInMainWorld('chips', bridge)`。
- 将窗口管理从纯内存状态推进到 BrowserWindow 实窗链路（Electron 环境）。
- 补齐主进程生命周期与全局异常托底骨架。
- 深化服务级动态加载：所有服务动作首调激活，重服务实例按需创建。

## 2. 关键实现

### 2.1 IPC 通道绑定

新增文件：
- `src/main/ipc/chips-ipc.ts`
- `src/main/electron/electron-loader.ts`

行为：
- 主进程在启动时绑定：
  - `chips:invoke` -> Kernel Router 调用
  - `chips:emit` -> Kernel EventBus 事件入站
- Kernel 事件出站广播：
  - `chips:event:<name>` -> renderer
- `chips:invoke` 请求格式统一为：
  - `action`: 路由动作（`namespace.action`）
  - `payload`: 业务参数
  - `context`: 可选调用上下文（缺省时主机自动补齐 `requestId/timestamp/windowId`）
- 主机停止时自动解绑 handler/listener。

### 2.2 Preload 侧桥接改造

更新文件：
- `src/preload/create-bridge.ts`

行为：
- Electron 可用时，BridgeTransport 通过 `ipcRenderer.invoke/send/on` 使用标准通道。
- 非 Electron 环境自动回退到本地内存桥接，保障测试与 CLI 稳定。
- IPC 模式下 `on/once/emit` 与 `window.chips.*` 子域统一走通道，不再绕过主进程直接触达内核。
- 新增 `exposeBridgeToMainWorld/createAndExposeBridgeForKernel`，统一封装 `contextBridge.exposeInMainWorld`。
- 默认桥接上下文权限改为最小权限（空权限）；主机内部桥接显式注入 `HOST_INTERNAL_PERMISSIONS`。

### 2.3 BrowserWindow 宿主链路

更新文件：
- `packages/pal/src/node-adapter.ts`
- `packages/pal/src/types.ts`

行为：
- `PALWindow.create/focus/resize/setState/getState/close` 在 Electron 环境下驱动真实 BrowserWindow。
- `window.open.config.url` 支持载入目标页面。
- `window.open` 新增窗口上下文透传：`pluginId/sessionId/url`，用于插件窗口会话绑定。
- 非 Electron 环境保留内存态窗口模型，保证跨环境一致接口。

### 2.4 服务级动态加载深化

更新文件：
- `src/main/services/register-host-services.ts`
- `src/main/core/host-application.ts`

行为：
- 服务动作统一加首调激活包装（`service.activated` 事件）。
- `card/box/zip` 服务实例通过 getter 记忆化，首次调用才真正实例化。
- 其余服务保持“动作首次触发激活”模式，避免启动期提前执行重路径。

### 2.5 主进程生命周期与异常治理

新增文件：
- `src/main/core/main-process.ts`
- `src/main/index.ts`（新增导出）

行为：
- 启动时统一编排 `app.whenReady -> hostApplication.start`。
- 绑定并治理 Electron 生命周期事件：
  - `before-quit`：触发主机停止与资源回收；
  - `window-all-closed`：非 macOS 自动 `app.quit()`；
  - `activate`：窗口恢复场景下确保主机运行态。
- 绑定全局异常处理：
  - `process.on('uncaughtException')`
  - `process.on('unhandledRejection')`
  - 异常统一写入结构化日志，避免静默失败。

## 3. 文件关联与插件宿主协同

更新文件：
- `src/main/core/file-association.ts`

行为：
- 命中 `file-handler:<ext>` 能力时优先走插件会话：
  - `plugin.init` -> `plugin.handshake.complete` -> `window.open`
- `window.open` 携带 `pluginId/sessionId/url`，用于宿主窗口装配插件入口。
- 插件安装查询结果增加 `installPath/entry`，用于计算真实窗口入口地址。

## 4. 测试覆盖

- `tests/unit/chips-ipc.test.ts`
  - 校验 `chips:invoke/chips:emit/chips:event:*` 通道行为
- `tests/unit/preload-context-bridge.test.ts`
  - 校验 `contextBridge.exposeInMainWorld` 与 preload bridge 装配
- `tests/unit/pal-window-electron.test.ts`
  - 校验 BrowserWindow 实窗创建、页面加载、窗口状态同步、关闭清理
- `tests/unit/main-process-lifecycle.test.ts`
  - 校验 `whenReady/before-quit/window-all-closed` 生命周期编排与异常托底
- `tests/unit/service-activation.test.ts`
  - 校验服务首调激活事件与 `card/box/zip` 懒实例化
- `tests/integration/host-services.test.ts`
  - 覆盖文件关联命中插件处理器、插件会话打开窗口链路
- `tests/e2e/cli.test.ts`
  - 已覆盖 `chips host open` 入口链路

验证结果（2026-03-03）：

- `npm run build`：通过
- `npm test`：通过（17 文件 / 53 用例）
