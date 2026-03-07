# Token 与主题对接标准

## 1. 统一 token 层级

生态统一采用五层 token：`ref/sys/comp/motion/layout`。

- 组件消费顺序：`comp -> sys -> ref`
- 动效与布局由 `motion/layout` 独立管理

## 2. 作用域链

主题权重链（低 -> 高）：`global -> app -> box -> composite-card -> base-card -> component`。

最小组件（`component`）权重最高。解析时从高权重层开始，当前层未定义则逐层向上查找到低权重层。
逐 key 解析，不做整包强覆盖。

## 3. 组件 token 命名

- 当前已交付组件：
  - `chips.comp.button.*`
  - `chips.comp.input.*`
  - `chips.comp.checkbox.*`
  - `chips.comp.radio.*`
  - `chips.comp.switch.*`
  - `chips.comp.select.*`
  - `chips.comp.dialog.*`
  - `chips.comp.popover.*`
  - `chips.comp.tabs.*`
  - `chips.comp.menu.*`
  - `chips.comp.tooltip.*`
  - `chips.comp.form-field.*`
  - `chips.comp.form-group.*`
  - `chips.comp.virtual-list.*`
  - `chips.comp.data-grid.*`
  - `chips.comp.tree.*`
  - `chips.comp.date-time.*`
  - `chips.comp.command-palette.*`
  - `chips.comp.split-pane.*`
  - `chips.comp.dock-panel.*`
  - `chips.comp.inspector.*`
  - `chips.comp.panel-header.*`
  - `chips.comp.card-shell.*`
  - `chips.comp.tool-window.*`
  - `chips.comp.error-boundary.*`
  - `chips.comp.loading-boundary.*`
  - `chips.comp.notification.*`
  - `chips.comp.toast.*`
  - `chips.comp.empty-state.*`
  - `chips.comp.skeleton.*`
  - `chips.comp.card-cover-frame.*`
  - `chips.comp.composite-card-window.*`
- 后续组件保持同一命名形态：`chips.comp.<component-name>.*`

组件 token 必须可追溯到 `sys` 层语义 token，不允许直接绑定业务名。

## 4. 主题包约束

- 必须完整实现所声明组件的 token 覆盖
- 必须通过 token 完整性校验
- 必须通过对比度与动效安全校验
- 必须保持组件结构不变（仅改视觉）

## 5. 运行时接口

主题运行时固定动作：

- `theme.list`
- `theme.apply`
- `theme.getCurrent`
- `theme.getAllCss`
- `theme.resolve`
- `theme.contract.get`

组件库主题消费侧建议统一接口：

- `createScopedTokenResolver({ scopes, fallbackTokens, onDiagnostic })`
- `useToken(tokenKey)`
- `useComponentTokens(componentScope)`
- `theme.changed` 事件订阅后执行变量级刷新
- 大范围变量更新使用分片注入（`applyThemeVariablesInBatches`）并输出诊断事件

## 6. 失败回退

- token 缺失：回退默认 token 并输出告警
- 主题解析失败：回退默认主题
- 契约不匹配：阻断主题应用
