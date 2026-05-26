# 评分基础卡片插件

评分基础卡片插件（`chips.basecard.score`）用于在复合卡片中展示和编辑评分数据。插件通过 `chips-scaffold-basecard` 初始化，并按正式基础卡片插件契约导出 React 查看态、编辑态和 `basecardDefinition`，界面统一接入 `@chips/component-library`、主题 token 与本地 i18n。

## 当前能力

- 查看态支持四种样式：
  - `stars`：五分制星星评分
  - `hearts`：五分制爱心评分
  - `score`：数字分数
  - `progress`：进度条
- 星星与爱心样式固定五分制，未获得项为灰色，已获得项使用主题 token 色值。
- 数字分数与进度条样式提供 `total_score` 和 `score` 两个输入字段。
- 查看态使用 `ChipsRating / ChipsProgress / ChipsText`；编辑态使用 `ChipsSegmentedControl / ChipsRating / ChipsNumberInput / ChipsProgress`。
- 五分制评分支持点击和方向键、Home、End 键盘操作；进度样式输出正式 `role="progressbar"` 语义。
- 查看态不添加最外层描边、背景色或阴影，只渲染评分内容本身。
- 多语言：
  - `zh-CN`
  - `en-US`

## 正式入口

- `renderBasecardView(ctx)`：供 Host 通用查看链路与编辑引擎单卡 iframe 复用。
- `renderBasecardEditor(ctx)`：供 Host 托管编辑器与编辑引擎本地编辑面板复用。
- `basecardDefinition`：声明 `pluginId/cardType/aliases/icon`，并提供配置归一、校验、资源收集与渲染能力。

插件身份：

- 插件 ID：`chips.basecard.score`
- 基础卡片类型：`base.score`
- 配置别名：`ScoreCard`
- 入口：`dist/index.mjs`

## 配置模型

```yaml
card_type: "ScoreCard"
theme: ""
style: "stars"
score: 4
total_score: 5
locale: "zh-CN"
```

正式类型定义见 [src/schema/card-config.ts](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/src/schema/card-config.ts)，参数说明见 [templates/parameters.md](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/templates/parameters.md)。

## 目录结构

```text
score-BCP/
├─ manifest.yaml
├─ package.json
├─ src/
│  ├─ index.ts
│  ├─ editor/
│  ├─ render/
│  ├─ schema/
│  └─ shared/
├─ i18n/
├─ templates/
├─ docs/
├─ tests/
└─ assets/
```

## 开发与验证

在插件目录执行：

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run validate
npm run package
npm run verify
```

## 相关文档

- 需求规格：[docs/requirements/01-需求规格说明书.md](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/docs/requirements/01-需求规格说明书.md)
- 架构设计：[docs/technical/01-架构设计.md](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/docs/technical/01-架构设计.md)
- 数据模型：[docs/technical/02-数据模型设计.md](/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-worktree-20260523-161048/Chips-BaseCardPlugin/score-BCP/docs/technical/02-数据模型设计.md)
