# Bridge API规范

## 文档定位

本文档定义页面侧 `window.chips.*` 的正式接口形状与主要语义。

它关注：

- Bridge 核心入口
- 子域 API
- 关键动作的入参与返回结构
- transport 无关的统一约束

它不定义：

- Desktop / Headless 的内部实现细节
- SDK 的具体封装代码
- Host 内部服务注册方式

## 1. 基本原则

1. 插件访问 Host 能力只能通过 `window.chips.*` 或 `chips-sdk` 正式入口。
2. Bridge API 的形状必须独立于具体 transport。
3. Host 返回的错误必须归一为标准错误对象。
4. 新的跨平台界面语义优先进入 `surface.*`，而不是继续扩展 `window.*`。

## 2. 核心入口

### 2.1 调用与事件

Bridge 核心入口冻结为：

- `invoke(action, payload?)`
- `invokeScoped(action, payload, { token })`
- `on(event, handler)`
- `once(event, handler)`
- `emit(event, data?)`
- `emitScoped(event, data, { token })`

动作名统一采用 `namespace.action` 形式，例如：

- `surface.open`
- `plugin.launch`
- `platform.getCapabilities`

### 2.2 当前正式子域

| 子域 | 说明 |
|---|---|
| `window` | 桌面窗口兼容别名 |
| `dialog` | 文件选择、保存、消息、确认 |
| `plugin` | 插件查询、启停、安装、快捷方式、应用启动 |
| `clipboard` | 剪贴板读写 |
| `shell` | 桌面 Shell 兼容别名 |
| `surface` | 跨平台界面容器主语义 |
| `transfer` | 打开路径、外链、在系统中定位、分享 |
| `association` | 文件关联 / URL 打开入口治理 |
| `platform` | 环境信息、能力快照、屏幕、电源、离屏导出 |
| `notification` | 通知 |
| `tray` | 托盘 |
| `shortcut` | 全局快捷键 |
| `ipc` | 本地高性能 IPC 通道 |

## 3. `surface` 子域

### 3.1 正式动作

- `surface.open(request)`
- `surface.focus(surfaceId)`
- `surface.resize(surfaceId, width, height)`
- `surface.setState(surfaceId, state)`
- `surface.getState(surfaceId)`
- `surface.close(surfaceId)`
- `surface.list()`

### 3.2 `surface.open`

当前 `surface.open` 的正式请求结构：

```ts
interface SurfaceOpenRequest {
  kind?: "window" | "tab" | "route" | "modal" | "sheet" | "fullscreen";
  target:
    | { type: "plugin"; pluginId: string; url?: string; launchParams?: Record<string, unknown> }
    | { type: "url"; url: string }
    | { type: "document"; documentId: string; title?: string; url?: string };
  presentation?: {
    title?: string;
    width?: number;
    height?: number;
    resizable?: boolean;
    alwaysOnTop?: boolean;
    chrome?: WindowChromeOptions;
  };
}
```

关键语义：

- `target.type = "plugin"` 时，Host 必须走正式插件会话初始化链路；
- 当前该场景除 `window.control` 外，还要求调用方具备 `plugin.manage`；
- Desktop 目前实际仍落为 `window`，若请求了其他 `kind`，PAL 会在返回的 `metadata` 中保留请求语义；
- `plugin.launch` 保留为 app 插件兼容入口，并复用同一底层实现。

补充说明：

- `window.chips.emit(event, data?)` 是页面向 Host 发送事件的正式入口；
- `file / resource / card / box / zip / module` 等服务能力当前通过 `window.chips.invoke("namespace.action", payload)` 或 `chips-sdk` 暴露，不额外扩展为新的 convenience 子域。

## 4. `transfer` 与 `association`

### 4.1 `transfer`

正式动作：

- `transfer.openPath({ path })`
- `transfer.openExternal({ url })`
- `transfer.revealInShell({ path })`
- `transfer.share({ input })`

返回结构：

- 前三者返回 `{ ack: true }`
- `transfer.share` 返回 `{ shared: boolean }`

`transfer.share` 在当前 PAL 不支持时，Host 必须返回显式错误，而不是静默成功。

### 4.2 `association`

正式动作：

- `association.getCapabilities()`
- `association.openPath({ path })`
- `association.openUrl({ url })`

`association.openPath` 当前可返回：

- 命中卡片 / 箱子 / 插件处理器的结果
- 回退到系统外部打开的结果

## 5. `platform` 子域

当前 `platform` 子域只保留平台原语与导出相关动作：

- `getInfo()`
- `getCapabilities()`
- `getScreenInfo()`
- `listScreens()`
- `powerGetState()`
- `powerSetPreventSleep(prevent)`
- `renderHtmlToPdf(...)`
- `renderHtmlToImage(...)`

Bridge 返回结构说明：

- `platform.getInfo()` 直接返回 `{ hostKind, platform, arch, release }`
- `platform.getCapabilities()` 直接返回结构化能力快照
- `platform.getScreenInfo()` 返回单个 `screen`
- `platform.listScreens()` 返回 `screens[]`

`getCapabilities()` 不再返回旧的字符串数组。

## 6. Legacy 子域说明

### 6.1 `window`

`window.*` 当前继续保留，主要用于桌面兼容链路。

正式动作：

- `window.open({ config })`
- `window.focus({ windowId })`
- `window.resize({ windowId, width, height })`
- `window.setState({ windowId, state })`
- `window.getState({ windowId })`
- `window.close({ windowId })`

它本质上是 `surface(kind=window)` 的兼容别名，不再是新增跨平台能力的首选入口。

### 6.2 `dialog / shell / tray / ipc`

这些 convenience 子域都会把 Host 返回结构解包为更直接的页面可用值。例如：

- `dialog.openFile()` 返回 `string[] | null`
- `dialog.saveFile()` 返回 `string | null`
- `tray.set()` 返回当前 `TrayState`
- `ipc.createChannel()` 返回 `PALIpcChannelInfo`

### 6.3 通过 `invoke()` 暴露的正式服务命名空间

当前 Bridge 页面侧还会通过 `invoke("namespace.action")` 访问以下正式服务域：

- `file.*`
- `resource.*`
- `card.*`
- `box.*`
- `zip.*`
- `module.*`

其中需要特别注意：

- `resource.open` 统一走 Host 资源处理器路由；
- `box.openView / box.renderLayoutFrame / box.renderLayoutEditor / box.openEntry` 已是箱子统一文档链路的正式动作；
- `zip.compress / zip.extract / zip.list` 是网页基础卡片等整包导入场景的正式 ZIP 能力；
- 这些动作属于 Host 服务命名空间，不应误写为 `window.chips.resource.*` 或 `window.chips.box.*` 直接子对象。

## 7. 启动上下文

Desktop preload 继续向页面暴露：

```ts
window.chips.platform.getLaunchContext()
```

返回：

```ts
{
  pluginId?: string;
  sessionId?: string;
  launchParams: Record<string, unknown>;
}
```

应用插件必须通过该入口读取真实启动来源，不得解析命令行或 Electron 私有对象。

## 8. 事件规范

Bridge 事件命名统一采用点语义，例如：

- `theme.changed`
- `plugin.ready`
- `surface.opened`
- `plugin.surface.resize`

禁止混用：

- `theme:changed`
- `theme-changed`

### 8.1 文档型 Surface 高度事件

当应用插件以文档流方式嵌入网页、路由页或其他可滚动宿主时，插件页面可以通过 `window.chips.emit("plugin.surface.resize", payload)` 向宿主发布文档级高度。该事件只描述当前插件文档希望宿主 surface 占用的块向高度，不替代 `surface.resize(surfaceId, width, height)` 这类 Host 容器尺寸动作。

正式载荷为：

```ts
interface DocumentSurfaceResizePayload {
  height: number;
  contentHeight: number;
  safeBlockStart?: number;
  safeBlockEnd: number;
  viewportHeight: number;
  reason: "initial" | "content-resize" | "asset-load" | "font-load" | "viewport-resize";
  stable: boolean;
}
```

字段语义：

- `height`：宿主应设置给文档 surface 的最终高度，必须已经包含阅读安全区。
- `contentHeight`：插件文档自身真实内容高度，不包含额外阅读安全区。
- `safeBlockStart`：发布方在块向起点保留的阅读安全区高度，用于避免宿主悬浮 chrome 遮挡内容。
- `safeBlockEnd`：发布方加入到块向末尾的阅读安全区高度。
- `viewportHeight`：插件发布事件时可见视口高度，用于宿主判断窗口缩放与响应式重排。
- `reason`：高度变化原因；未知内部来源必须归一为 `content-resize` 后再对外发布。
- `stable`：是否已经经过短暂稳定窗口确认。连续图片、字体或布局变化期间可先发布 `stable=false`，稳定后必须发布一次 `stable=true`。

文档型 surface 的高度发布方必须是最外层文档承载组件，而不是直接把内部卡片、基础卡片或子 iframe 的高度原样转发。发布方需要测量自身真实文档流，包括内部 iframe、加载态、宿主壳层和主题 token 驱动的底部阅读安全区。

滚动所有权约束：

- 文档型 surface 默认由宿主页面承担主滚动；
- 文档型插件壳层不得制造中间全窗滚动容器；
- 只有网页基础卡片、阅读器正文等内容本身需要局部浏览的组件，才可以在自己的受控区域内保留局部滚动。

调度要求：

- 高度变化应通过 `requestAnimationFrame` 合并；
- 图片、字体、异步资源和窗口缩放引发的连续变化应在约 120-180ms 安静窗口后发布 `stable=true`；
- 内容变高可以即时发布并撑开宿主，内容变短不应在 `stable=false` 阶段强制宿主剧烈收缩，避免用户阅读到底部时页面跳动；
- 宿主消费方应至少支持 `height` 字段，并在支持完整协议时按 `stable` 做收缩防跳处理。

### 8.2 宿主悬浮 Chrome 事件

当应用插件被嵌入 Web 文档型宿主，且固定定位 UI 需要脱离插件 iframe 绑定到宿主页面视口时，插件可以通过 `window.chips.emit("plugin.chrome.update", payload)` 发布通用悬浮 chrome 状态。宿主只渲染通用壳层控件，不理解卡片、箱子等业务语义。

正式载荷为：

```ts
interface PluginChromeUpdatePayload {
  title?: string;
  metaLines?: string[];
  back?: {
    label: string;
    enabled: boolean;
    handledByPlugin?: boolean;
  };
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
  }>;
  safeBlockStart?: number;
}
```

字段语义：

- `title`：宿主居中信息药丸主标题；
- `metaLines`：标题下方的短元信息，通常为创建日期等插件已经本地化后的文本；
- `back`：返回按钮状态；`handledByPlugin` 为 `true` 时宿主点击后只把动作回传插件，否则宿主可执行默认返回；
- `actions`：预留给插件未来扩展的通用动作按钮；
- `safeBlockStart`：插件希望宿主顶部悬浮 chrome 预留的块向安全空间。

宿主触发悬浮控件动作时，通过 `plugin.chrome.action` 回传：

```ts
interface PluginChromeActionPayload {
  actionId: string;
}
```

`plugin.chrome.*` 是通用应用插件宿主 chrome 协议，不得在社区页面或其他宿主内写入卡片查看器专属业务判断。

## 9. 质量门禁

1. Bridge 形状变化必须同步更新 Host、SDK、路由契约与共享文档。
2. 子域新增动作时，必须先明确权限、返回结构、错误模型和不支持语义。
3. 任何实现都不得绕过 `window.chips.*` 直接暴露原生能力给页面。
4. 通过 `invoke()` 暴露的正式服务命名空间，必须与 Bridge convenience 子域分开描述，避免对外形成两套冲突口径。
