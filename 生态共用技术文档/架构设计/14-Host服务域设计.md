# Host服务域设计

> **版本**：vNext 已落地口径  
> **层级**：L3 Host Services  
> **当前实现状态**：19 个服务域已在 Host 中注册

## 架构归属声明（2026-04-08）

- Host 服务域位于 Kernel 之上、插件运行时之下。
- 服务域只能通过 Kernel 路由对外暴露能力。
- 服务域不得直接暴露平台实现细节，平台差异必须继续收敛到 PAL。

## 1. L3 定位

| 层级 | 名称 | 核心职责 | 允许依赖 | 禁止依赖 |
|---|---|---|---|---|
| L2 | Host Kernel | 路由、事件、生命周期、权限上下文 | PAL | 页面 UI |
| L3 | Host Services | 资源、配置、插件、模块、surface 等正式动作 | Kernel + PAL | 页面 UI |

## 2. 当前服务域清单（19个）

| 序号 | 服务域 | 说明 |
|---|---|---|
| 1 | `file` | 文件读写、枚举、拷贝、移动 |
| 2 | `resource` | 资源解析、读取、统一打开、受控资源格式转换 |
| 3 | `config` | 配置治理 |
| 4 | `theme` | 主题管理 |
| 5 | `i18n` | 多语言管理 |
| 6 | `surface` | 跨平台界面容器主语义 |
| 7 | `transfer` | 打开、导出、分享、定位文件 |
| 8 | `association` | 文件关联 / URL 打开入口治理 |
| 9 | `window` | 桌面窗口兼容别名 |
| 10 | `plugin` | 插件安装、启停、查询、应用启动 |
| 11 | `module` | 模块 provider、调用、任务管理 |
| 12 | `platform` | 平台信息、能力快照、屏幕、电源、离屏导出 |
| 13 | `log` | 日志查询与导出 |
| 14 | `credential` | 凭证治理 |
| 15 | `card` | 卡片解析、渲染、封面、编辑器、会话释放 |
| 16 | `box` | 箱子会话与条目治理 |
| 17 | `zip` | ZIP 压缩与解压 |
| 18 | `serializer` | 序列化与校验 |
| 19 | `control-plane` | 健康检查、指标、诊断 |

## 3. 本轮新增的正式主语义

### 3.1 `surface`

`surface` 已成为新的跨平台界面容器主语义。

正式动作：

- `surface.open`
- `surface.focus`
- `surface.resize`
- `surface.setState`
- `surface.getState`
- `surface.close`
- `surface.list`

当前关键语义：

- `surface.open(target=plugin)` 会创建正式插件会话并调用 PAL `surface.open()`
- 对于 `target=plugin`，当前还要求 `plugin.manage`
- `surface.opened` 是新的统一容器事件

### 3.2 `transfer`

正式动作：

- `transfer.openPath`
- `transfer.openExternal`
- `transfer.revealInShell`
- `transfer.share`

### 3.3 `association`

正式动作：

- `association.getCapabilities`
- `association.openPath`
- `association.openUrl`

## 4. Legacy 服务说明

### 4.1 `window`

`window` 当前保留，用于桌面兼容链路。

它的本质已经退化为：

- `surface(kind=window)` 的兼容别名

新的跨平台能力不得继续优先设计到 `window.*`。

### 4.2 `platform`

`platform` 当前只保留平台原语与离屏导出：

- `getInfo`
- `getCapabilities`
- `getScreenInfo`
- `listScreens`
- `powerGetState`
- `powerSetPreventSleep`
- `renderHtmlToPdf`
- `renderHtmlToImage`

同时保留一组 Bridge alias 对应动作：

- `platform.dialog*`
- `platform.clipboard*`
- `platform.shell*`
- `platform.notificationShow`
- `platform.tray*`
- `platform.shortcut*`
- `platform.ipc*`

## 5. 插件与模块相关服务

### 5.1 `plugin`

当前重点动作：

- `plugin.list`
- `plugin.get`
- `plugin.getSelf`
- `plugin.getCardPlugin`
- `plugin.getLayoutPlugin`
- `plugin.install`
- `plugin.enable`
- `plugin.disable`
- `plugin.uninstall`
- `plugin.launch`
- `plugin.getShortcut`
- `plugin.createShortcut`
- `plugin.removeShortcut`
- `plugin.query`

### 5.2 `module`

当前重点动作：

- `module.listProviders`
- `module.resolve`
- `module.invoke`
- `module.job.get`
- `module.job.cancel`

模块插件继续通过 capability + method 暴露能力，不得直接互相 `import`。

### 5.3 `resource`

当前 `resource` 命名空间正式收口以下动作：

- `resource.resolve`
- `resource.open`
- `resource.readMetadata`
- `resource.readBinary`
- `resource.convertTiffToPng`

其中：

- `resource.convertTiffToPng` 用于把本地 TIFF 资源归一化为 PNG 文件；
- 该动作仍属于 Host 资源服务，不新增新的服务域；
- 实际平台差异继续收敛到 PAL，服务层只负责输入校验、资源语义和错误归一；
- 对调用方公开的正式细节以下沉文档 `生态共用技术文档/协议与契约/11-资源图像转换契约.md` 为准。

## 6. 重要事件语义

当前服务层重点事件：

- `theme.changed`
- `plugin.init`
- `plugin.ready`
- `plugin.launched`
- `surface.opened`
- `window.opened`
- `module.runtime.started`
- `module.runtime.stopped`
- `module.job.completed`
- `module.job.failed`

## 7. 当前代码收口原则

1. 新的跨平台界面能力优先进入 `surface`。
2. 新的打开 / 下载 / 分享 / 定位文件能力优先进入 `transfer`。
3. 新的系统入口治理优先进入 `association`。
4. 不得继续把异质能力堆入 `platform`。
5. 不得在服务层直接引入平台实现对象。

## 8. 质量门禁

1. 服务域新增动作时，必须同步更新 route manifest、Bridge、SDK 和共享文档。
2. `window.*` 仅作为兼容入口存在，不再承担未来架构主语义。
3. `platform.getCapabilities()` 必须返回结构化快照，不能回退为字符串数组。
