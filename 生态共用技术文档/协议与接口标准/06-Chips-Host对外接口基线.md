# Chips Host 对外接口基线

> 文档状态：vNext 已落地基线  
> 更新时间：2026-04-08

## 1. 适用范围

本文档冻结以下对外边界：

- 页面侧 `window.chips.*`
- `chips-sdk` 对 Host 的正式封装面
- `chips-host` 包对生态其他工程公开的宿主装配入口
- Host 公开动作命名空间与关键事件语义

## 2. 对外入口分层

| 层级 | 对外入口 | 消费方 |
|---|---|---|
| L5 | `window.chips.*` | 应用插件、卡片宿主、主题宿主 |
| L6-L7 | `chips-sdk` / Runtime Client | 插件业务层、UI 层 |
| Host Package | `chips-host/main`、`chips-host/host-core`、`chips-host/desktop-host-shell`、`chips-host/headless-host-shell` | 社区服务器、宿主集成、工具链 |
| CLI | `chips` | 用户与自动化脚本 |

## 3. Host Package 导出基线

当前 `chips-host` 对外公开以下装配入口：

- `chips-host/main`
- `chips-host/host-core`
- `chips-host/desktop-host-shell`
- `chips-host/headless-host-shell`
- `chips-host/host-application`
- `chips-host/card-service`

语义说明：

- `HostCore`：不绑定平台壳层的 Host 核心装配
- `DesktopHostShell`：桌面正式宿主
- `HeadlessHostShell`：社区服务器 / CI / 后台任务宿主
- `HostApplication`：当前等价于 `DesktopHostShell` 的兼容别名

## 4. Bridge 子域基线

当前公共 Bridge 子域如下：

- `window`
- `dialog`
- `plugin`
- `clipboard`
- `shell`
- `surface`
- `transfer`
- `association`
- `platform`
- `notification`
- `tray`
- `shortcut`
- `ipc`

关键变化：

- `surface / transfer / association` 已成为正式新子域；
- `platform.getCapabilities()` 返回结构化能力快照；
- `window` 和 `shell` 继续保留，但属于 legacy 兼容层。

## 5. 公开服务命名空间

当前 Host 已公开的命名空间为：

- `file`
- `resource`
- `config`
- `theme`
- `i18n`
- `surface`
- `transfer`
- `association`
- `window`
- `plugin`
- `module`
- `platform`
- `log`
- `credential`
- `card`
- `box`
- `zip`
- `serializer`
- `control-plane`

## 6. 当前关键动作基线

### 6.1 `surface.*`

正式动作：

- `surface.open`
- `surface.focus`
- `surface.resize`
- `surface.setState`
- `surface.getState`
- `surface.close`
- `surface.list`

关键语义：

- `surface.open(target=plugin)` 会创建正式插件会话并调用 PAL `surface.open()`
- 该场景当前除 `window.control` 外，还要求 `plugin.manage`
- `surface.opened` 是新的统一容器事件

### 6.2 `plugin.launch`

`plugin.launch` 只用于 `type: app` 插件，并复用正式插件会话与 surface 启动链路。

当前返回：

```ts
{
  window: { id: string; chrome?: WindowChromeOptions };
  session: { sessionId: string; sessionNonce: string; permissions: string[] };
}
```

说明：

- 该返回结构保留了桌面兼容字段 `window`
- 新的跨平台主语义仍然推荐使用 `surface.open(target=plugin)`

### 6.3 `transfer.*`

正式动作：

- `transfer.openPath`
- `transfer.openExternal`
- `transfer.revealInShell`
- `transfer.share`

### 6.4 `association.*`

正式动作：

- `association.getCapabilities`
- `association.openPath`
- `association.openUrl`

### 6.5 `platform.*`

当前 `platform` 收口到平台原语与离屏导出：

- `platform.getInfo`
- `platform.getCapabilities`
- `platform.getScreenInfo`
- `platform.listScreens`
- `platform.powerGetState`
- `platform.powerSetPreventSleep`
- `platform.renderHtmlToPdf`
- `platform.renderHtmlToImage`

以及一组 Bridge legacy alias 对应动作：

- `platform.dialog*`
- `platform.clipboard*`
- `platform.shell*`
- `platform.notificationShow`
- `platform.tray*`
- `platform.shortcut*`
- `platform.ipc*`

### 6.6 `box.*` 统一文档链路补充

当前 `box` 命名空间已经正式公开以下统一文档链路动作：

- `box.listLayoutDescriptors`
- `box.readLayoutDescriptor`
- `box.normalizeLayoutConfig`
- `box.validateLayoutConfig`
- `box.getLayoutInitialQuery`
- `box.openView`
- `box.renderLayoutFrame`
- `box.renderLayoutEditor`
- `box.releaseRenderSession`
- `box.listEntries`
- `box.readEntryDetail`
- `box.renderEntryCover`
- `box.openEntry`
- `box.resolveEntryResource`
- `box.readBoxAsset`
- `box.prefetchEntries`
- `box.closeView`

关键约束：

- 布局描述符解析、布局配置归一/校验，以及查看态/编辑态文档生成，统一由 Host `box-service` 托管；
- `box.renderLayoutFrame` 与 `box.renderLayoutEditor` 返回的 `documentUrl` 是正式 iframe 入口，不允许上层退化为 `srcdoc` 或自行改写文档；
- `box.openEntry` 正式返回 `document-window | external`，并通过 `documentType` 区分打开的是卡片还是箱子；
- 通过 SDK `client.box.documentWindow.render` 或 `client.document.window.render` 创建的箱子查看文档，在销毁时必须释放 render session，并同步关闭对应 `box.openView` 查看会话。

## 7. 事件基线

当前重要对外事件：

- `theme.changed`
- `plugin.init`
- `plugin.ready`
- `plugin.launched`
- `surface.opened`
- `window.opened`
- `module.runtime.started`
- `module.runtime.stopped`

## 8. 当前宿主基线

当前已正式可用的宿主：

- Desktop Host Shell
- Headless Host Shell

当前已验证的 Headless 集成：

- 社区服务器 Host 集成使用 `HeadlessHostShell`

当前 Web / Mobile 仍属于目标宿主类型预留，相关 `runtime.targets`、`ui.surface.preferredKinds` 和 Bridge 形状已冻结，但当前仓内未交付对应 Shell 实现。

## 9. 质量门禁

1. 公开命名空间新增或变更时，必须同步更新 Bridge、SDK、Manifest 校验与共享文档。
2. 新的跨平台能力优先进入 `surface / transfer / association`，不得继续把异质能力堆入 `platform`。
3. 对外文档不得把 Electron 或 BrowserWindow 细节当作 Host 的公共语义。
