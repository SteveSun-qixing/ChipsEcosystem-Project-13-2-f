# 卡片查看器 · Chips Card Viewer

> 仓库：`Chips-CardViewer`
> 插件类型：应用插件（`type: app`）
> 角色：`.card/.box` 正式查看入口与 Host 统一文档显示链路的应用套壳

## 1. 功能概述

卡片查看器用于：

- 接收卡片文件（`.card`）和箱子文件（`.box`）路径；
- 通过 SDK 调用 Host 统一文档显示链路；
- 在应用 surface 中承载 Host 返回的卡片复合 iframe 或箱子布局 iframe；
- 通过正式资源打开路由转发卡片或箱子内容中的资源打开意图；
- 跟随当前工作区主题和语言同步应用壳层、内容 iframe 与可访问性文案。

应用本身不负责 `.card/.box` 内部解析、基础卡片分发、模板编译、箱子布局插件装载或 iframe 拼接，这些逻辑全部由 Host 与 SDK 正式运行时完成。

## 2. 运行方式

```bash
cd <生态工作区>/Chips-CardViewer
npm install
npm run dev
```

真实 Host 窗口联调使用：

```bash
cd <生态工作区>/Chips-CardViewer
chipsdev run
```

开发态主题、插件和 Host 状态检查优先使用 `chipsdev`，不要手工改写 `.chips-host-dev`：

```bash
chipsdev plugin list
chipsdev theme current
chipsdev theme resolve
chipsdev doctor
```

## 3. 应用结构

当前工程采用应用插件 vNext 基线：

- `src/App.tsx` 只导出根组件；
- `src/app/AppProviders.tsx` 注入 `ChipsEnvironmentProvider`、`ChipsThemeProvider` 和 SDK client；
- `src/app/AppRuntimeProvider.tsx` 汇总 launch context、surface、scene、主题语言、打开目标和错误状态；
- `src/app/scene-registry.ts` 定义 `empty`、`document-file`、`hosted-document` 三类场景；
- `src/commands/` 维护可序列化 command metadata、`handlerId` 和插件侧事件消费；
- `src/components/CardWindow.tsx` 负责 `.card/.box` 文件显示容器；
- `src/components/HostedDocumentWindow.tsx` 负责 Host 已提供 `webDocumentUrl` 时的托管文档承载；
- `i18n/*.json` 是用户可见文案源头。

## 4. 显示链路

`.card/.box` 文件显示统一使用：

```ts
client.document.window.render({
  filePath,
  locale,
  mode: "view",
});
```

SDK 会根据文件类型分发：

- `.card` -> `client.card.compositeWindow.render(...)`
- `.box` -> `client.box.documentWindow.render(...)`

CardViewer 只消费返回的 `FrameRenderResult.frame` 并注册 SDK 事件：

- `client.document.window.onReady(...)`：内容 ready 后关闭加载态；
- `client.document.window.onError(...)`：处理整张文档 fatal 错误；
- `client.document.window.onNodeError(...)`：记录卡片节点非致命降级诊断；
- `client.document.window.onResourceOpen(...)`：转发到 `client.resource.open(...)`。

组件卸载、主题刷新或目标切换时，应用调用 SDK 返回的 `dispose()` 释放 render session 与 iframe 事件订阅。

## 5. 启动与文件入口

`manifest.yaml` 已声明：

- `capabilities: file-handler:.card`
- `capabilities: file-handler:.box`
- `ui.surface.defaultKind: window`
- `ui.launcher.displayName/icon`
- `command.read / command.write / command.invoke`

应用启动时读取 `client.platform.getLaunchContext()`：

- `launchParams.targetPath` 命中 `.card/.box` 时进入 `document-file` 场景；
- 不支持的文件类型显示 i18n 错误态，不触发渲染；
- `launchParams.webDocumentUrl` 进入 `hosted-document` 场景，用于承载 Host 已生成的托管文档 URL。

空启动时显示拖拽与打开文件入口。打开按钮通过命令系统触发 `com.chips.card-viewer.open-file`，再调用 `client.platform.openFile(...)` 选择本地文件。拖拽路径优先读取 `window.chips.platform.getPathForFile(file)`，仅在测试或运行环境提供 `file.path` 时回退。

## 6. 主题、语言与可访问性

- 应用壳层通过 `ChipsEnvironmentProvider` 和 `ChipsThemeProvider` 消费 Host 当前主题；
- 主题运行时缓存键变化后，`CardWindow` 会用同一文件和语言重新创建内容 iframe 渲染会话；
- 当前语言来自 Host/文档环境，应用同步更新 `html[lang]`、`html[dir]` 和本地 i18n 文案；
- 命令标题、菜单、工具栏、空态、错误态、加载态和 iframe 标题均来自 `i18n/*.json`；
- 加载态使用 `role="status"`，错误态使用 `role="alert"`，拖拽入口使用明确的 region 与描述关联。

## 7. 验证脚本

```bash
cd <生态工作区>/Chips-CardViewer
npm run lint
npm test
npm run build
npm run validate
```

当前测试矩阵覆盖：

- 空启动、按钮打开、拖拽入口和 unsupported file；
- `.card/.box` 统一 `document.window.render`；
- 真实 `.card/.box` 素材回归；
- ready、fatal error、node error、resource open 与 cleanup；
- `webDocumentUrl` 托管文档承载、sandbox、origin 与 surface resize；
- 命令 metadata、Host command registry 消费、菜单和工具栏；
- 主题刷新、语言同步、加载态/错误态可访问性。

## 8. 图标与快捷方式

`manifest.yaml` 通过 `ui.launcher.icon: assets/icons/app-icon.ico` 声明系统入口图标。Host 创建快捷方式时按平台解析 `assets/icons/app-icon.ico/.icns/.png`，该图标路径不进入运行时 `ChipsIcon` 图标模型。
