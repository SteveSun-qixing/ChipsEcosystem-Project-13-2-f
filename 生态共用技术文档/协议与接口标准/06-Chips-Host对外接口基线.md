# Chips Host 对外接口基线

> 文档状态：vNext 对外接口基线稿（跨生态统一口径）
> 适用阶段：阶段18及后续开发实施阶段
> 目标：集中定义薯片主机对生态其他软件/插件/工具暴露的稳定接口边界。

---

## 0. 适用范围

本文档覆盖以下对外接口面：

- 插件与应用通过 `window.chips.*` 访问主机能力。
- SDK 对 Bridge API 的标准封装。
- `chips` 命令行管理接口。
- 主机对外事件语义与错误语义。

不覆盖主机内部实现细节（内部细节见 `Chips-Host/技术文档`）。

---

## 1. 接口分层

| 层级 | 对外入口 | 消费方 |
|---|---|---|
| L5 | `window.chips.invoke/on/once/emit` + 子域 API | 插件、应用插件、主题插件 |
| L6 | Runtime Client（Host 内置运行时，SDK 仅封装调用） | 插件业务层、UI Hooks |
| CLI | `chips <command>` | 用户、运维脚本、自动化任务 |

---

## 2. Bridge 对外接口基线

## 2.1 核心入口

- `invoke(action, payload?)`：调用 `namespace.action` 路由动作。
- `on(event, handler)`：订阅事件（返回取消订阅函数）。
- `once(event, handler)`：一次性订阅。
- `emit(event, data?)`：向主机发送事件。

## 2.2 子域基线

| 子域 | 核心能力 |
|---|---|
| `window` | 窗口打开、聚焦、尺寸与状态控制 |
| `dialog` | 文件选择、保存、消息确认 |
| `plugin` | 插件安装、启停、查询 |
| `clipboard` | 剪贴板读写 |
| `shell` | 外部打开、定位文件 |
| `ipc` | 本地 IPC 通道管理与消息收发 |

### 2.3 子域参数基线

- `dialog.openFile(options)`：
  - 桥接到主机动作：`platform.dialogOpenFile`
  - `defaultPath` 存在时优先直接返回该路径（用于自动化与无头场景）
  - `mode` 支持 `file | directory`
  - `allowMultiple` 控制多选
  - 该类交互式对话框必须使用人工操作级 Host 路由超时，不能使用 2 秒级短超时
- `window.open(payload)`：
  - 必填：`config.title/config.width/config.height`
  - 可选：`config.url`（插件入口）、`config.pluginId`（插件标识）、`config.sessionId`（会话标识）
  - 当 `url` 为本地 HTML 路径时由主机加载本地入口；为 `http(s)/file/chips` URL 时按 URL 方式加载
  - 当调用方未显式提供 `config.chrome.backgroundColor` 且窗口不是透明窗口时，Host 会从当前主题 token 中推导原生窗口背景
- `dialog.saveFile(options)`：
  - 桥接到主机动作：`platform.dialogSaveFile`
  - `defaultPath` 存在时返回该路径并确保目录可写
  - 该类交互式对话框必须使用人工操作级 Host 路由超时，不能使用 2 秒级短超时
- `plugin.install(payload)`：
  - 入参字段：`manifestPath`（兼容字段名）
  - 支持路径类型：插件目录、`.cpk` 包、`manifest.yaml/yml/json` 清单文件
  - 安装后由主机统一落库存储到主机插件目录
- `clipboard.read/write`：
  - 桥接到主机动作：`platform.clipboardRead/platform.clipboardWrite`
  - 支持格式：`text`、`image`（`{ base64, mimeType? }`）、`files`（`string[]`）
- `shell.openPath/openExternal/showItemInFolder`：
  - 桥接到主机动作：`platform.shellOpenPath/platform.shellOpenExternal/platform.shellShowItemInFolder`
  - 对应系统原生命令打开行为，不做业务层路径改写
- `ipc.createChannel/send/receive/closeChannel/listChannels`：
  - 桥接到主机动作：`platform.ipcCreateChannel/platform.ipcSend/platform.ipcReceive/platform.ipcCloseChannel/platform.ipcListChannels`
  - `transport` 支持：`named-pipe`、`unix-socket`、`shared-memory`
  - `platform.ipcReceive` 返回消息统一使用 `base64` 载荷（字段：`payload` + `encoding=base64`）

## 2.4 通道命名

- 主调用通道：`chips:invoke`
  - 请求：`{ action, payload, context? }`
  - 响应：动作返回值或标准错误对象
- 渲染进程事件上行通道：`chips:emit`
  - 请求：`{ event, data? }`
- 主进程事件下行通道：`chips:event:<name>`
  - 载荷：事件 `data`
- `chips:<domain>:*` 作为扩展通道保留位，当前基线实现统一走 `chips:invoke`。

---

## 3. 服务动作公开基线

公开动作命名统一采用 `namespace.action`，对外可见命名空间如下：

`file/resource/config/theme/i18n/window/plugin/module/platform/log/credential/card/box/zip/serializer/control-plane`

> 具体动作列表以对应服务文档与契约清单为准；本节只冻结公开命名空间与动作命名规则。

### 3.1 theme / plugin / window 运行时补充基线

- `theme.list/getCurrent/getAllCss/resolve/apply` 只面向当前工作区中已启用的主题插件；
- `plugin.list/get/query` 读取链路统一返回 Host 已安装插件元数据；其中 `plugin.query` 在运行时记录基础上补齐 `name/version/description` 与类型专属治理字段；
- `plugin.launch` 仅用于启动 `type: app` 插件，并统一走 Host 正式会话初始化链路；
- `plugin.getShortcut/createShortcut/removeShortcut` 是应用插件系统快捷方式的唯一正式治理入口；
- 应用插件快捷方式在 Host 侧按工作区记录状态，Host 当前使用 `plugin-shortcuts.json` 保存 `pluginId -> launcherPath` 映射；
- 快捷方式显示名优先取 `manifest.ui.launcher.displayName`，回退到 `manifest.name`；
- 主题插件的 `install/enable/disable/uninstall` 会刷新 Host 主题运行时状态；
- preload 会把当前主题写入文档根节点的 `data-chips-theme-id` 与 `data-chips-theme-version`；
- preload 同时会把当前窗口的 `launchContext` 暴露给 `window.chips.platform.getLaunchContext()`；
- `theme.changed` 事件是应用壳层、主题运行时和复合卡片窗口同步刷新的统一事件源；
- `window.open` 在未传入背景色时使用当前主题 token 推导窗口背景；
- 在 Electron Host 中，当全部插件窗口关闭后，Host 继续后台常驻，不因 `window-all-closed` 自动退出。

快捷方式平台映射基线：

- Windows：桌面 `.lnk`
- macOS：`~/Applications/Chips Apps/*.app`，显示为启动台入口

Host 快捷方式启动参数基线：

- 统一指向 Host Electron `app-entry`
- 必须带上 `--workspace=<workspacePath>`
- 必须带上 `--chips-launch-plugin=<pluginId>`
- 若未来需要扩展额外启动参数，应通过 `--chips-launch-payload=<base64url-json>` 承载

### 3.2 card.render（L9 统一渲染入口）补充基线

- 动作：`card.render`
- 必填入参：
  - `cardFile: string`
- 可选入参：
  - `options.target`: `app-root | card-iframe | module-slot | offscreen-render`
  - `options.viewport`: `{ width?, height?, scrollTop?, scrollLeft? }`
  - `options.verifyConsistency`: `boolean`
- 入参校验规则（Host schema）：
  - `options.target` 必须属于白名单目标值，非法值直接返回 `SCHEMA_VALIDATION_FAILED`。
  - `options.viewport.width/height`（若提供）必须为大于 0 的有限数值。
  - `options.viewport.scrollTop/scrollLeft`（若提供）必须为有限数值。
  - `options.verifyConsistency`（若提供）必须为布尔值。
- 响应 `view` 建议字段：
  - `title: string`
  - `body: string`（适配器提交后的 HTML）
  - `contentFiles: string[]`
  - `target: string`
  - `semanticHash: string`
  - `diagnostics?: RenderNodeDiagnostic[]`
  - `consistency?: RenderConsistencyResult`

`RenderNodeDiagnostic` 建议字段：

```ts
interface RenderNodeDiagnostic {
  nodeId: string;
  stage: 'node-normalize' | 'contract-validate' | 'theme-resolve' | 'layout-compute' | 'render-commit' | 'effect-dispatch';
  code: string;
  message: string;
  details?: unknown;
}
```

---

## 4. 事件与错误语义基线

## 4.1 事件语义

- 事件名必须使用点语义（例如 `theme.changed`、`plugin.enabled`）。
- 事件载荷建议包含：`id/name/source/data/timestamp/metadata`。
- 当前 `theme.changed` 基线载荷至少包含：`previousThemeId`、`themeId`、`timestamp`。

## 4.2 错误语义

标准错误对象：

```ts
interface StandardError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

错误码分层前缀：

- `BRIDGE_*`：桥接与通道错误
- `SERVICE_*`：服务域错误
- `RUNTIME_*`：运行时超时与重试错误
- `PERMISSION_*`：权限错误

关键错误码补充：

- `ROUTE_REPLAY_DETECTED`：非幂等动作命中 requestId 防重放窗口
- `PAL_COMMAND_NOT_FOUND` / `PAL_COMMAND_FAILED`：PAL 调用系统命令失败
- `RENDER_CONTRACT_*`：统一渲染契约校验失败
- `RENDER_THEME_*`：统一渲染主题解析失败
- `RENDER_LAYOUT_*`：统一渲染布局计算失败

---

## 5. 权限基线

- 所有敏感动作必须走插件权限校验。
- 权限由插件 manifest 显式声明，未声明即拒绝。
- 高风险能力（凭证、外部打开、窗口控制）必须审计。
- 非幂等动作必须启用 requestId 去重窗口，避免重放写入。

---

## 6. CLI 对外接口基线

命令入口：`chips`

公开命令域：

- 运行管理：`start/stop/status`
- 配置管理：`config list/set/reset`
- 运行观察：`logs/doctor`
- 文件入口：`open <target-file>`
- 插件管理：`plugin install/uninstall/list/enable/disable/query`
- 主题管理：`theme list/current/apply/resolve/contract/validate`
- 更新管理：`update check/install`

CLI 应满足：

- 不再暴露 `chips host` 二级命令；
- 支持脚本化调用与非交互执行。
- 支持 JSON 输出用于自动化集成。
- 命令失败返回非 0 状态码并输出标准错误信息。

文件入口与快捷方式入口补充基线：

- `chips open <target-file>` 在命中 `file-handler:<扩展名>` 的已启用应用插件时，必须统一转发到 `plugin.launch`；
- `plugin.launch` 的 `launchParams.trigger` 需标记真实来源，当前至少包括 `file-association`、`app-shortcut`、`chipsdev.run`；
- 快捷方式入口与文件入口都必须能够把目标会话恢复到正确工作区。

---

## 7. 兼容性策略

- 协议版本遵循语义化版本。
- 非兼容变更仅允许在主版本升级时发布。
- 历史动作别名仅在 Runtime Client 兼容层处理，不新增公开重复动作。

---

## 8. 变更治理

- 所有对外接口变更必须先更新本文件，再更新实现。
- 变更必须附带：影响分析、迁移说明、回滚方案。
- 未更新文档的接口变更视为无效变更，不允许合并。

---

## 9. 关联文档

- `01-薯片协议规范.md`
- `02-Bridge-API规范.md`
- `14-Host服务域设计.md`
- `01-Chips-Host命令行使用手册.md`
