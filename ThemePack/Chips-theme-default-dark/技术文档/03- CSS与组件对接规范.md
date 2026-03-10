# CSS 与组件对接规范（Chips-theme-default-dark）

> 文档状态：实现对齐稿  
> 适用范围：`ThemePack/Chips-theme-default-dark/styles/*`

---

## 1. 设计原则

- **契约优先**：所有样式仅通过组件库约定的 `data-scope` / `data-part` / `data-state` 与 `chips.comp.*` token 对接，不依赖实现细节类名。
- **五层 token 驱动**：
  - 色彩与语义：`chips.sys.*`；
  - 组件视觉：`chips.comp.*`；
  - 动效：`chips.motion.*`；
  - 布局密度：`chips.layout.*`；
  - 少量派生变量在 `styles/base.css` 中声明（例如 `--chips-base-radius-md`），仅作为本主题内部复用。
- **简约优雅**：整体采用暗夜基线 + 单主色（冷调蓝色），阴影和圆角克制，避免复杂渐变与炫技动画。
- **无头组件适配**：组件库只输出结构与状态，本主题只负责：
  - 背景 / 边框 / 文本颜色；
  - 间距 / 圆角；
  - 基础过渡与聚焦样式。

---

## 2. 目录与文件划分

主题 CSS 文件按职责划分：

- 全局基线：
  - `styles/base.css`：全局字体、背景与派生变量。
  - `styles/motions.css`：通用淡入淡出动效。
- 组件样式：
  - `styles/components/button.css`：按钮（`button`）。
  - `styles/components/input.css`：输入框（`input`）。
  - `styles/components/form-controls.css`：选择控件（`checkbox`、`radio`、`switch`、`select`）。
  - `styles/components/overlays.css`：浮层组件（`dialog`、`popover`、`tooltip`、`command-palette`、`date-time`）。
  - `styles/components/layout-containers.css`：布局与容器组件（`tabs`、`menu`、`form-field`、`form-group`、`virtual-list`、`data-grid`、`tree`、`split-pane`、`dock-panel`、`inspector`、`panel-header`、`card-shell`、`tool-window`）。
  - `styles/components/feedback.css`：反馈与边界组件（`notification`、`toast`、`empty-state`、`skeleton`、`error-boundary`、`loading-boundary`、`card-cover-frame`、`composite-card-window`）。

`src/build-css.ts` 会按以下顺序拼接 CSS：

1. `styles/base.css`
2. `styles/components/*.css`（按文件名排序）
3. `styles/motions.css`

最终输出为 `dist/theme.css`。

---

## 3. data-scope / data-part / data-state 约定

本主题统一采用生态规定的组件契约挂点：

- `data-scope`：组件类型（如 `button`、`input`、`dialog`）。
- `data-part`：组件内部结构片段（如 `root`、`label`、`content`）。
- `data-state`：交互状态（`idle | hover | focus | active | disabled | loading | error`）。

典型示例（Button）：

```html
<button
  data-scope="button"
  data-part="root"
  data-state="idle"
>
  <span data-part="label">保存</span>
</button>
```

主题 CSS 始终以 `data-scope` + `data-part` 为基础选择器，必要时结合 `data-state` 或伪类（`:hover` / `:focus-visible` / `:active`）实现状态样式。

---

## 4. 组件与 token 映射（核心示例）

### 4.1 Button

- 结构：
  - `data-scope="button" data-part="root|label|spinner|status"`
- 核心 token：
  - `chips.comp.button.root.radius`
  - `chips.comp.button.root.surface.idle|hover|active|disabled`
  - `chips.comp.button.label.color.idle|disabled`
  - `chips.comp.button.focus.outline`
- 对应 CSS：

```css
[data-scope="button"][data-part="root"] {
  border-radius: var(--chips-comp-button-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-button-root-surface-idle);
  color: var(--chips-comp-button-label-color-idle);
}

[data-scope="button"][data-part="root"][data-state="hover"],
[data-scope="button"][data-part="root"]:hover {
  background-color: var(--chips-comp-button-root-surface-hover, var(--chips-comp-button-root-surface-idle));
}

[data-scope="button"][data-part="root"][data-state="disabled"],
[data-scope="button"][data-part="root"][aria-disabled="true"] {
  background-color: var(--chips-comp-button-root-surface-disabled);
  color: var(--chips-comp-button-label-color-disabled, var(--chips-comp-button-label-color-idle));
}

[data-scope="button"][data-part="root"][data-state="focus"],
[data-scope="button"][data-part="root"]:focus-visible {
  outline: 2px solid var(--chips-comp-button-focus-outline);
}
```

### 4.2 Input

- 结构：
  - `data-scope="input" data-part="root|control|status"`
- 核心 token：
  - `chips.comp.input.root.radius`
  - `chips.comp.input.root.surface.idle|focus`
  - `chips.comp.input.root.border.idle|error`
  - `chips.comp.input.value.color`
  - `chips.comp.input.placeholder.color`
- 对应 CSS（节选）：

```css
[data-scope="input"][data-part="root"] {
  border-radius: var(--chips-comp-input-root-radius, var(--chips-base-radius-md));
  background-color: var(--chips-comp-input-root-surface-idle);
  border: 1px solid var(--chips-comp-input-root-border-idle);
}

[data-scope="input"][data-part="root"][data-state="focus"],
[data-scope="input"][data-part="root"]:focus-within {
  background-color: var(--chips-comp-input-root-surface-focus, var(--chips-comp-input-root-surface-idle));
}

[data-scope="input"][data-part="control"] {
  color: var(--chips-comp-input-value-color, var(--chips-sys-color-on-surface));
}

[data-scope="input"][data-part="control"]::placeholder {
  color: var(--chips-comp-input-placeholder-color);
}
```

### 4.3 其他组件

所有其他组件均遵循相同模式：

- 使用 `COMPONENT_TOKEN_MAP` / 主题契约中声明的 `chips.comp.<component>.*` token；
- 在对应 CSS 文件中按 `data-scope="<component>"` / `data-part="..."` 映射到：
  - 背景（`surface.*`）；
  - 文本颜色（`text.color` / `label.color` 等）；
  - 边框与分隔线（`border.*` / `divider.color`）；
  - 焦点轮廓（`focus.outline`）。

---

## 5. 动效与布局

### 5.1 动效

- Token：
  - `chips.motion.duration.fast|normal`
  - `chips.motion.easing.standard`
- CSS 使用方式：

```css
.chips-fade-enter,
.chips-fade-exit {
  transition:
    opacity var(--chips-motion-duration-normal, 250ms)
      var(--chips-motion-easing-standard, cubic-bezier(0.4, 0, 0.2, 1));
}
```

仅提供轻量渐变，不包含复杂 keyframes 动画。

### 5.2 布局密度

- Token：
  - `chips.layout.density.comfortable`
  - `chips.layout.gap.md`
- 在本主题中，通过 `styles/base.css` 中的派生变量（如 `--chips-base-space-2/3/4`）抽象为常用内边距与间距，用于控制组件之间的距离。

---

## 6. 一致性与扩展约束

- 不新增新的 `chips.*` token 名称；如需新增，必须先在 `@chips/tokens` 与生态共用技术文档中完成设计。
- 如需新增组件样式：
  1. 在 `Chips-ComponentLibrary/packages/theme-contracts` 中补充组件契约；
  2. 在 `@chips/tokens` 中补充对应 `chips.comp.*` token；
  3. 在本主题包的 `tokens/comp/*.json` 中对齐；
  4. 在 `styles/components/*.css` 中实现样式；
  5. 视需要更新本文件的映射说明。
- 主题样式不得修改组件 DOM 结构，仅通过 CSS 控制视觉。
