# 编辑引擎

> 插件 ID：`chips-official.editing-engine`  
> 插件类型：应用插件（`type: app`）  
> 工程角色：薯片生态正式卡片编辑引擎

## 1. 工程定位

编辑引擎是薯片生态当前的正式编辑工作台应用，负责：

- 打开与管理工作区；
- 装配基础卡片插件与布局插件；
- 提供工具窗口、卡片窗口、箱子窗口与工作台布局；
- 通过 Host / Bridge / `chips-sdk` 正式链路访问文件、配置、主题、多语言、插件与模块能力；
- 在运行时统一消费 `ChipsIcon + IconDescriptor` 图标系统，而不是 emoji 或字符串图标。

当前工程不是脚手架示例，不允许再按模板工程理解其目录、脚本与运行边界。

## 2. 快速开始

```bash
cd <生态工作区>
npm install
cd Chips-EditingEngine
npm run dev
```

常用命令：

- `npm run dev`：启动开发服务器
- `npm run run`：通过 `chipsdev run` 在真实 Host 开发链路中运行
- `npm run build`：构建插件产物
- `npm test`：运行测试
- `npm run lint`：执行 ESLint
- `npm run validate`：执行插件契约校验

## 3. 应用框架结构

编辑引擎已经迁移到应用插件 vNext 基线：

- `src/App.tsx`：轻量入口，只导出 `AppRoot`
- `src/app/`：`AppRoot -> AppProviders -> AppShell`
- `src/runtime/`：SDK client 单例、launch/surface context、Environment client、主题事件和启动动作
- `src/scenes/`：工作区场景注册与 `WorkspaceScene`
- `src/commands/`：Host command registry 元数据、状态派生和组件库命令消费入口

启动时会读取 Host `platform.getLaunchContext()`，合并 `surfaceContext.launchParams` 与顶层 `launchParams`，并把 `sceneId/surfaceId/sessionId/kind` 交给组件库 Environment 和应用运行时上下文。

## 4. 正式运行边界

- 系统能力访问统一经 `chips-sdk` 与 `window.chips.*`，不直连 Host 内部实现。
- 基础卡片装配与编辑运行时统一经 `src/basecard-runtime/`。
- 箱子查看、布局渲染与布局编辑统一经 `Host box-service -> chips-sdk -> 编辑引擎壳层` 正式链路完成。
- 工作区、文件、资源、设置、主题与多语言统一经 `src/services/`、`src/context/` 与 Host 事件链路。
- 基础卡片查看态 `openResource(...)` 由复合卡片窗口统一转成 `client.resource.open(...)`，基础卡片 iframe 不直接启动其他应用。
- 菜单、工具栏、命令面板、快捷键和文件右键菜单共享同一组 Host command definition，不各自绑定业务函数。
- 应用壳层 `index.html` 的 CSP 必须允许网页基础卡片正式使用的远程 `http/https` iframe；若目标站点自身拒绝 iframe 嵌入，再由网页基础卡片按正式错误态处理。

## 5. 目录概览

```text
Chips-EditingEngine/
├─ manifest.yaml
├─ package.json
├─ chips.config.mjs
├─ assets/
│  └─ icons/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ app/                # AppRoot / AppProviders / AppShell
│  ├─ basecard-runtime/   # 基础卡片描述符、注册表与装配运行时
│  ├─ commands/           # Host command registry 接入
│  ├─ components/         # 工具窗口、卡片窗口、文件管理器、设置面板等 UI
│  ├─ context/            # 编辑器、卡片、UI 等全局上下文
│  ├─ core/               # 核心初始化与业务底层逻辑
│  ├─ editor-runtime/     # 编辑宿主运行时
│  ├─ hooks/              # 运行时 hooks
│  ├─ icons/              # 运行时图标描述符与统一图标包装
│  ├─ layouts/            # InfiniteCanvas / Workbench 等布局
│  ├─ runtime/            # SDK client / Environment / launch / boot
│  ├─ scenes/             # WorkspaceScene 与 scene registry
│  ├─ services/           # Bridge / SDK / 文件 / 工作区 / 箱子 等服务封装
│  ├─ types/
│  └─ utils/
└─ tests/
```

## 6. 基础卡片与箱子链路

基础卡片链路：

- 注册表统一加载内置描述符与 Host 已安装启用的卡片插件 `basecardDefinition`
- `BasecardFrameHost` 为每个基础卡片创建透明单卡 iframe，并注入主题 CSS、资源解析、资源释放和资源打开回调
- `EditorHost + EditorSessionStore` 承载编辑面板、草稿、校验、资源导入、ZIP 目录导入、TIFF 转 PNG、删除意图和提交节流
- `CardService` 是解包态 `.card/` 的唯一真实数据源，保存时重建 `metadata.yaml / structure.yaml / content/*.yaml / manifest.resources`

箱子链路：

- `.box` 打开、解包、布局描述符读取、配置归一、布局预览、编辑面板和重新打包都走 SDK `client.box.*`
- 条目列表移动、拖入、删除后会重建 `layoutHints.sortKey`，保证保存再打开后的显示顺序与编辑面板顺序一致
- 箱子布局编辑器 iframe 的重挂载条件只来自布局类型、条目身份序列和语言等结构性输入

## 7. 图标系统

编辑引擎当前图标链路已经收口为正式实现：

- 运行时 UI 图标入口：`src/icons/descriptors.ts`
- 统一运行时组件：`src/icons/RuntimeIcon.tsx`
- 应用品牌图标组件：`src/icons/AppBrandIcon.tsx`
- 基础卡片、布局、工具窗口与菜单图标均使用 `IconDescriptor`

正式规则：

- 运行时 UI 图标统一走 `ChipsIcon + IconDescriptor`
- 不再保留 emoji、字符图标或 `icon: string`
- `manifest.yaml -> ui.launcher.icon` 只表示系统入口图标文件路径

## 8. 启动图标资产

- `manifest.yaml` 当前声明：`ui.launcher.icon: assets/icons/app-icon.ico`
- `assets/icons/app-icon.ico`、`assets/icons/app-icon.icns`、`assets/icons/app-icon.png` 已与 `design-assets/Appicon/EditingEngine.*` 对齐
- 资产来源说明见 `assets/icons/SOURCE.md`

这些文件属于操作系统入口图标，不属于运行时 `ChipsIcon` 图标模型。

## 9. 主题、多语言与可访问性

- 主题运行时通过组件库 `ChipsThemeProvider` 与 Host 主题事件接入
- 多语言通过 `src/i18n/` 本地资源、`useTranslation` 与运行时语言服务接入
- 工作台、Dock、工具窗口、文件树和主编辑区接入 `@chips/a11y` 公共键盘模型、roving tabindex、ARIA 关系和焦点恢复
- 业务层不得硬编码正式界面文案、颜色、尺寸与阴影

## 10. 验证矩阵

任务030闭环时的正式验证基线：

```bash
cd Chips-EditingEngine
npm run lint
npm test
npm run build
npm run validate
```

真实素材回归覆盖 `ProductFinishedProductTestingSpace` 中的：

- `富文本基础卡片.card`
- `美食卡片成品/美食卡片-01-点心百宝盒.card`
- `美食网格箱子.box`

当前真实素材测试会校验 `.card/.box` ZIP Store 包核心入口、元数据、结构、内容 YAML、资源引用和箱子排序键。

## 11. 相关说明

- 若公共图标契约、基础卡片装配标准或设置治理口径发生变化，应先更新 `生态共用技术文档/`
- 若项目文档与 `manifest.yaml`、真实代码冲突，以真实代码与正式共享文档为准
