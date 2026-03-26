# {{ DISPLAY_NAME }}

> 通过 `chips-scaffold-basecard` 生成的标准基础卡片插件工程。

## 简介

本插件工程实现了一个基础卡片插件（`type: card`），用于演示如何：

- 在查看器中渲染基础卡片内容，并消费 Host 注入的主题 CSS；
- 在编辑引擎中提供编辑面板，编辑基础卡片配置；
- 通过 `basecardDefinition` 同时对接 Host 通用链路与官方编辑引擎运行时；
- 使用 YAML 配置文件保存基础卡片数据；
- 使用多语言文案与基础错误处理。

## 项目结构

```text
{{ PROJECT_NAME }}/
├─ .eslintrc.cjs          # 工程级 ESLint 配置（供 chipsdev lint 调用）
├─ manifest.yaml          # 插件清单（type: card）
├─ package.json           # NPM 配置
├─ tsconfig.json          # TypeScript 配置
├─ chips.config.mjs       # chips dev 构建配置
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

在开发模式下，使用 `chips dev server` 启动本地开发环境，根据 `chips dev` 工具文档在 Host 工作区中加载插件进行调试。

## 配置结构

基础卡片配置类型在 `src/schema/card-config.ts` 中定义，对应 YAML 文件示例位于 `templates/default-card-config.yaml`。

参数表与填写说明见 `templates/parameters.md`。

当前模板默认内置：

- React 渲染与编辑运行时
- `normalizeBasecardConfig()` / `validateBasecardConfig()` 统一归一与校验基线
- `renderBasecardView()` / `renderBasecardEditor()` / `basecardDefinition` 正式入口
- `card_type/theme/title/body/locale` 正式配置模型

## 正式入口契约

模板生成工程默认在 `src/index.ts` 中导出：

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
- 基础卡片插件不得自行硬编码整套卡片主题色板，视觉风格应优先来自当前生效主题包。
