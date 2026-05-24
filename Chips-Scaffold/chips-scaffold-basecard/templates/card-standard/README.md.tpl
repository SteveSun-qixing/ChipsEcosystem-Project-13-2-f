# {{ DISPLAY_NAME }}

> 标准基础卡片插件工程。

## 简介

本插件工程实现了一个基础卡片插件（`type: card`），用于演示如何：

- 在查看器中渲染基础卡片内容，并消费 Host 注入的主题 CSS；
- 在编辑引擎中提供编辑面板，编辑基础卡片配置；
- 通过 `basecardDefinition` 同时对接 Host 通用链路与官方编辑引擎运行时；
- 使用 YAML 配置文件保存基础卡片数据；
- 使用 `@chips/component-library`、主题 token、多语言文案与基础错误处理。

## 项目结构

```text
{{ PROJECT_NAME }}/
├─ .eslintrc.cjs          # 工程级 ESLint 配置（供 chipsdev lint 调用）
├─ manifest.yaml          # 插件清单（type: card）
├─ package.json           # NPM 配置
├─ tsconfig.json          # TypeScript 配置
├─ chips.config.mjs       # chipsdev 构建配置
├─ src/
│  ├─ index.ts            # 插件入口（注册渲染与编辑模块）
│  │                      # 同时导出 basecardDefinition 正式契约
│  ├─ render/
│  │  ├─ view.tsx         # 渲染模块：基础卡片视图
│  │  └─ runtime.ts       # 渲染运行时挂载逻辑
│  ├─ editor/
│  │  ├─ panel.tsx        # 编辑模块：编辑面板视图
│  │  └─ runtime.ts       # 编辑运行时挂载逻辑
│  ├─ schema/
│  │  └─ card-config.ts   # 配置 Schema 与类型定义
│  └─ shared/
│     ├─ i18n.ts          # 多语言取词工具
│     └─ utils.ts         # 渲染与编辑共享工具函数
├─ config/
│  └─ logging.ts          # 日志封装
├─ i18n/
│  ├─ zh-CN.json          # 中文文案
│  └─ en-US.json          # 英文文案
├─ templates/
│  ├─ default-card-config.yaml  # 默认基础卡片配置模板
│  └─ parameters.md       # 参数表与填写说明
├─ tests/
│  ├─ unit/
│  │  ├─ render-view.test.tsx
│  │  └─ editor-panel.test.tsx
│  └─ integration/
│     └─ card-flow.test.ts
└─ assets/
   └─ icons/
      ├─ basecard-icon.svg
      └─ SOURCE.md
```

## 快速开始

```bash
cd <生态根工作区>
npm install
cd {{ PROJECT_NAME }}
npm run dev
```

基础卡片工程中的 `chips-sdk` 与 `chipsdev` 统一依赖生态根工作区解析；请通过 `chipsdev create` 将工程接入工作区，不再单独在项目目录执行首次依赖安装。

在开发模式下，使用 `chipsdev server` 启动本地开发环境，并根据 chipsdev 开发者命令行手册在 Host 开发工作区中加载插件进行调试。

## 配置结构

基础卡片配置类型在 `src/schema/card-config.ts` 中定义，对应 YAML 文件示例位于 `templates/default-card-config.yaml`。

参数表与填写说明见 `templates/parameters.md`。

本工程默认内置：

- React 渲染与编辑运行时
- `@chips/component-library` 查看态、表单控件、错误态与布局原语
- `normalizeBasecardConfig()` / `validateBasecardConfig()` 统一归一与校验基线
- `collectBasecardResourcePaths()` 卡片根目录资源路径收集
- `renderBasecardView()` / `renderBasecardEditor()` / `basecardDefinition` 正式入口
- `card_type/theme/title/body/locale/resource_path` 正式配置模型

## 验证链路

生成工程默认提供以下正式脚本：

- `npm run lint`：通过 chipsdev 调用 ESLint；
- `npm run typecheck`：执行 TypeScript 严格类型检查；
- `npm test`：通过 chipsdev 调用 Vitest；
- `npm run build`：通过 chipsdev 生成插件构建产物；
- `npm run validate`：校验 Manifest、构建产物和正式资源；
- `npm run package`：按 Manifest 与构建产物生成 `.cpk` 插件包；
- `npm run verify`：串联上述所有默认门禁。

## 正式入口契约

本工程默认在 `src/index.ts` 中导出：

- `renderBasecardView(ctx)`：供 Host 通用查看链路与编辑引擎单卡 iframe 复用；
- `renderBasecardEditor(ctx)`：供 Host 托管编辑器与编辑引擎本地编辑面板复用；
- `basecardDefinition`：供编辑引擎运行时注册表消费插件元信息、归一/校验逻辑与渲染能力。

生成后请至少确认以下字段与清单保持一致：

- `basecardDefinition.pluginId === manifest.id`
- `basecardDefinition.cardType === manifest.capabilities.cardTypes[0]`
- 如需兼容历史卡片类型别名，请在 `aliases` 中显式声明，而不是把别名判断散落到业务组件里。
- `basecardDefinition.icon` 是运行时正式图标描述符；
- `assets/icons/basecard-icon.svg` 只作为静态资源保留，来源说明见 `assets/icons/SOURCE.md`。

## 主题接入约束

- Host 会在渲染阶段向基础卡片插件注入 `themeCssText`，模板默认会把该样式挂载到渲染容器中；
- 查看态不默认添加额外边框、阴影、圆角壳层，基础卡片外观由宿主装配层与主题包共同决定；
- 基础卡片插件不得自行硬编码整套卡片主题色板，视觉风格应优先来自当前生效主题包与组件库公开 contract。

## 多语言与组件库

- React 渲染期文案通过组件库 `createChipsI18nText()` 同步 adapter 读取本地语言包；
- 编辑态表单默认使用 `ChipsForm`、`ChipsTextField`、`ChipsTextArea` 和 `ChipsErrorState`；
- 查看态默认使用 `ChipsBox`、`ChipsStack` 和 `ChipsText`；
- 用户可见文案应写入 `i18n/zh-CN.json` 与 `i18n/en-US.json`，源码中只保存稳定 key。
