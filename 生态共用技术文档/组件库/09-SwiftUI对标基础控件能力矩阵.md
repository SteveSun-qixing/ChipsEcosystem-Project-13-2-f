# SwiftUI 对标基础控件能力矩阵

> 文档状态：任务015基础控件矩阵正式口径
> 适用范围：组件库、主题包、应用插件、卡片插件、布局插件
> 当前基线：`Text / Label / Icon` 已作为任务015第一批收口；`IconButton / ToggleButton / Badge / Tag / Avatar / Spinner / Progress` 已作为任务015第二批收口；后续批次必须继续按本矩阵补齐。

## 1. 矩阵口径

- “已落地”表示组件库公开导出、运行时 `data-scope/data-part/data-state`、a11y 规则、contract、组件 token、默认主题和暗色主题 token/CSS/contract、测试均已接入。
- “相邻能力”表示生态已有可复用基础，但尚未形成任务015要求的独立控件闭环。
- “待补齐”表示不得在应用层长期私造；后续工单批次必须补齐正式组件或在公共文档明确等价关系。

## 2. 任务015基础控件矩阵

| 能力类别 | SwiftUI / 常见控件 | Chips 正式能力 | 当前状态 | 当前正式 scope | 后续要求 |
|---|---|---|---|---|---|
| 文本与图像 | Text | `ChipsText` | 已落地 | `text` | 继续补充用例到真实应用迁移场景 |
| 文本与图像 | Label | `ChipsLabel` | 已落地 | `label` | 后续表单控件必须优先复用 Label 语义 |
| 文本与图像 | Icon | `ChipsIcon` | 已落地 | `icon` | 所有运行时 UI 图标必须消费 `IconDescriptor` |
| 文本与图像 | Image | 无 | 待补齐 | `image` | 需要 alt、加载、错误和尺寸契约 |
| 文本与图像 | Media | 无 | 待补齐 | `media` | 需要音视频/通用媒体边界与模块能力协作口径 |
| 按钮与命令 | Button | `ChipsButton` | 已落地 | `button` | 维持基础动作按钮闭环 |
| 按钮与命令 | IconButton | `ChipsIconButton` | 已落地 | `icon-button` | 必须强制可访问名称和 44px 热区 |
| 按钮与命令 | ToggleButton | `ChipsToggleButton` | 已落地 | `toggle-button` | 独立导出与 contract，切换态使用 `aria-pressed` |
| 输入控件 | TextField | `ChipsInput` 相邻能力 | 待补齐 | `text-field` | 需要独立单行文本输入 scope 或明确等价标准 |
| 输入控件 | TextArea | 无 | 待补齐 | `text-area` | 需要多行输入、描述、错误、键盘行为 |
| 输入控件 | SearchField | 无 | 待补齐 | `search-field` | 需要搜索/清空槽位与 Enter 搜索语义 |
| 输入控件 | SecureField | 无 | 待补齐 | `secure-field` | 需要密码可见性切换与 a11y |
| 选择控件 | Checkbox | `ChipsCheckbox` | 已落地 | `checkbox` | 维持表单选择闭环 |
| 选择控件 | Radio | `ChipsRadioGroup` | 已落地 | `radio` | 维持互斥选择闭环 |
| 选择控件 | Switch | `ChipsSwitch` | 已落地 | `switch` | 维持布尔开关闭环 |
| 选择控件 | SegmentedControl | 无 | 待补齐 | `segmented-control` | 需要 roving focus 与单选/多选口径 |
| 选择控件 | Select | `ChipsSelect` | 已落地 | `select` | 维持 listbox 选择闭环 |
| 选择控件 | ComboBox | 无 | 待补齐 | `combo-box` | 需要输入过滤、弹层和 activedescendant 语义 |
| 数值控件 | Slider | 无 | 待补齐 | `slider` | 需要 min/max/step、键盘增减、值文本 |
| 数值控件 | Stepper | 无 | 待补齐 | `stepper` | 需要增减按钮、边界禁用、数值事件 |
| 数值控件 | NumberInput | 无 | 待补齐 | `number-input` | 需要解析、夹取、错误和 stepper 协作 |
| 日期时间 | DatePicker | `ChipsDateTime` 相邻能力 | 待补齐 | `date-picker` | 需要独立日期输入或选择器契约 |
| 日期时间 | TimePicker | `ChipsDateTime` 相邻能力 | 待补齐 | `time-picker` | 需要独立时间输入或选择器契约 |
| 展示控件 | Badge | `ChipsBadge` | 已落地 | `badge` | 需要状态色、计数/文本和装饰语义 |
| 展示控件 | Tag | `ChipsTag` | 已落地 | `tag` | 需要标签文本、可关闭变体和列表语义 |
| 展示控件 | Avatar | `ChipsAvatar` | 已落地 | `avatar` | 需要图像、缩写、fallback 与 alt 语义 |
| 展示控件 | Tooltip | `ChipsTooltip` | 已落地 | `tooltip` | 维持说明气泡闭环 |
| 反馈控件 | Progress | `ChipsProgress` | 已落地 | `progress` | 需要 determinate/indeterminate 与 progressbar 语义 |
| 反馈控件 | Spinner | `ChipsSpinner` | 已落地 | `spinner` | 需要 status 语义与 motion token |
| 反馈控件 | Skeleton | `ChipsSkeleton` | 已落地 | `skeleton` | 维持加载占位闭环 |
| 反馈控件 | EmptyState | `ChipsEmptyState` | 已落地 | `empty-state` | 维持空态展示闭环 |
| 反馈控件 | ErrorState | `ChipsErrorBoundary` 相邻能力 | 待补齐 | `error-state` | 需要静态错误展示，不能等同错误边界 |

## 3. 第一批已冻结控件

### `ChipsText`

- `data-scope="text"`，公开 part：`root`。
- 状态：`idle / disabled / error`。
- 主题 token：`chips.comp.text.root.color.*`、`font-size`、`line-height`、`font-weight.*`。
- 支持同步 i18n adapter：`textKey / textParams / fallbackText`。
- 只提供语义与主题挂点，不内置业务排版样式。

### `ChipsLabel`

- `data-scope="label"`，公开 part：`root / required-indicator / status`。
- 状态：`idle / disabled / error`。
- 主题 token：`chips.comp.label.root.*`、`chips.comp.label.required-indicator.color`、`chips.comp.label.status.color.error`。
- a11y 基线：必须关联控件（如 `htmlFor`）或提供可访问名称。

### `ChipsIcon`

- `data-scope="icon"`，公开 part：`root`。
- 状态：`idle`。
- 主题 token：`chips.comp.icon.root.color / size / fill / wght / grad / opsz`。
- 输入必须是 `IconDescriptor`；装饰图标默认 `aria-hidden="true"`，功能图标必须提供可访问标签。
- 默认与暗色主题必须通过 Material Symbols variable font 链路承载 `outlined / rounded / sharp`。

## 4. 第二批已冻结控件

### `ChipsIconButton`

- `data-scope="icon-button"`，公开 part：`root / icon / spinner / status`。
- 状态：标准交互状态集合。
- 主题 token：`chips.comp.icon-button.root.*`、`icon.color.*`、`focus.outline`、`status.color.error`。
- 必须提供可访问名称；默认主题热区 token 为 `44cpx`，图标内容必须通过 `ChipsIcon` 或外部槽位提供。

### `ChipsToggleButton`

- `data-scope="toggle-button"`，公开 part：`root / icon / label / spinner / status`。
- 状态：标准交互状态集合；切换态使用 `aria-pressed` 与 `data-pressed`。
- 主题 token：`chips.comp.toggle-button.root.surface.*`、`label.color.*`、`icon.color.*`、`focus.outline`、`status.color.error`。
- 用于“按下/未按下”的命令按钮，不等同 `Switch` 或 `Checkbox`。

### `ChipsBadge`

- `data-scope="badge"`，公开 part：`root / icon / label / status`。
- 状态：`idle / disabled / error`。
- 主题 token：`chips.comp.badge.root.surface.*`、`label.color.*`、`icon.color.*`、`status.color.error`。
- 支持 `neutral / accent / success / warning / error` tone；可装饰隐藏，也可通过可访问名称表达计数或状态。

### `ChipsTag`

- `data-scope="tag"`，公开 part：`root / icon / label / close / status`。
- 状态：标准交互状态集合。
- 主题 token：`chips.comp.tag.root.surface.*`、`label.color.*`、`icon.color.*`、`close.color.*`、`focus.outline`、`status.color.error`。
- 可关闭标签必须让 `close` part 作为真实按钮，并提供可访问名称。

### `ChipsAvatar`

- `data-scope="avatar"`，公开 part：`root / image / fallback / status`。
- 状态：`idle / disabled / loading / error`。
- 主题 token：`chips.comp.avatar.root.*`、`fallback.color`、`status.color.error`。
- 非装饰头像必须提供姓名、alt 或等价可访问标签；图片失败或错误态使用 fallback 缩写。

### `ChipsSpinner`

- `data-scope="spinner"`，公开 part：`root / track / indicator / status`。
- 状态：`idle / disabled / loading / error`。
- 主题 token：`chips.comp.spinner.root.size`、`track.color`、`indicator.*`、`motion.duration`、`status.color.*`。
- 独立使用时必须 `role="status"` 并有可访问名称；装饰性嵌入必须 `aria-hidden="true"`。

### `ChipsProgress`

- `data-scope="progress"`，公开 part：`root / track / range / label / value / status`。
- 状态：`idle / disabled / loading / error`；模式通过 `data-mode="determinate|indeterminate"` 表达。
- 主题 token：`chips.comp.progress.track.*`、`range.surface.*`、`label.color`、`value.color`、`status.color.error`、`focus.outline`。
- 确定进度必须输出 `aria-valuemin / aria-valuemax / aria-valuenow`；不确定进度不得输出 `aria-valuenow`。

## 5. 后续批次建议

- 批次 B：`IconButton / ToggleButton / Badge / Tag / Avatar / Spinner / Progress`（已落地）。
- 批次 C：`TextField / TextArea / SearchField / SecureField`。
- 批次 D：`SegmentedControl / ComboBox`。
- 批次 E：`NumberInput / Stepper / Slider`。
- 批次 F：`DatePicker / TimePicker`。
- 批次 G：`Image / Media / ErrorState`。

每一批都必须同步组件库、组件 contract、组件 token、默认主题、暗色主题、公共文档和测试；不得只新增空壳导出。
