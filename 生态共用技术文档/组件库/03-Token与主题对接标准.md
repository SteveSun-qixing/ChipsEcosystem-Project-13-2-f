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
  - `chips.comp.text.*`
  - `chips.comp.label.*`
  - `chips.comp.icon.*`
  - `chips.comp.icon-button.*`
  - `chips.comp.toggle-button.*`
  - `chips.comp.badge.*`
  - `chips.comp.tag.*`
  - `chips.comp.avatar.*`
  - `chips.comp.spinner.*`
  - `chips.comp.progress.*`
  - `chips.comp.text-field.*`
  - `chips.comp.text-area.*`
  - `chips.comp.search-field.*`
  - `chips.comp.secure-field.*`
  - `chips.comp.segmented-control.*`
  - `chips.comp.combo-box.*`
  - `chips.comp.number-input.*`
  - `chips.comp.stepper.*`
  - `chips.comp.slider.*`
  - `chips.comp.date-picker.*`
  - `chips.comp.time-picker.*`
  - `chips.comp.image.*`
  - `chips.comp.media.*`
  - `chips.comp.error-state.*`
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

基础展示控件 token 是任务015基础控件矩阵的第一批正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.text.*`
- `chips.comp.label.*`
- `chips.comp.icon.*`

`chips.comp.icon.root.*` 是运行时 UI 图标的组件层 token，组件内部和主题 CSS 的解析顺序为 `chips.comp.icon.* -> chips.sys.icon.* -> currentColor / 默认轴值`。`chips.sys.icon.*` 仍是主题系统图标语义基线，`chips.comp.icon.*` 负责组件级覆盖。

任务015第二批基础控件 token 是按钮派生、轻量展示和反馈控件的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.icon-button.*`
- `chips.comp.toggle-button.*`
- `chips.comp.badge.*`
- `chips.comp.tag.*`
- `chips.comp.avatar.*`
- `chips.comp.spinner.*`
- `chips.comp.progress.*`

`chips.comp.icon-button.root.size` 与 `chips.comp.avatar.root.size` 允许引用或定义结构尺寸；`chips.comp.spinner.motion.duration` 必须引用 `chips.motion.duration.*`，不得在组件库运行时硬编码动画时长。`ChipsProgress` 的动态宽度只由运行时 CSS 变量 `--chips-progress-ratio` 表达，主题包只负责 `track/range/label/value/status/focus` token。

任务015第三批基础输入控件 token 是文本、搜索与密码输入的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.text-field.*`
- `chips.comp.text-area.*`
- `chips.comp.search-field.*`
- `chips.comp.secure-field.*`

四个输入控件的 `root.surface/border/focus`、`label/control/placeholder/description/status` 必须分别使用自身 scope 的 token，不得复用旧 `chips.comp.input.*` 作为正式样式入口。`SearchField` 的 `clear` 与 `search-icon`、`SecureField` 的 `visibility-toggle / visibility-icon` 只表达输入控件自身结构与状态，不得绑定业务搜索逻辑或密码管理能力。

任务015第四批选择扩展控件 token 是分段选择和输入式选择的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.segmented-control.*`
- `chips.comp.combo-box.*`

`SegmentedControl` 的 `root/item/label/indicator/status/focus` token 只表达单选分段控件结构和状态；`ComboBox` 的 `root/control/trigger/list/option/description/status/focus` token 只表达输入过滤与 listbox 弹层视觉。主题包不得复用 `chips.comp.radio.*`、`chips.comp.select.*` 或旧 `chips.comp.input.*` 作为这两个控件的正式样式入口。

任务015第五批数值控件 token 是数值输入、离散增减和连续滑动控件的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.number-input.*`
- `chips.comp.stepper.*`
- `chips.comp.slider.*`

`NumberInput` 的 `root/control/decrement/increment/description/status/focus` token 只表达可编辑数值输入、步进按钮、描述和错误视觉；`Stepper` 的 `root/label/value/decrement/increment/status/focus` token 只表达离散增减结构和边界状态视觉；`Slider` 的 `root/label/track/range/thumb/value/status/focus` token 只表达滑轨、选中范围、滑块和值文本视觉。主题包不得复用旧 `chips.comp.input.*`、按钮族 token、`chips.comp.progress.*` 或业务私有 token 作为这些数值控件的正式样式入口。

任务015第六批日期时间控件 token 是日期选择与时间选择的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.date-picker.*`
- `chips.comp.time-picker.*`

`DatePicker` 的 `root/control/input/trigger/calendar/header/nav/grid/week-header/cell/description/status/focus` token 只表达日历日期输入、月份导航、日期格状态、描述和错误视觉；`TimePicker` 的 `root/control/input/trigger/list/option/description/status/focus` token 只表达本地墙钟时间输入、选项列表、描述和错误视觉。主题包不得复用旧 `chips.comp.date-time.*`、`chips.comp.input.*`、选择控件 token 或业务私有 token 作为这两个控件的正式样式入口。

任务015第七批图像、媒体和错误状态控件 token 是静态图片、媒体边界和错误展示的正式契约，默认主题和暗色主题必须覆盖：

- `chips.comp.image.*`
- `chips.comp.media.*`
- `chips.comp.error-state.*`

`Image` 的 `root/media/fallback/caption/status/focus` token 只表达图片容器、实际媒体、fallback、说明文本、错误状态和焦点视觉；`Media` 的 `root/content/controls/control/caption/status/focus` token 只表达音频、视频或通用媒体内容边界和内部控制槽视觉；`ErrorState` 的 `root/icon/title/description/details/action/status/focus` token 只表达静态错误展示、详情、动作入口和错误状态视觉。主题包不得复用 `chips.comp.avatar.*`、`chips.comp.error-boundary.*`、`chips.comp.empty-state.*` 或业务私有 token 作为三者的正式样式入口。

第七批最小 required token 数量以组件库 contract 为准：`image` 9 个、`media` 11 个、`error-state` 12 个。主题包本地 `contracts/theme-interface.contract.json` 与 `contracts/theme-min-functional-set.json` 必须同时包含 `image / media / error-state`，默认主题和暗色主题的组件基线为 70 个 component。

任务016第一批复杂组件 Compound API token 是 Dialog、Popover、Tabs 显式 slot 的正式契约，默认主题和暗色主题必须按组件库 contract 同步覆盖：

- `chips.comp.dialog.*`
- `chips.comp.popover.*`
- `chips.comp.tabs.*`

`Dialog` 的 `backdrop/content/header/body/footer/actions/close/focus` token 分别表达遮罩、对话框内容容器、标题区、正文区、页脚区、动作区、关闭入口和焦点视觉；`Popover` 的 `trigger/content/arrow/focus` token 只表达触发器、浮层内容、装饰箭头和焦点视觉，内部定位容器不是公开 token 或公开 part；`Tabs` 的 `list/trigger/panel/focus` token 只表达页签列表、页签触发器、面板和焦点视觉。主题包不得继续依赖 Dialog 旧 `title/description` part 或 Popover 旧 `positioner` part 作为正式样式入口。

任务016第二批复杂组件 Compound API token 是 Menu、Select 显式 slot 的正式契约，默认主题和暗色主题必须按组件库 contract 同步覆盖：

- `chips.comp.menu.*`
- `chips.comp.select.*`

`Menu` 的 `content/item/group/group-label/separator/focus` token 分别表达菜单内容容器、菜单项、高亮/选中视觉、分组标题、分隔线和焦点视觉；`Select` 的 `trigger/content/option/value/icon/focus` token 分别表达触发器、listbox 内容容器、选项高亮/选中、当前值和展开图标视觉。`Select.Content` 的正式 part 是 `content`，主题包不得继续依赖 `select` scope 下的旧 `list` part。

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
