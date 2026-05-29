# 编辑引擎 vNext 架构说明

## 1. 文档定位

本文档记录 `Chips-EditingEngine` 项目内部实现边界。对外公开的基础卡片、箱子、命令、资源打开、主题和多语言契约以 `生态共用技术文档/` 为准。

## 2. AppRuntime 与 Scene

当前入口链路为：

```text
src/main.tsx
-> src/App.tsx
-> src/app/AppRoot.tsx
-> src/app/AppProviders.tsx
-> src/runtime/AppRuntimeProvider.tsx
-> src/app/AppShell.tsx
-> src/scenes/WorkspaceScene.tsx
```

实现规则：

- `src/App.tsx` 只作为轻量入口，不承载初始化和业务分发。
- `AppRuntimeProvider` 持有唯一 SDK client、Host launch context、组件库 Environment client、主题 Provider 和语言事件同步。
- `launch-context.ts` 合并 `surfaceContext.launchParams` 与顶层 `launchParams`，并以 `surfaceContext.sceneId/surfaceId` 优先。
- `boot-actions.ts` 负责基础卡片注册表同步、语言初始化、工作区初始化和默认工具窗口创建。
- `WorkspaceScene` 承载当前编辑器工作区场景，包括 InfiniteCanvas、Workbench、Dock、设置弹窗、卡片/箱子窗口分发和拖拽落点；应用窗口顶部不再挂载独立 Header 工具栏。

## 3. 命令系统

命令入口集中在 `src/commands/`：

- `editing-engine-commands.ts` 定义稳定 command id、handler id、scope、permission、菜单/工具栏位置、快捷键和运行态 state。
- `EditingEngineCommandProvider.tsx` 注册 Host command registry，并把 `ChipsCommandProvider` 注入组件树。
- FileManager、Dock、HistoryPanel 等 UI 只消费 command view 或 `invokeCommand(...)`。
- 应用窗口顶部不再发布 `workspace` 工具栏；工具栏 placement 只保留给文件管理器等具体工具面板。

约束：

- command 文案只保存 i18n key，不保存原始文案。
- 图标只使用 `IconDescriptor`。
- manifest 只声明 `command.read/write/invoke`，不声明 `command.manage`。
- 内部 `CommandManager` 只负责 undo/redo 历史，不是第二套 Host command registry。

## 4. 基础卡片装配与编辑会话

本项目内部采用“双运行时、单数据源”：

```text
显示链路：BasecardDescriptor -> BasecardFrameHost -> CompositeCardAssembler -> CardWindow
编辑链路：BasecardDescriptor.renderEditor -> EditorSessionStore -> EditorHost -> EditPanel
数据源：CardService 中的解包态 .card/ 数据
```

关键实现：

- `basecard-runtime/registry.ts` 加载内置 `base.richtext/base.image/base.webpage` 描述符，并通过 Host `plugin.query({ type: "card" })` 装载已安装启用卡片插件的 `basecardDefinition`。
- `BasecardFrameHost` 为每个基础卡片创建透明 iframe，注入主题 CSS、`resolveResourceUrl/releaseResourceUrl/openResource`。
- `CompositeCardAssembler` 按 `CardService.structure.basicCards` 顺序装配单卡 iframe，并汇总高度、加载态、错误态和资源打开事件。
- `EditorSessionStore` 管理 source/draft/validation/dirty/resourceOperations，资源导入或删除被正式配置引用时允许按节流窗口提交。
- `EditorHost` 为编辑器提供资源解析、导入、ZIP 目录导入、删除登记和 TIFF 转 PNG。

`openResource(...)` 在编辑引擎中的路径：

```text
基础卡片 renderView
-> BasecardFrameHost.openResource
-> CompositeCardAssembler.onResourceOpen
-> CardWindow.client.resource.open({ intent: "view", resource })
-> Host resource.open
```

基础卡片 iframe 只表达资源打开意图，不直接启动阅读器、图片查看器、音乐播放器或系统浏览器。

## 5. 卡片保存与资源生命周期

`CardService` 是 `.card` 解包态的唯一真实数据源。

保存规则：

- `metadata.yaml`、`structure.yaml`、`.card/cover.html`、`content/*.yaml` 由 `CardService.persistCard(...)` 统一重建。
- 基础卡片资源路径统一为卡片根目录相对路径，不写入 `content/`。
- `structure.yaml manifest.resources` 通过扫描卡片根目录重建，排除 `.card/` 与 `content/`。
- 封面资源统一写入 `.card/cardcover/`，保存时解析 cover HTML 中的 `src/href/poster/data-chips-cover-image-source/url(...)` 引用并清理未引用旧资源。
- 删除基础卡片或资源编辑器删除资源时先登记删除意图，最终保存阶段依据真实引用关系物理删除。

## 6. 箱子文档链路

`BoxDocumentService` 是编辑引擎中的箱子编辑会话管理器：

- 创建箱子时读取布局描述符并调用 `client.box.normalizeLayoutConfig(...)`。
- 打开箱子时通过 `client.box.unpack(...)` 解包到会话工作目录。
- 保存箱子时重写 `.box/metadata.yaml`、`.box/content.yaml`、`.box/structure.yaml`、`.box/cover.html`，再调用 `client.box.pack(...)`。
- 条目新增、拖拽、移动、删除后统一重建 `layoutHints.sortKey`，保证 `.box/structure.yaml` 的排序键与编辑面板顺序一致。
- 布局编辑器 iframe 的重挂载条件限定为布局类型、条目身份序列和语言等结构性输入，配置回写不会反复销毁编辑器。

## 7. 主题、多语言、焦点和 A11y

- 主题初始化通过组件库 `ChipsEnvironmentProvider` 与 `ChipsThemeProvider` 接入 Host 主题状态。
- 本地 `src/i18n/` 保存应用用户可见文案，Host 语言变化后由运行时更新当前 locale。
- 工作台、Dock、BaseWindow、ToolWindow、FileTree、MainArea、SidePanel 使用 `@chips/a11y` 的键盘与 roving tabindex 模型。
- UI 图标统一走 `RuntimeIcon -> ChipsIcon + IconDescriptor`。

## 8. 测试矩阵

正式脚本：

```bash
npm run lint
npm test
npm run build
npm run validate
```

重点测试文件：

- `tests/unit/app-runtime.test.ts`：launch/surface/Environment/boot 行为。
- `tests/unit/commands-definition.test.ts`：命令元数据、scope、权限和 i18n key。
- `tests/unit/basecard-frame-host.test.tsx`：单卡 iframe、资源 URL、资源打开、指针屏蔽和预览稳定性。
- `tests/unit/editor-session-store.test.ts`、`tests/unit/plugin-host.test.tsx`：编辑会话与资源操作。
- `tests/unit/card-files.test.ts`：卡片保存、封面资源和导出资源清单。
- `tests/unit/box-document-service.test.ts`、`tests/unit/box-editor-panel.test.tsx`：箱子保存、排序键和布局编辑器稳定性。
- `tests/unit/workbench-a11y.test.tsx`、`tests/unit/file-tree.test.tsx`、`tests/unit/base-window.test.tsx`：工作台、文件树和窗口可访问性。
- `tests/unit/real-materials-regression.test.ts`：成品测试空间真实 `.card/.box` 素材结构回归。
