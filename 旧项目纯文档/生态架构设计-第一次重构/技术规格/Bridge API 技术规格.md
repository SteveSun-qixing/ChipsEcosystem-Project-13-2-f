# Bridge API 技术规格

**任务编号**：阶段一-任务 1.5（任务 05）  
**文档状态**：可用于阶段三/阶段五实现  
**编写日期**：2026-02-12  
**适用对象**：Chips-Host 主进程开发者、Bridge 预加载脚本开发者、Chips-SDK 开发者、应用插件迁移开发者

---

## 1. 文档目标与范围

本规格定义 `window.chips.*` Bridge API 的完整契约，覆盖：

1. API 形态与 TypeScript 类型（可直接落地 `.d.ts`）
2. 安全模型（权限声明、权限映射、敏感操作二次确认）
3. IPC 通道协议（消息格式、字段定义、错误格式）
4. 预加载脚本实现规范（`preload/bridge.ts`）
5. 主进程 IPC 路由规范（`ipc/ipc-router.ts` + `ipc/permission-checker.ts`）
6. 性能与稳定性约束（批量调用、大数据传输、事件过滤、超时、崩溃恢复）

本规格只定义 Bridge 层，不重新定义 14 类基础服务业务语义；基础服务动作参数/返回值以《基础服务 API 规格》为准。

---

## 2. 架构定位与调用链

Bridge API 是插件访问系统能力的唯一入口，满足以下强约束：

- 插件运行于渲染进程，`nodeIntegration=false`
- 插件不能直接访问 Node.js/Electron 原生能力
- 所有系统调用必须经 `window.chips.*` → IPC → 内核路由器
- 主进程内服务间通信仍遵循中心路由原则：`kernel.router.invoke()`

### 2.1 标准调用链

```text
插件代码（Renderer）
  -> window.chips.invoke(namespace, action, params)
  -> preload/bridge.ts（contextBridge 暴露层）
  -> ipcRenderer.invoke('chips:invoke', request)
  -> ipcMain.handle('chips:invoke')
  -> permission-checker.ts（窗口插件身份 + 权限校验）
  -> kernel.router.invoke(namespace, action, params)
  -> 服务处理
  -> 标准响应/标准错误
  -> 返回插件 Promise
```

### 2.2 Bridge 层边界

Bridge 层负责：

- API 封装与参数形状校验（轻量校验）
- IPC 请求封装、请求 ID 与超时管理
- 事件订阅管理与反订阅清理
- 标准错误转译

Bridge 层不负责：

- 业务规则（由基础服务负责）
- 平台差异处理（由 PAL + platform.* 服务负责）
- 插件安装和注册（由 plugin-manager 负责）

---

## 3. `window.chips` 完整接口定义

### 3.1 顶层对象

```ts
window.chips.invoke(namespace, action, params?)
window.chips.on(event, callback)
window.chips.once(event, callback)
window.chips.emit(event, data?)
window.chips.window.*
window.chips.dialog.*
window.chips.plugin.*
window.chips.clipboard.*
window.chips.shell.*
```

### 3.2 通用调用：`chips.invoke()`

- **签名**：`invoke(namespace: string, action: string, params?: unknown): Promise<unknown>`
- **用途**：调用所有注册到内核路由器的服务动作
- **输入约束**：
  - `namespace`：小写 kebab/camel 命名空间（示例：`file`、`card`、`platform`）
  - `action`：动作名（示例：`read`、`getMetadata`）
  - `params`：可结构化克隆对象，不允许函数、DOM 实例、循环引用
- **返回约束**：成功返回具体动作结果；失败抛出标准错误对象

### 3.3 事件接口

- `on(event, callback)`：持续订阅，返回 `unsubscribe`
- `once(event, callback)`：单次订阅，触发后自动解绑，返回 `unsubscribe`
- `emit(event, data)`：插件向主进程发事件（需按命名规范）

事件名支持：

- 精确匹配：`theme.changed`
- 通配符订阅：`card.*`
- 仅允许点语义（dot semantic）；冒号语义事件（如 `theme:changed`）必须拒绝

### 3.4 窗口 API（14 个方法）

1. `close()`
2. `minimize()`
3. `maximize()`
4. `restore()`
5. `setTitle(title)`
6. `setSize(width, height)`
7. `getSize()`
8. `setPosition(x, y)`
9. `getPosition()`
10. `setFullScreen(flag)`
11. `isFullScreen()`
12. `setAlwaysOnTop(flag)`
13. `openPlugin(pluginId, params?)`
14. `getInfo()`

### 3.5 对话框 API（3 个方法）

1. `showOpenDialog(options)`
2. `showSaveDialog(options)`
3. `showMessageBox(options)`

### 3.6 插件 API（5 个方法）

1. `getSelf()`
2. `list(filter?)`
3. `get(pluginId)`
4. `getCardPlugin(cardType)`
5. `getLayoutPlugin(layoutType)`

### 3.7 剪贴板 API（7 个方法）

1. `readText()`
2. `writeText(text)`
3. `readHTML()`
4. `writeHTML(html)`
5. `readImage()`（Data URL）
6. `writeImage(dataUrl)`
7. `clear()`

### 3.8 Shell API（4 个方法）

1. `openPath(path)`
2. `showItemInFolder(path)`
3. `openExternal(url)`
4. `beep()`

---

## 4. 安全模型

### 4.1 权限声明来源

所有插件权限必须声明在 `manifest.yaml`：

```yaml
permissions:
  - file.read
  - file.write
  - card.read
  - card.write
  - window.create
  - shell.openExternal
```

权限解析来源：`plugin-registry` 中已安装插件的 manifest 快照。

### 4.2 权限校验关键数据

- `windowId`：从 IPC `event.sender` 反查
- `pluginId`：由 `window-manager` 维护 `windowId -> pluginId` 映射
- `permissions`：插件 manifest 声明权限
- `requiredPermissions`：由动作映射/注册元信息给出

### 4.3 Bridge API 权限映射表

| API | 权限 | 说明 |
|---|---|---|
| `chips.invoke(namespace, action)` | 由路由动作元数据决定 | 主入口，按动作级别控制 |
| `chips.on/once` | 无需权限 | 仅订阅，具体事件内容仍受主进程过滤 |
| `chips.emit` | `event.emit`（可选） | 建议对社区插件启用；官方插件可白名单 |
| `chips.window.openPlugin` | `window.create` | 创建新插件窗口 |
| `chips.window.close/minimize/maximize/restore/...` | 无需权限（仅当前窗口） | 不可越权控制其他窗口 |
| `chips.dialog.showOpenDialog` | `dialog.open` | 打开文件/目录选择 |
| `chips.dialog.showSaveDialog` | `dialog.save` | 保存路径选择 |
| `chips.dialog.showMessageBox` | `dialog.message` | 系统对话框 |
| `chips.plugin.list/get/getCardPlugin/getLayoutPlugin` | `plugin.read` | 查询插件注册信息 |
| `chips.plugin.getSelf` | 无需权限 | 只返回当前插件数据 |
| `chips.clipboard.readText/readHTML/readImage` | `clipboard.read` | 读取剪贴板 |
| `chips.clipboard.writeText/writeHTML/writeImage/clear` | `clipboard.write` | 写剪贴板 |
| `chips.shell.openPath/showItemInFolder` | `shell.openPath` | 访问系统文件管理器 |
| `chips.shell.openExternal` | `shell.openExternal` | 打开外链（高风险） |
| `chips.shell.beep` | 无需权限 | 系统提示音 |

> 说明：`chips.invoke` 的权限规则应以服务注册时声明的 `requiredPermissions` 为准，不在 Bridge 层硬编码服务细节。

### 4.4 无需权限 API 清单

- `chips.on()` / `chips.once()`
- `chips.window.close/minimize/maximize/restore/setTitle/setSize/getSize/setPosition/getPosition/setFullScreen/isFullScreen/setAlwaysOnTop/getInfo`
- `chips.plugin.getSelf()`
- 只读公共服务：`i18n.translate`、`i18n.translateBatch`、`theme.get*`、`config.get`（仅非敏感键）

### 4.5 权限校验流程

```text
1. Bridge 发起调用（invoke/子 API）
2. 主进程识别 windowId
3. windowId -> pluginId
4. pluginId -> manifest.permissions
5. 解析目标 API/路由需要的权限
6. 权限缺失 -> 返回 PERMISSION_DENIED
7. 权限通过 -> 执行目标逻辑
8. 审计日志落盘（成功/拒绝都记录）
```

### 4.6 敏感操作二次确认

以下默认启用二次确认（官方插件可由签名策略豁免）：

- `shell.openExternal`
- `file.delete` / `box.delete` / `card.delete`
- `plugin.install` / `plugin.uninstall`
- `credential.set` / `credential.delete`

确认策略：

- 主进程统一弹出系统确认框（不可由插件绕过）
- 用户拒绝返回 `USER_CANCELLED`
- 审计日志写入 `operation`, `pluginId`, `windowId`, `decision`

---

## 5. IPC 通道定义

所有通道以 `chips:` 前缀命名。

### 5.1 `chips:invoke`（请求-响应）

**方向**：`ipcRenderer.invoke` -> `ipcMain.handle`  
**用途**：通用服务调用

请求体：

```ts
interface ChipsInvokeMessage {
  requestId: string;
  namespace: string;
  action: string;
  params?: unknown;
  timestamp: number;
}
```

响应体：

```ts
interface ChipsInvokeResultMessage {
  requestId: string;
  success: true;
  data: unknown;
  timestamp: number;
  durationMs: number;
}
```

错误体：

```ts
interface ChipsInvokeErrorMessage {
  requestId: string;
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
  };
  timestamp: number;
  durationMs: number;
}
```

### 5.2 `chips:emit`（单向发送）

**方向**：`ipcRenderer.send` -> `ipcMain.on`  
**用途**：插件主动发布事件

```ts
interface ChipsEmitMessage {
  event: string;
  data?: unknown;
  timestamp: number;
}
```

### 5.3 `chips:event:{name}`（主进程广播）

**方向**：`webContents.send` -> `ipcRenderer.on`  
**用途**：主进程事件向订阅窗口分发

```ts
interface ChipsEventMessage {
  event: string;
  data?: unknown;
  source: string;
  timestamp: number;
}
```

### 5.4 `chips:window:{action}`（窗口指令）

**方向**：双向（可 `invoke`）  
**用途**：窗口动作指令（close/minimize/openPlugin 等）

```ts
interface ChipsWindowMessage {
  requestId: string;
  action: string;
  params?: unknown;
  timestamp: number;
}
```

### 5.5 `chips:plugin-init`（初始化握手）

**方向**：主进程 -> 渲染进程  
**用途**：窗口加载后注入插件上下文（只读）

```ts
interface ChipsPluginInitMessage {
  pluginId: string;
  pluginType: 'app' | 'card' | 'layout' | 'module' | 'theme';
  version: string;
  permissions: string[];
  launchParams: unknown;
  locale: string;
  themeId: string;
  hostVersion: string;
}
```

---

## 6. `preload/bridge.ts` 实现规范

### 6.1 文件职责

建议结构：

```text
src/preload/
  bridge.ts                // contextBridge 暴露
  bridge-types.ts          // 仅 preload 内部类型
  event-subscriber.ts      // 事件订阅管理
  error-normalizer.ts      // 错误标准化
```

### 6.2 预加载脚本允许依赖

允许：

- `electron`（仅 `contextBridge`, `ipcRenderer`）
- `src/shared/*` 类型常量
- 纯函数工具模块

禁止：

- 引入 Node 高危模块并直接暴露到渲染进程
- 将 `ipcRenderer` 原对象直接挂到 `window`
- 暴露可执行代码字符串或 `eval` 路径

### 6.3 暴露策略

- 使用 `contextBridge.exposeInMainWorld('chips', api)`
- `api` 对象使用 `Object.freeze` 深冻结（防篡改）
- 严格只暴露白名单方法，不透传底层 IPC primitives

### 6.4 事件订阅实现要求

- 使用内部 `Map<string, Set<WrappedCallback>>` 管理订阅
- `on/once` 返回稳定的 `unsubscribe` 闭包
- `once` 在第一次回调后必须自动解绑
- 窗口卸载时（`beforeunload`）自动清理本窗口订阅

### 6.5 错误标准化

preload 层统一转译主进程异常为标准格式：

```ts
{
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

- Bridge 入口错误统一映射到 `BRIDGE_*`
- 服务动作错误统一映射到 `SERVICE_*`

不得将原始 `Error.stack` 直接暴露给第三方插件（仅开发模式或官方签名插件可选透出）。

---

## 7. 主进程 `ipc-router.ts` 规范

### 7.1 组件职责

- `ipc-router.ts`：注册 IPC 通道、做统一入口调度
- `permission-checker.ts`：权限解析与校验
- `window-context-store.ts`：`windowId -> pluginContext` 映射维护

### 7.2 `windowId -> pluginId` 映射

```ts
interface WindowPluginContext {
  windowId: number;
  pluginId: string;
  pluginType: 'app' | 'card' | 'layout' | 'module' | 'theme';
  permissions: Set<string>;
  createdAt: number;
  trusted: boolean;
}
```

- 窗口创建时写入映射
- 窗口关闭/崩溃时删除映射
- 查询失败返回 `WINDOW_CONTEXT_NOT_FOUND`

### 7.3 统一处理流程

```text
IPC 接收
  -> 参数基础校验（namespace/action/event 格式）
  -> 获取窗口上下文
  -> 权限校验
  -> 调用 kernel.router / window-manager / plugin-manager
  -> 标准化响应
  -> 记录调用日志与耗时
```

### 7.4 参数校验最小规则

- `namespace/action/event` 只允许 `[a-zA-Z0-9._:-]`
- `requestId` 必须存在且长度 <= 64
- `timestamp` 必须存在，且为有限数字（`> 0`）
- `params` 必须可结构化克隆
- 字符串参数默认上限 1MB，超限返回 `PAYLOAD_TOO_LARGE`
- 事件名对外口径必须为 dot semantic，冒号事件入站直接拒绝

---

## 8. 性能优化规范

### 8.1 批量调用

Bridge 不新增额外 API，统一走：

```ts
chips.invoke('system', 'batchInvoke', {
  requests: [
    { namespace: 'config', action: 'get', params: { key: 'ui.language' } },
    { namespace: 'theme', action: 'getCurrent', params: {} }
  ]
});
```

约束：

- 单批次最多 50 个子请求
- 子请求顺序可配置（串行/并行）
- 支持部分成功返回

### 8.2 大数据传输

禁止直接经 IPC 传输大体积正文（图片、视频、二进制流）。

推荐：

- 返回 `file://` / `chips-resource://` / 临时签名 URL
- 由渲染进程直接按 URL 加载
- 对临时 URL 设置 TTL（默认 5 分钟）

### 8.3 事件过滤

- 主进程仅向实际订阅者广播
- 支持事件前缀过滤（`card.*`）
- 高频事件支持节流（默认 16ms 一帧内合并）

### 8.4 性能目标（Bridge 层）

- 小包 `invoke`（<4KB）主机内 round-trip：P50 < 3ms，P95 < 12ms
- 单窗口 1 分钟内事件丢失率：0
- 100 个并发订阅者事件广播：P95 < 20ms

---

## 9. 错误处理与恢复

### 9.1 标准错误格式

```ts
interface ChipsBridgeError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

错误码建议分类：

- `BRIDGE_*`：Bridge/IPC 入口错误（参数、权限、上下文）
- `SERVICE_*`：路由动作与服务域错误
- `VALIDATION_*`：参数非法
- `PERMISSION_*`：权限/授权失败
- `ROUTE_*`：路由缺失或冲突
- `PLUGIN_*`：插件上下文相关错误
- `IPC_*`：通信层异常
- `TIMEOUT_*`：超时
- `SYSTEM_*`：主机内部异常

### 9.2 超时策略

默认超时：

- 普通调用：10s
- 文件调用：30s
- 网络调用：60s
- 大型压缩/解压：120s

插件可通过 `params._timeout` 请求更长超时；主进程应有上限钳制（最大 300s）。

### 9.3 渲染进程崩溃恢复

主进程检测到窗口 `render-process-gone` 后：

1. 清理该窗口事件订阅与 pending request
2. 发出 `plugin.crashed` 事件（仅系统/诊断通道）
3. 记录崩溃原因（`reason`, `exitCode`, `pluginId`）
4. 按插件策略重启窗口（最多 3 次指数退避）
5. 重启后重新发送 `chips:plugin-init`

插件侧感知策略：

- SDK 可在恢复后自动重建订阅
- 不保证崩溃前内存态恢复，业务方应以持久化状态为准

---

## 10. `bridge.d.ts` 参考实现（可直接使用）

> 建议文件落地：`Chips-Host/src/preload/bridge.d.ts`，并在 SDK 侧同步为 `Chips-SDK/src/types/bridge.d.ts`。

```ts
export type ChipsPluginType = 'app' | 'card' | 'layout' | 'module' | 'theme';

export interface ChipsBridgeError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type ChipsUnsubscribe = () => void;

export interface ChipsInvokeContext {
  requestId?: string;
  source?: string;
  timestamp?: number;
}

export interface ChipsActionContract<Params = unknown, Result = unknown> {
  params: Params;
  result: Result;
}

// 通过 declaration merging 扩展：
// declare module 'chips-bridge' { interface ChipsServiceContracts { ... } }
export interface ChipsServiceContracts {}

export interface ChipsEventPayloadMap {
  'system.ready': void;
  'system.shuttingDown': void;
  'theme.changed': { themeId: string };
  'language.changed': { language: string };
  'config.updated': { key: string; value: unknown };
  'plugin.installed': { pluginId: string };
  'plugin.uninstalled': { pluginId: string };
  'plugin.updated': { pluginId: string; version: string };
  'card.opened': { cardPath: string };
  'card.saved': { cardPath: string };
  'card.updated': { cardId: string };
  'file.changed': { path: string; type: 'create' | 'modify' | 'delete' };
}

export interface ChipsWindowInfo {
  pluginId: string;
  windowId: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ChipsDialogFileFilter {
  name: string;
  extensions: string[];
}

export interface ChipsOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: ChipsDialogFileFilter[];
  multiSelections?: boolean;
  directory?: boolean;
}

export interface ChipsSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: ChipsDialogFileFilter[];
}

export interface ChipsMessageBoxOptions {
  type?: 'info' | 'warning' | 'error' | 'question';
  title?: string;
  message: string;
  detail?: string;
  buttons?: string[];
  defaultId?: number;
}

export interface ChipsPluginInfo {
  id: string;
  name: string;
  version: string;
  type: ChipsPluginType;
  publisher: string;
  description?: string;
  installPath: string;
  enabled: boolean;
}

export interface ChipsPluginSelfInfo {
  id: string;
  version: string;
  type: ChipsPluginType;
  installPath: string;
}

export interface ChipsPluginListFilter {
  type?: ChipsPluginType;
  capability?: string;
}

export interface ChipsCardPluginEntry {
  pluginId: string;
  rendererPath: string;
  editorPath: string;
}

export interface ChipsLayoutPluginEntry {
  pluginId: string;
  rendererPath: string;
  editorPath: string;
}

export interface ChipsWindowBridgeAPI {
  close(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  restore(): Promise<void>;
  setTitle(title: string): Promise<void>;
  setSize(width: number, height: number): Promise<void>;
  getSize(): Promise<{ width: number; height: number }>;
  setPosition(x: number, y: number): Promise<void>;
  getPosition(): Promise<{ x: number; y: number }>;
  setFullScreen(flag: boolean): Promise<void>;
  isFullScreen(): Promise<boolean>;
  setAlwaysOnTop(flag: boolean): Promise<void>;
  openPlugin(pluginId: string, params?: unknown): Promise<void>;
  getInfo(): Promise<ChipsWindowInfo>;
}

export interface ChipsDialogBridgeAPI {
  showOpenDialog(options: ChipsOpenDialogOptions): Promise<string[] | null>;
  showSaveDialog(options: ChipsSaveDialogOptions): Promise<string | null>;
  showMessageBox(options: ChipsMessageBoxOptions): Promise<{ response: number }>;
}

export interface ChipsPluginBridgeAPI {
  getSelf(): Promise<ChipsPluginSelfInfo>;
  list(filter?: ChipsPluginListFilter): Promise<ChipsPluginInfo[]>;
  get(pluginId: string): Promise<ChipsPluginInfo | null>;
  getCardPlugin(cardType: string): Promise<ChipsCardPluginEntry | null>;
  getLayoutPlugin(layoutType: string): Promise<ChipsLayoutPluginEntry | null>;
}

export interface ChipsClipboardBridgeAPI {
  readText(): Promise<string>;
  writeText(text: string): Promise<void>;
  readHTML(): Promise<string>;
  writeHTML(html: string): Promise<void>;
  readImage(): Promise<string | null>;
  writeImage(dataUrl: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ChipsShellBridgeAPI {
  openPath(path: string): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  openExternal(url: string): Promise<void>;
  beep(): Promise<void>;
}

type KnownNamespace = keyof ChipsServiceContracts & string;
type KnownAction<N extends KnownNamespace> = keyof ChipsServiceContracts[N] & string;

type KnownActionContract<
  N extends KnownNamespace,
  A extends KnownAction<N>
> = ChipsServiceContracts[N][A] extends ChipsActionContract<infer P, infer R>
  ? ChipsActionContract<P, R>
  : ChipsActionContract<unknown, unknown>;

export interface ChipsBridgeAPI {
  invoke<N extends KnownNamespace, A extends KnownAction<N>>(
    namespace: N,
    action: A,
    params: KnownActionContract<N, A>['params']
  ): Promise<KnownActionContract<N, A>['result']>;

  invoke(namespace: string, action: string, params?: unknown): Promise<unknown>;

  on<E extends keyof ChipsEventPayloadMap & string>(
    event: E,
    callback: (payload: ChipsEventPayloadMap[E]) => void
  ): ChipsUnsubscribe;

  on(event: string, callback: (payload: unknown) => void): ChipsUnsubscribe;

  once<E extends keyof ChipsEventPayloadMap & string>(
    event: E,
    callback: (payload: ChipsEventPayloadMap[E]) => void
  ): ChipsUnsubscribe;

  once(event: string, callback: (payload: unknown) => void): ChipsUnsubscribe;

  emit(event: string, data?: unknown): void;

  window: ChipsWindowBridgeAPI;
  dialog: ChipsDialogBridgeAPI;
  plugin: ChipsPluginBridgeAPI;
  clipboard: ChipsClipboardBridgeAPI;
  shell: ChipsShellBridgeAPI;
}

declare global {
  interface Window {
    chips: ChipsBridgeAPI;
  }
}

export {};
```

---

## 11. 实现验收清单（阶段三开发可直接使用）

- `window.chips` 类型定义可被 TS strict 项目直接消费（无 `any`）
- 通道 `chips:invoke`/`chips:emit`/`chips:event:{name}`/`chips:window:{action}`/`chips:plugin-init` 均有明确消息结构
- 权限映射表与 manifest `permissions` 字段可一一对应
- `ipc-router` 明确包含：窗口身份识别、权限校验、路由转发、统一错误格式
- 支持批量调用、大对象 URL 传输、事件过滤
- 异常路径覆盖：权限拒绝、参数错误、路由缺失、超时、渲染进程崩溃
