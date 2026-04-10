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
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-task008-图标系统搭建
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

## 3. 正式运行边界

- 系统能力访问统一经 `chips-sdk` 与 `window.chips.*`，不直连 Host 内部实现。
- 基础卡片装配与编辑运行时统一经 `src/basecard-runtime/`。
- 箱子查看、布局渲染与布局编辑统一经 `Host box-service -> chips-sdk -> 编辑引擎壳层` 正式链路完成。
- 工作区、文件、资源、设置、主题与多语言统一经 `src/services/`、`src/context/` 与 Host 事件链路。
- 应用壳层 `index.html` 的 CSP 必须允许网页基础卡片正式使用的远程 `http/https` iframe；若目标站点自身拒绝 iframe 嵌入，再由网页基础卡片按正式错误态处理。

## 4. 目录概览

```text
Chips-EditingEngine/
├─ manifest.yaml
├─ package.json
├─ chips.config.mjs
├─ assets/
│  └─ icons/
├─ i18n/
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ basecard-runtime/   # 基础卡片描述符、注册表与装配运行时
│  ├─ components/         # 工具窗口、卡片窗口、文件管理器、设置面板等 UI
│  ├─ context/            # 编辑器、卡片、UI 等全局上下文
│  ├─ core/               # 核心初始化与业务底层逻辑
│  ├─ editor-runtime/     # 编辑宿主运行时
│  ├─ hooks/              # 运行时 hooks
│  ├─ icons/              # 运行时图标描述符与统一图标包装
│  ├─ layouts/            # InfiniteCanvas / Workbench 等布局
│  ├─ services/           # Bridge / SDK / 文件 / 工作区 / 箱子 等服务封装
│  ├─ types/
│  └─ utils/
└─ tests/
```

## 5. 图标系统

编辑引擎当前图标链路已经收口为正式实现：

- 运行时 UI 图标入口：`src/icons/descriptors.ts`
- 统一运行时组件：`src/icons/RuntimeIcon.tsx`
- 应用品牌图标组件：`src/icons/AppBrandIcon.tsx`
- 基础卡片、布局、工具窗口与菜单图标均使用 `IconDescriptor`

正式规则：

- 运行时 UI 图标统一走 `ChipsIcon + IconDescriptor`
- 不再保留 emoji、字符图标或 `icon: string`
- `manifest.yaml -> ui.launcher.icon` 只表示系统入口图标文件路径

## 6. 启动图标资产

- `manifest.yaml` 当前声明：`ui.launcher.icon: assets/icons/app-icon.ico`
- `assets/icons/app-icon.ico`、`assets/icons/app-icon.icns`、`assets/icons/app-icon.png` 已与 `design-assets/Appicon/EditingEngine.*` 对齐
- 资产来源说明见 `assets/icons/SOURCE.md`

这些文件属于操作系统入口图标，不属于运行时 `ChipsIcon` 图标模型。

## 7. 主题与多语言

- 主题运行时通过组件库 `ChipsThemeProvider` 与 Host 主题事件接入
- 多语言通过 `i18n/` 资源、`src/i18n/` 与运行时语言服务接入
- 业务层不得硬编码正式界面文案、颜色、尺寸与阴影

## 8. 相关说明

- 若公共图标契约、基础卡片装配标准或设置治理口径发生变化，应先更新 `生态共用技术文档/`
- 若项目文档与 `manifest.yaml`、真实代码冲突，以真实代码与正式共享文档为准
