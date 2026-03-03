# Chips Host 对外接口基线

> 文档状态：vNext 对外接口基线稿（跨生态统一口径）
> 适用阶段：阶段18及后续开发实施阶段
> 目标：集中定义薯片主机对生态其他软件/插件/工具暴露的稳定接口边界。

---

## 0. 适用范围

本文档覆盖以下对外接口面：

- 插件与应用通过 `window.chips.*` 访问主机能力。
- SDK 对 Bridge API 的标准封装。
- `chips host` 命令行管理接口。
- 主机对外事件语义与错误语义。

不覆盖主机内部实现细节（内部细节见 `Chips-Host/技术文档`）。

---

## 1. 接口分层

| 层级 | 对外入口 | 消费方 |
|---|---|---|
| L5 | `window.chips.invoke/on/once/emit` + 子域 API | 插件、应用插件、主题插件 |
| L6 | Runtime Client（SDK 封装） | 插件业务层、UI Hooks |
| CLI | `chips host <command>` | 用户、运维脚本、自动化任务 |

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
- `window.open(payload)`：
  - 必填：`config.title/config.width/config.height`
  - 可选：`config.url`（插件入口）、`config.pluginId`（插件标识）、`config.sessionId`（会话标识）
  - 当 `url` 为本地 HTML 路径时由主机加载本地入口；为 `http(s)/file/chips` URL 时按 URL 方式加载
- `dialog.saveFile(options)`：
  - 桥接到主机动作：`platform.dialogSaveFile`
  - `defaultPath` 存在时返回该路径并确保目录可写
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

---

## 4. 事件与错误语义基线

## 4.1 事件语义

- 事件名必须使用点语义（例如 `theme.changed`、`plugin.enabled`）。
- 事件载荷建议包含：`id/name/source/data/timestamp/metadata`。

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

---

## 5. 权限基线

- 所有敏感动作必须走插件权限校验。
- 权限由插件 manifest 显式声明，未声明即拒绝。
- 高风险能力（凭证、外部打开、窗口控制）必须审计。
- 非幂等动作必须启用 requestId 去重窗口，避免重放写入。

---

## 6. CLI 对外接口基线

命令入口：`chips host`

公开命令域：

- 运行管理：`start/stop/status`
- 配置管理：`config list/set/reset`
- 运行观察：`logs/doctor`
- 文件入口：`open <target-file>`
- 插件管理：`plugin install/uninstall/list`
- 更新管理：`update check/install`

CLI 应满足：

- 支持脚本化调用与非交互执行。
- 支持 JSON 输出用于自动化集成。
- 命令失败返回非 0 状态码并输出标准错误信息。

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
