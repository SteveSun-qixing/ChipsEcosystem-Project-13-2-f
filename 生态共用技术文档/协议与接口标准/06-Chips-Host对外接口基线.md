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
| L5 | `window.chips.invoke/on/once/emit` + `invokeScoped/emitScoped` + 子域 API | 插件、应用插件、主题插件 |
| L6 | Runtime Client（Host 内置运行时，SDK 仅封装调用） | 插件业务层、UI Hooks |
| CLI | `chips <command>` | 用户、运维脚本、自动化任务 |

---

## 2. Bridge 对外接口基线

## 2.1 核心入口

- `invoke(action, payload?)`：调用 `namespace.action` 路由动作。
- `invokeScoped(action, payload, { token })`：以 Host 发放的一次性 bridge scope token 作为调用作用域，主要用于模块运行时建立独立插件身份。
- `on(event, handler)`：订阅事件（返回取消订阅函数）。
- `once(event, handler)`：一次性订阅。
- `emit(event, data?)`：向主机发送事件。
- `emitScoped(event, data, { token })`：以 scoped token 向主机发送事件，作用域还原规则与 `invokeScoped` 一致。

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
  - `defaultPath` 仅作为系统文件选择对话框的初始建议路径；Host 仍必须弹出正式对话框并等待用户确认
  - `mode` 支持 `file | directory`
  - `allowMultiple` 控制多选
  - 用户取消时返回 `null`
  - 该类交互式对话框必须使用人工操作级 Host 路由超时，不能使用 2 秒级短超时
- `window.open(payload)`：
  - 必填：`config.title/config.width/config.height`
  - 可选：`config.url`（插件入口）、`config.pluginId`（插件标识）、`config.sessionId`（会话标识）
  - 当 `url` 为本地 HTML 路径时由主机加载本地入口；为 `http(s)/file/chips` URL 时按 URL 方式加载
  - 当调用方未显式提供 `config.chrome.backgroundColor` 且窗口不是透明窗口时，Host 会从当前主题 token 中推导原生窗口背景
- `dialog.saveFile(options)`：
  - 桥接到主机动作：`platform.dialogSaveFile`
  - `defaultPath` 仅作为系统保存对话框的默认文件名/位置建议，不得绕过用户确认直接返回
  - 用户取消时返回 `null`
  - 该类交互式对话框必须使用人工操作级 Host 路由超时，不能使用 2 秒级短超时
- `plugin.install(payload)`：
  - 入参字段：`manifestPath`（兼容字段名）
  - 支持路径类型：插件目录、`.cpk` 包、`manifest.yaml/yml/json` 清单文件
  - 安装后由主机统一落库存储到主机插件目录
  - 当同一工作区内已存在相同 `pluginId` 时，新的安装会正式替换旧安装副本，而不是保留重复记录
  - 替换安装后，Host 必须继续使用主机工作区中的落库副本作为唯一运行时来源，不得回退到源工程路径直接加载
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

### 3.2 module 运行时治理补充基线

- 模块插件正式定位为 Host 托管的无界面能力模块。
- Host 对外公开的模块动作使用 capability + method 模型：
  - `module.listProviders`
  - `module.resolve`
  - `module.invoke`
  - `module.job.get`
  - `module.job.cancel`
- 调用方必须通过正式模块服务使用模块能力，不得直接 import 模块源码。
- Host 必须管理统一模块调用框架，包括 provider 发现、默认 provider 解析、权限校验、schema 校验、调用调度、job 管理和审计日志。
- 模块之间相互调用时，仍然必须复用同一套模块服务动作，不允许出现模块直连旁路。
- Host 注入给模块的正式运行时上下文冻结为：
  - `ctx.host.invoke(action, payload?)`
  - `ctx.module.invoke(...)`
  - `ctx.module.job.get/cancel(...)`
  - `ctx.job.reportProgress(...) / ctx.job.isCancelled() / ctx.job.signal`
- `ctx.host.invoke(...)` 用于访问 Host 正式公开的非模块动作，继续走权限、schema、日志与审计治理。
- 模块不得通过 `ctx.host.invoke(...)` 调用 `module.*`，避免模块能力调用面分叉。
- Host 不再把 `ctx.services.*` 作为模块运行时正式主链路。
- 旧 `module.mount/unmount/query/list` 页面挂载式模块口径不再作为未来正式外部接口保留。

### 3.3 card.render（L9 统一渲染入口）补充基线

- 动作：`card.render`
- 必填入参：
  - `cardFile: string`
- 可选入参：
  - `options.target`: `app-root | card-iframe | module-slot | offscreen-render`
  - `options.viewport`: `{ width?, height?, scrollTop?, scrollLeft? }`
  - `options.verifyConsistency`: `boolean`
  - `options.themeId`: `string`
  - `options.locale`: `string`
- 入参校验规则（Host schema）：
  - `options.target` 必须属于白名单目标值，非法值直接返回 `SCHEMA_VALIDATION_FAILED`。
  - `options.viewport.width/height`（若提供）必须为大于 0 的有限数值。
  - `options.viewport.scrollTop/scrollLeft`（若提供）必须为有限数值。
  - `options.verifyConsistency`（若提供）必须为布尔值。
  - `options.themeId/options.locale`（若提供）必须是非空字符串。
- 运行时语义：
  - `options.themeId` 用于本次调用级别的主题覆盖，不改变 Host 当前全局主题状态；
  - `options.locale` 用于本次调用级别的语言覆盖，不改变 Host 当前全局语言状态；
  - 当 `options.locale` 不存在于 Host 已注册语言表时，返回 `I18N_LOCALE_NOT_FOUND`。
- 响应 `view` 建议字段：
  - `title: string`
  - `body: string`（适配器提交后的 HTML）
  - `documentUrl: string`（Host 托管的正式文档入口 URL）
  - `sessionId: string`（render session 唯一标识，用于后续释放）
  - `contentFiles: string[]`
  - `target: string`
  - `semanticHash: string`
  - `diagnostics?: RenderNodeDiagnostic[]`
  - `consistency?: RenderConsistencyResult`

补充约束：

- `documentUrl` 是供 SDK / 应用层直接挂载到 iframe 的正式入口，不保证固定为 `file://`；
- Electron Host 当前正式可以返回受控渲染协议 URL，用于托管 render session 文档和卡片根目录资源；
- 当 `view.sessionId` 存在时，调用方销毁 iframe 或结束会话后，必须调用 `card.releaseRenderSession(sessionId)` 回收渲染会话。

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

### 3.4 card.resolveDocumentPath（渲染文档落点解析）

- 动作：`card.resolveDocumentPath`
- 必填入参：
  - `documentUrl: string`
- 响应字段：
  - `path: string`
- 运行时语义：
- 把 Host 托管的渲染文档 URL 解析回当前设备上的绝对文件路径；
- 同时适用于 `card.render` 返回的 `documentUrl`，以及该文档内部继续引用的受控卡片根目录资源 URL；
- 当前 Host 必须同时支持 `file://` 与受控渲染协议 URL（当前为 `chips-render://`）。

### 3.5 resource.open（统一资源打开入口）

- 动作：`resource.open`
- 必填入参：
  - `resource.resourceId: string`
- 可选入参：
  - `intent: string`
  - `resource.mimeType: string`
  - `resource.title: string`
  - `resource.fileName: string`
- 响应字段：
  - `result.mode: 'plugin' | 'shell' | 'external'`
  - `result.pluginId?: string`
  - `result.windowId?: string`
  - `result.matchedCapability?: string`
  - `result.resolved.resourceId: string`
  - `result.resolved.filePath?: string`
  - `result.resolved.mimeType?: string`
  - `result.resolved.extension?: string`
  - `result.resolved.fileName?: string`

运行时语义：

- `intent` 当前缺省按 `view` 处理；
- Host 优先匹配 `resource-handler:<intent>:<mime>`，其次匹配主类型通配能力，最后才回退 `file-handler:<ext>`；
- 命中应用插件时，Host 负责统一启动目标应用，并把 `launchParams.resourceOpen` 注入启动上下文；
- 当没有正式处理器时，Host 可以对本地文件回退 `shell.openPath(...)`，对外部 URL 回退 `shell.openExternal(...)`；
- 具体请求/响应结构与能力规则以 `生态共用技术文档/协议与契约/10-资源打开契约.md` 为准。

补充约束：

- 该动作面向受信任的模块插件与 Host 内部工具链，用于导出、离线化和调试治理；
- 应用层正常显示链路仍然必须直接消费 `documentUrl`，不得把 `card.resolveDocumentPath` 作为 iframe 装载前置步骤；
- 当传入 URL 无法映射到有效 render session 或受控卡片根目录时，Host 必须返回显式错误。

### 3.5 platform.renderHtmlToPdf / platform.renderHtmlToImage 补充基线

- `platform.renderHtmlToPdf`：
  - 入参：`{ htmlDir, entryFile?, outputFile, options? }`
  - 权限：`platform.read + file.read + file.write`
  - 语义：在 Host 受控离屏 BrowserWindow 中加载目录态 HTML 入口并输出 PDF
  - 约束：
    - `entryFile` 必须位于 `htmlDir` 内，禁止路径穿越；
    - Host 负责等待页面稳定、调用 Electron PDF 导出能力并写入 `outputFile`；
    - 页面稳定至少包含：文档完成、图片与字体可用、复合卡片 iframe 文档加载完成、基础卡片高度上报与 iframe 高度同步完成、复合卡片 `ready/resize` 稳定；
    - 该能力只允许 Host 内部访问 Electron，模块和应用不能自行 `import("electron")` 旁路。
- `platform.renderHtmlToImage`：
  - 入参：`{ htmlDir, entryFile?, outputFile, options? }`
  - 权限：`platform.read + file.read + file.write`
  - 语义：在 Host 受控离屏 BrowserWindow 中加载目录态 HTML 入口并输出图片
  - 约束：
    - `entryFile` 必须位于 `htmlDir` 内，禁止路径穿越；
    - Host 负责等待页面稳定、调用 Electron 页面截图能力并写入 `outputFile`；
    - 页面稳定至少包含：文档完成、图片与字体可用、复合卡片 iframe 文档加载完成、基础卡片高度上报与 iframe 高度同步完成、复合卡片 `ready/resize` 稳定；
    - 当前正式输出格式为 `png | jpeg`；当运行时不支持请求格式时返回 `PLATFORM_UNSUPPORTED`。

### 3.5 card.pack / card.unpack / card.readMetadata 补充基线

- `card.pack`：
  - 入参：`{ cardDir, outputPath }`
  - 权限：`card.write`
  - 语义：把目录态卡片打包为正式 ZIP Store `.card`
  - 约束：必须刷新 `structure.yaml manifest.*` 与 `metadata.file_info.*`
- `card.unpack`：
  - 入参：`{ cardFile, outputDir }`
  - 权限：`card.read`
  - 语义：把正式 `.card` 恢复为目录态卡片
- `card.readMetadata`：
  - 入参：`{ cardFile }`
  - 权限：`card.read`
  - 语义：直接读取 `.card/metadata.yaml`，不要求调用方先完整解包

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
