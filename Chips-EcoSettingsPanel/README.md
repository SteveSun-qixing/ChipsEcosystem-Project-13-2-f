# 生态设置面板

> 插件 ID：`com.chips.eco-settings-panel`  
> 工程来源：`chips-scaffold-app` 标准应用插件模板  
> 当前阶段：四个一级菜单与运行时治理主链路已落地，已通过自动化质量门禁，等待人工联调审核

## 项目定位

生态设置面板是薯片生态与 Host 的统一运行时设置入口，首版聚焦四个一级能力：

- 主题管理：安装、切换、卸载主题包，并展示当前生效主题。
- 多语言：列出已安装语言、切换当前语言、响应 `language.changed` 事件。
- 应用插件：安装、启用、停用、卸载应用插件，并展示运行时状态。
- 组件展示：基于薯片组件库真实组件构建 Bento 预览页，验证主题接入效果。

该工程当前已经完成应用壳层、主题管理、多语言、应用插件治理、组件展示页以及运行时适配层首版实现；后续迭代必须严格按 `需求文档/`、`技术文档/` 与 `开发计划/` 执行，不得保留模板示例思维或临时实现。

## 快速开始

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-EcoSettingsPanel
npm run dev
```

说明：

- 本工程依赖通过生态根工作区解析，不单独维护 `file:` 临时依赖。
- 运行态能力只能通过 Host Bridge / `chips-sdk` 调用，不允许直接越层访问 Host 内部模块。
- 主题、多语言、插件治理的正式接口口径以 `生态共用技术文档/协议与接口标准/07-运行时设置治理接口标准.md` 为准。

## 当前工程结构

```text
Chips-EcoSettingsPanel/
├─ manifest.yaml
├─ package.json
├─ chips.config.mjs
├─ index.html
├─ config/
├─ src/
├─ assets/
├─ i18n/
├─ tests/
├─ 需求文档/
├─ 技术文档/
└─ 开发计划/
```

## 交付约束

- 使用 React + `@chips/component-library` + `chips-sdk`。
- 严格接入主题系统与多语言系统，禁止业务层硬编码视觉值与界面文案。
- 不引入未审批的第三方库；状态管理、服务适配与测试优先使用现有生态能力与原生 React 方案。
- 如开发过程中发现生态契约缺口、组件缺失、SDK/Host 接口不可用，必须先登记 `项目日志与笔记/问题工单.md` 并停止继续推进对应功能。

## 执行入口

- `npm run dev`：启动开发服务器。
- `npm run build`：构建插件产物。
- `npm run typecheck`：执行严格 TypeScript 编译检查。
- `npm test`：执行测试。
- `npm run lint`：执行 ESLint。
- `npm run validate`：执行插件契约校验。
- `npm run verify`：串行执行 `lint -> typecheck -> test -> build -> validate`。

## 当前实现状态

- 已完成注册表驱动的设置壳层与四个一级菜单。
- 已切换为 Host 正式窗口契约驱动的 Electron 原生标题栏，不再在前端自绘窗口标题区。
- 已完成 `chips-sdk` 运行时服务适配层与错误归一化。
- 已完成主题/语言/应用插件治理的正式列表布局、详情弹窗、操作链路与事件刷新。
- 已完成组件展示注册表与当前正式组件分组接入。
- 已完成窄屏菜单切换器、左侧菜单精简与当前设置面板插件的自保护限制。
- 已将脚手架遗留的同名 `.js` 副本移入 `归档/`，工程源码基线统一收口为 TypeScript。
- 应用插件治理页当前优先展示 `PluginShortcutRecord.iconPath`，缺失时回退到正式运行时图标组件，不再显示 emoji 或路径字符串。
- 当前工程 `assets/icons/app-icon.ico`、`assets/icons/app-icon.icns`、`assets/icons/app-icon.png` 已与 `design-assets/Appicon/EcoSettingsPanel.*` 对齐。
