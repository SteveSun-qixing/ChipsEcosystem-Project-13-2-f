# 富文本基础卡片插件

> 通过 `chips-scaffold-basecard` 生成的富文本基础卡片插件工程。

## 简介

本插件工程实现了一个面向富文本内容的基础卡片插件（`type: card`），用于演示如何：

- 在查看器中以正式 `RichTextCard` 配置模型渲染富文本正文；
- 在编辑引擎中提供富文本编辑面板（支持加粗、斜体、下划线等基础样式）；
- 通过 `basecardDefinition` 同时对接 Host 通用链路与官方编辑引擎运行时；
- 使用 YAML 配置文件保存 `card_type/theme/body/locale` 正式字段；
- 使用多语言文案与基础错误处理。

## 项目结构

```text
richtext-BCP/
├─ .eslintrc.cjs
├─ manifest.yaml
├─ package.json
├─ tsconfig.json
├─ chips.config.mjs
├─ src/
│  ├─ index.ts
│  ├─ render/
│  │  ├─ view.tsx
│  │  └─ runtime.ts
│  ├─ editor/
│  │  ├─ panel.tsx
│  │  └─ runtime.ts
│  ├─ schema/
│  │  └─ card-config.ts
│  └─ shared/
│     ├─ i18n.ts
│     └─ utils.ts
├─ config/
│  └─ logging.ts
├─ i18n/
│  ├─ zh-CN.json
│  └─ en-US.json
├─ templates/
│  ├─ default-card-config.yaml
│  └─ parameters.md
├─ tests/
│  ├─ unit/
│  │  ├─ render-view.test.tsx
│  │  └─ editor-panel.test.tsx
│  └─ integration/
│     └─ card-flow.test.ts
└─ assets/
   └─ icons/
      └─ basecard-icon.svg
```

## 快速开始

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd richtext-BCP
npm run dev
```

`chips-sdk`、`chipsdev` 与 ESLint 工具链统一通过生态根工作区解析；当前工程不再单独维护 sibling `file:` 依赖。

## 配置结构

富文本基础卡片配置类型在 `src/schema/card-config.ts` 中定义，示例配置位于 `templates/default-card-config.yaml`。

当前正式配置模型为：

- `card_type: "RichTextCard"`
- `theme?: string`
- `body: string`
- `locale?: string`

Schema 层统一提供：

- `normalizeBasecardConfig()`：把输入归一为正式 `RichTextCard` 配置；
- `validateBasecardConfig()`：执行正式校验基线，阻止空正文等无效输出。

## 正式入口契约

`src/index.ts` 当前同时导出以下正式能力：

- `renderBasecardView(ctx)`：供 Host 通用查看链路与编辑引擎单卡 iframe 复用；
- `renderBasecardEditor(ctx)`：供 Host 托管编辑器与编辑引擎本地编辑面板复用；
- `basecardDefinition`：供编辑引擎运行时注册表读取插件元信息、别名、归一/校验与渲染能力。

其中：

- `basecardDefinition.cardType = "base.richtext"` 与 `manifest.yaml -> capabilities.cardTypes` 保持一致；
- `aliases = ["RichTextCard"]` 负责兼容正式配置中的历史卡片类型别名；
- `createInitialConfig()` 生成编辑引擎新建基础卡片时的正式初始正文。

## 主题接入约束

- Host 会在渲染阶段注入 `themeCssText`，渲染运行时必须优先消费当前生效主题；
- 富文本基础卡片不得自行硬编码整套卡片视觉色板，所有结构样式应通过主题类名与变量落地。
