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
      - `chips.comp.view.*`
      - `chips.comp.box.*`
      - `chips.comp.stack.*`
      - `chips.comp.inline.*`
      - `chips.comp.grid.*`
      - `chips.comp.section.*`
      - `chips.comp.scroll-view.*`
      - `chips.comp.spacer.*`
      - `chips.comp.divider.*`
      - `chips.comp.split-view.*`
      - `chips.comp.card-cover-frame.*`
      - `chips.comp.composite-card-window.*`
- 后续组件保持同一命名形态：`chips.comp.<component-name>.*`

组件 token 必须可追溯到 `sys`、`motion` 或 `layout` 层语义 token，不允许直接绑定业务名。
Theme Runtime 的正式引用解析顺序为 `ref -> sys -> motion/layout -> comp`，因此组件 token 可以引用 `chips.layout.*` 与 `chips.motion.*` 这类公共运行时 token。

布局原语 token 是正式组件 token 的一部分，主题包必须覆盖其契约声明的 key。当前布局原语的最小契约前缀包括：

- `chips.comp.view.*`
- `chips.comp.box.*`
- `chips.comp.stack.*`
- `chips.comp.inline.*`
- `chips.comp.grid.*`
- `chips.comp.section.*`
- `chips.comp.scroll-view.*`
- `chips.comp.spacer.*`
- `chips.comp.divider.*`
- `chips.comp.split-view.*`

布局原语只通过 token、CSS 变量和 `data-scope/data-part/data-state` 接收视觉实现；主题包不得通过选择业务页面结构或组件私有 DOM 层级来覆盖它们。

### 3.1 布局 token 基线

`chips.layout.*` 是布局原语、L9 布局计算、主题包和脚手架共同消费的结构 token 层。所有页面级和组件级布局常量默认使用 `cpx`，边框与焦点线宽等可见阈值保持 `px`。

当前正式布局 token 基线：

- `chips.layout.density.compact | comfortable | spacious`：常用控件密度高度，默认分别为 `32cpx / 40cpx / 48cpx`。
- `chips.layout.gap.xs | sm | md | lg | xl`：通用间距级别，默认分别为 `4cpx / 8cpx / 12cpx / 16cpx / 24cpx`。
- `chips.layout.size.grid-min-item`：响应式网格自动列的默认最小条目宽度，默认 `160cpx`。
- `chips.layout.size.split-primary-min`：两栏或主从布局主栏最小宽度，默认 `180cpx`。
- `chips.layout.size.split-secondary-min`：三栏布局中间栏最小宽度，默认 `220cpx`。
- `chips.layout.size.navigation-primary-min`：导航主栏最小宽度，默认 `160cpx`。
- `chips.layout.divider.thickness`：布局分割线厚度，默认 `1px`。
- `chips.layout.focus.outline-width` / `chips.layout.focus.outline-offset`：布局原语焦点环线宽与偏移，默认 `1px / 2px`。
- `chips.layout.breakpoint.compact | regular | expanded | wide`：页面自治断点，默认 `480cpx / 768cpx / 1024cpx / 1280cpx`。
- `chips.layout.z-index.base | sticky | overlay`：布局层级基线，默认 `0 / 10 / 1000`。
- `chips.layout.safe-area.inline-start | inline-end | block-start | block-end`：安全区 inset，默认映射浏览器 `env(safe-area-inset-*, 0px)`。

组件 token 可以引用 `chips.layout.*`。例如 `chips.comp.stack.root.gap`、`chips.comp.inline.root.gap`、`chips.comp.grid.root.gap`、`chips.comp.spacer.root.size` 默认引用 `chips.layout.gap.md`；`chips.comp.divider.root.thickness` 默认引用 `chips.layout.divider.thickness`。

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

## 7. 诊断与覆盖率输出

主题运行时和组件库 contract validator 必须共享 `ThemeDiagnostic` 与 `ThemeDiagnosticSummary` schema，避免 Host、SDK、主题包和设置面板各自定义诊断口径。

- `theme.resolve` 必须返回 `tokens / diagnostics / summary`。
- `theme.contract.get` 必须返回 `ThemeContractView`，其中每个组件包含 `coverage / diagnostics`。
- 缺失 required token 必须产生 `THEME_REQUIRED_TOKEN_MISSING`，并定位到 `component / part / state / tokenKey / layer`。
- 缺失 optional token 必须产生 `THEME_OPTIONAL_TOKEN_MISSING`，但 `blocking=false`。
- `theme.changed` 事件必须携带 `diagnosticsSummary`，用于设置面板、组件库刷新工具和 CLI 快速判断主题健康状态。
- 主题包本地校验不得维护独立硬编码 token 白名单；必须读取 `contracts/theme-interface.contract.json` 并通过组件库正式 contract validator 生成同一 `ThemeContractView`。

设置面板、CLI 与主题包测试只消费该公共 schema，不直接解析 Host 内部错误对象或主题包私有字段。
