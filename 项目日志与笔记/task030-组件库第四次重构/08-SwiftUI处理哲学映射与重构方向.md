# 分报告 08：SwiftUI 处理哲学映射与薯片组件库重构方向

> 调查日期：2026-08-06
> 依据：task022 SwiftUI 能力模型调研（04-View与Modifier、05-布局系统、06-控件与样式、08-导航菜单工具栏）、07-应用私有组件与组件库能力缺口对照
> 决策原则（用户定调）：**SwiftUI 怎么处理这些功能对组件的需要，我们就怎么处理**

---

## 一、SwiftUI 处理功能需求的四种模式（先定方法论）

SwiftUI 面对"应用需要某个功能"时，只有四种处理方式，从不为了每个功能造一个新组件：

| 模式 | 是什么 | 例子 |
|---|---|---|
| **M1 一等公民场景容器** | 高频、跨应用、语义稳定 → 直接做成框架容器 | `List + Section`（分组列表）、`Form`（设置表单）、`NavigationSplitView`（分栏）、`TabView`（标签页）、`Inspector`（检查器侧栏）、`GroupBox`（分组卡片）、`DisclosureGroup`（展开组）、`LabeledContent`（键值行）、`Gauge/ProgressView`（指标）、`Picker`（选择器）、`Menu`（菜单） |
| **M2 Modifier 能力** | 能力应该挂在"任意视图"上，不是某个组件的一部分 → 做成 modifier，随 View 叠加 | `.help()`（tooltip）、`.overlay()`（覆盖层）、`.sheet()/.popover()/.alert()/.confirmationDialog()`（呈现）、`.contextMenu()`（右键菜单）、`.dropDestination()/.draggable()`（拖放）、`.badge()`（角标）、`.focusable()`（焦点）、`.animation()/.transition()`（动效） |
| **M3 组合原语** | 特定场景的复杂 UI → 框架提供**原语**（Slider/Canvas/Gesture/TimelineView），开发者用标准方式组合；Apple 不在框架里塞专用组件 | 媒体进度条（Slider 定制 track）、活动栏、状态栏、无限画布、浮动窗口——**SwiftUI 通通没有专用组件，靠组合** |
| **M4 系统级封装** | 平台级完整体验 → 系统提供整机 UI，开发者选择用或不用 | AVKit `VideoPlayer`/`AVPlayerViewController`（完整播放器）、`PhotosPicker`（系统选图） |

**核心洞察**：SwiftUI 几乎从不"为某个应用场景发明专用组件"，它只做两件事——**把跨应用稳定、语义明确的场景做成容器/Modifier；把特定场景留给原语组合**。组件变体爆炸和"应用自己造"在 SwiftUI 里都不会发生，因为能力是叠加式的。

薯片组件库当前的问题是：**只有 M1 的少量容器（且缺了 List/Section/Form 等最常用的），完全没有 M2（Modifier 能力层），M3 原语不完整（Slider 缺媒体变种、无 Canvas/Gesture/TimelineView 对应物），M4 缺系统级封装**。这就是应用被迫自造的全部原因。

---

## 二、07 报告应用缺口 → SwiftUI 处理方式 → 薯片处理方式（逐项映射）

### 2.1 完全缺失类（18 项）

| 应用缺口 | SwiftUI 的处理 | 薯片的处理（按 SwiftUI 哲学） | 类型 |
|---|---|---|---|
| 分组列表（SearchPanel/BookmarkPanel） | **M1：List + Section 一等公民**，还有 ForEach/OutlineGroup | 做 `ChipsList` + `ChipsSection`（含分组标题+计数+行列表+roving 键盘）；`ChipsForEach` 不需要（React 原生）；`ChipsOutlineGroup` 用 ChipsTree 覆盖 | **新组件（最高优先）** |
| 描述列表（VideoPlayer 信息网格） | **M1：LabeledContent 一等公民**（iOS16+），Form 内自动换行 | 做 `ChipsKeyValue`（键值行，dl/dt/dd 语义）+ 可选 `ChipsKeyValueList`（分组描述列表） | **新组件** |
| 详情页/字段列表（SettingsDetailPage） | M1 组合：Form + Section + LabeledContent + Text | 做 `ChipsDetailView`（返回+头部+状态区+字段分组+操作区）或扩展 ChipsForm 加只读模式；与 ChipsKeyValue 共用字段行 | **新组件** |
| 记录行列表（SettingsRecordList） | M1 组合：List + Label + Text + Button；macOS Table 列模式 | ChipsList 的 record 行变体（icon+标题+摘要\|状态\|元信息\|操作）；或 ChipsDataGrid 行变体 | **新组件变体** |
| 站点页头/页脚（SiteHeader/Footer） | **M2 思路 + 网页式结构**：SwiftUI 无原生 Header，但导航用 `NavigationStack` 的 `navigationTitle/.toolbar`；页脚无 | `ChipsSiteHeader`/`ChipsSiteFooter`（品牌+导航+登录态），或更优：`ChipsNavigationBar`（标题区+导航+工具栏）模式。网页式结构由布局原语组合 | **新组件（中优先）** |
| 抽屉 Drawer（PanelShell/侧边面板） | **M2：`.sheet()` + `presentationDetents`**（iOS16）——呈现是 modifier，不是组件 | 做 `ChipsSheet`（呈现容器：modal/sheet/drawer 三种呈现变体，统一焦点圈闭/restoreFocus/backdrop/Escape）| **新组件（呈现层重建）** |
| 加载遮罩（3 播放器 overlay） | **M2：`.overlay()` modifier** + ProgressView | 做 `ChipsOverlay`（覆盖任意内容的遮罩能力：loading/error/自定义内容），作为 M2 能力 | **新能力（modifier 式）** |
| 图标按钮+tooltip+active（4 应用） | **M2：`.help()` modifier** 挂在任意视图；Button/Label 自带；Toggle 表达 pressed | 做 `ChipsHelp`（任意元素的 tooltip 挂载，asChild 注入 aria 与交互）；ChipsIconButton 支持 pressed（ToggleButton 化）；不新造"图标按钮+tooltip"组合组件 | **新能力（modifier 式）** |
| 媒体进度条（3 播放器） | **M3 组合**：Slider 定制 track + TimelineView + Gesture；AVKit 是 M4 整机播放器 | 分两步：① `ChipsSlider` 扩展 buffer/markers/hover 预览变种（token 驱动）；② 生态提供 `ChipsMediaTimeline`（媒体进度条组合原语：buffer 段+章节标记+时间标签+seek），文档化组合模式。M4 级完整播放器壳层（ChipsPlayerShell）按 Host 系统组件走 | **M3 原语增强 + M4 壳层** |
| 轨道单选列表（字幕/音轨） | **M1：Picker** 多风格（menu/segmented/radio）；option 可含次级信息（Label+Text） | ChipsSelect/ChipsRadioGroup 扩展 option 描述/次级文本变体；不做专用"轨道列表" | **现有组件增强** |
| 分页指示点 | **M2 思路**：TabView `.page` 风格自带 dots | 低优先：ChipsTabs 增加 page 模式（含 dots）；或 ChipsPaginationDots 轻量组件 | **现有组件增强** |
| 活动栏 ActivityBar（Dock） | **M3 组合**：SwiftUI 无；VS Code 式活动栏在 macOS 用自定义+Toolbar | `ChipsActivityBar`（纵向图标栏+激活态+徽标+面板联动）——task023 已登记，应用已有完整私有实现（Dock 71+51 行）可提取 | **新组件（壳层族）** |
| 状态栏 StatusBar（3 应用） | **M3 组合**：SwiftUI 无原生状态栏（NSStatusItem 是系统托盘不同语义） | `ChipsStatusBar`（状态区+进度+光标/资源/诊断信息+插槽）——task023 已登记 | **新组件（壳层族）** |
| 工作台壳层（Workbench 三栏） | **M3 组合**：NavigationSplitView + Toolbar + 自定义侧栏 | `ChipsWorkbenchShell`（活动栏+侧栏+编辑区+检查器+状态栏，面板折叠/调宽/键盘语义）——task023 已登记 | **新组件（壳层族）** |
| 无限画布（InfiniteCanvas） | **M3 组合**：Canvas + Gesture + MagnificationGesture/DragGesture | 提供 `ChipsCanvas` 原语（pan/zoom/网格/坐标空间/拖放挂点）+ 文档化组合模式；不做完整画布应用 | **新原语** |
| 浮动窗口（BaseWindow） | **M3 组合**：macOS 多窗口 WindowGroup/OpenWindow；浮动面板 AppKit NSPanel | `ChipsToolWindow` 增强（自由定位/拖拽/键盘移动/resize/zIndex/焦点层级） | **现有组件增强** |
| 文件拖放区（DropZone 3 处） | **M2：`.dropDestination()/.draggable()` modifier**（iOS16+ 一等公民） | 做 `ChipsDropZone`（文件拖放区：idle/drag-over/rejected/loading/error 状态）+ `useChipsFileDrop` hook（dragDepth/类型过滤/事件）——task023 已登记 | **新能力（modifier 式 + hook）** |
| 素材/模板网格（3 处） | M1 组合：LazyVGrid（网格布局一等公民）+ 自定义卡片 | `ChipsAssetGrid`（缩略图网格：多选/拖拽/过滤/加载态）——task023 已登记；ChripsGrid 已可做布局层 | **新组件（壳层族）** |
| 预览窗格（多处 iframe 预览） | **M1：Inspector**（macOS 检查器侧栏，iOS17/macOS14 一等公民） | `ChipsPreviewPane`（预览工具栏/缩放/刷新/iframe 状态/错误覆盖）——task023 已登记 | **新组件（壳层族）** |
| 裁剪编辑器（CoverCropDialog 341 行） | **M3 组合**：无专用；PhotoKit 提供能力层 | `ChipsCropEditor`（画布+选区+手柄+比例锁定+键盘微调+导出）——task023 已登记；或先做 `ChipsCropDialog` 壳+文档化组合 | **新组件（低优先，可后置）** |
| 拖拽排序（usePointerSortableList） | **M2：.draggable/.dropDestination** + 自定义排序逻辑 | `useChipsSortableList` hook + ChipsSortableList 容器（拖拽幽灵/插入指示/键盘移动） | **新能力（hook）** |
| 触发式分组菜单（RTE AppMenu） | **M1：Menu + CommandMenu**（命令驱动） | ChipsMenu 增强"触发器+分组面板"模式；或 ChipsMenuBar 单菜单形态；命令语义与 Host command registry 绑定 | **现有组件增强** |
| 指标卡（MetricCard） | M3 组合：Text+Text+Label 自定义 | 组合层文档化（ChipsCardShell 组合示例），不进组件库 | **文档化模式** |
| 资料 Hero | M1 组合：头像用 Avatar，其余自定义 | ChipsAvatar 已覆盖头像；hero 组合进"个人页模式"文档 | **文档化模式** |

### 2.2 近似变种类（15 处）→ SwiftUI 处理方式

| 变种缺口 | SwiftUI 的处理 | 薯片的处理 |
|---|---|---|
| 滑块→媒体进度条 | Slider 定制 + 组合 | ChipsSlider 扩展 buffer/markers/hover 预览（M3 原语增强） |
| Dialog→抽屉 | .sheet + presentationDetents | ChipsSheet 呈现容器（modal/sheet/drawer 统一） |
| VirtualList→分组列表 | List+Section | ChipsList + ChipsSection |
| RadioGroup→轨道列表 | Picker 多风格 | Select/RadioGroup 次级文本变体 |
| LoadingBoundary→遮罩 | .overlay | ChipsOverlay |
| Tree→平面导航树 | OutlineGroup（展开式）+ List | ChipsTree 增加"平面导航模式"（全展开+roving 单选）；fileTree 变种（多选/拖拽/重命名）作为 ChipsTree 扩展 |
| Tree→多选拖拽树 | 自定义 + .draggable | ChipsTree 多选/拖拽扩展（M2 拖放能力挂接） |
| DataGrid→自定义列宽 | Table（列协议） | ChipsDataGrid 列宽 minmax + data-label 变体 |
| Avatar→Hero | 组合 | 文档化模式 |
| CardShell→封面瓦片 | 组合 | 文档化模式 + ChipsAssetGrid |
| PanelHeader→内联编辑 | 组合 + TextField 换行编辑 | PanelHeader 标题内联编辑变体（现有组件增强） |
| EmbeddedDocumentFrame→文档窗口 | WKWebView 封装（系统级） | card-runtime 协议统一（Host 链路问题，见分报告 03/05） |
| 菜单栏→触发式分组菜单 | Menu + Commands | ChipsMenu 触发器+分组模式 |
| 工作台分栏 | NavigationSplitView | ChipsWorkbenchShell |
| 对话框+表单 | sheet + Form | ChipsSheet + ChipsForm（已有，应用未用） |

### 2.3 "有但不用"（20 处）→ 不是组件库问题

SwiftUI 不会出现这个问题（平台强制统一），薯片的处理是**应用迁移治理**（工单114 范围）+ 把"应用自造"标记为架构红线违规，由质量门禁拦截（新增"应用组件库使用审计"门禁）。

---

## 三、第四次重构的架构调整（关键：建立 M2 Modifier 能力层）

当前组件库架构缺陷的本质：**只有"整件组件"一个维度，能力无法叠加在任意结构上**。SwiftUI 哲学对应到 React 的实现方案：

### 3.1 M2 能力层实现方式（React 下的 modifier 等价物）

React 没有 modifier 语法，用四种机制等价实现，优先级从高到低：

1. **asChild 组合注入**（Radix 模式）：`<ChipsOverlay asChild><div>...</div></ChipsOverlay>`——把状态/属性注入子元素，任意结构获得能力；
2. **Provider + hook**：`<ChipsDropZoneProvider>` + `useChipsDropZone()`——把交互状态下放，业务元素消费；
3. **Wrapper 组件**：`<ChipsHelp label="保存"><button>...</button></ChipsHelp>`——薄包装注入 aria/tooltip 交互；
4. **命令式注册**：通过 ChipsEnvironmentProvider 的环境注入（已有基础）。

第一批 M2 能力清单：

| 能力 | SwiftUI 对应 | 实现机制 | 解决的应用自造 |
|---|---|---|---|
| `ChipsOverlay` | .overlay | asChild/wrapper | 3 个播放器加载遮罩 |
| `ChipsHelp` | .help() | asChild | 4 个应用的 tooltip 自实现 |
| `ChipsSheet`（modal/sheet/drawer） | .sheet/.popover | 呈现协调器 | PanelShell、侧边面板、对话框 |
| `ChipsDropZone` + `useChipsFileDrop` | .dropDestination | wrapper + hook | 3 处文件拖放自实现 |
| `useChipsDraggable` | .draggable | hook | EditingEngine 拖拽体系 |
| `ChipsBadge`（挂载式） | .badge() | asChild | 角标自实现 |
| `useChipsSortableList` | 组合 | hook | usePointerSortableList |
| `ChipsAlert`/`ChipsConfirmationDialog` | .alert/.confirmationDialog | 呈现协调器 | 各应用确认框 |

### 3.2 M1 一等公民容器补齐清单（按应用真实需求排序）

| 新组件 | SwiftUI 对应 | 需求来源 | 优先级 |
|---|---|---|---|
| `ChipsList` + `ChipsSection` | List + Section | BookReader 分组列表×2、设置记录列表、文件列表 | P0 |
| `ChipsKeyValue` + `ChipsKeyValueList` | LabeledContent | VideoPlayer 信息网格、设置详情页字段 | P0 |
| `ChipsDetailView` | Form+Section 组合 | SettingsDetailPage | P1 |
| `ChipsSiteHeader`/`ChipsSiteFooter` | 组合（网页式） | CommunityClient | P1 |
| `ChipsActivityBar` | 组合 | EditingEngine Dock | P1 |
| `ChipsStatusBar` | 组合 | FileManager/RTE/HistoryPanel | P1 |
| `ChipsWorkbenchShell` | 组合 | Workbench 三栏 | P1 |
| `ChipsAssetGrid` | LazyVGrid 组合 | TemplateGrid/CardTypeGrid/ThemePanel | P1 |
| `ChipsPreviewPane` | Inspector | 多处 iframe 预览 | P1 |
| `ChipsFileDropZone` | .dropDestination 组合 | CardViewer DropZone | P1 |
| `ChipsCropEditor` | 组合 | CoverCropDialog | P2 |
| `ChipsTaskProgressCenter` | ProgressView 组合 | ExportPanel（单任务） | P2 |
| `ChipsCanvas` | Canvas+Gesture | InfiniteCanvas | P2 |
| `ChipsMediaTimeline` | Slider 定制组合 | 3 播放器进度条 | P2 |

### 3.3 现有组件增强清单

| 组件 | 增强 | 对应 SwiftUI |
|---|---|---|
| ChipsSlider | buffer/markers/hover 预览/时间标签变种 | Slider 定制 track |
| ChipsIconButton | pressed 态（ToggleButton 化）、asChild、ChipsHelp 集成 | Button/Label/Toggle |
| ChipsTabs | page 模式（dots） | TabView .page |
| ChipsMenu | 触发器+分组面板模式 | Menu + Commands |
| ChipsSelect/RadioGroup | option 次级描述文本 | Picker 多风格 |
| ChipsToolWindow | 自由定位/拖拽/resize/键盘/zIndex | NSPanel/OpenWindow 组合 |
| ChipsPanelHeader | 标题内联编辑变体 | TextField 换行编辑 |
| ChipsTree | 平面导航模式 + 多选/拖拽/重命名扩展 | OutlineGroup + .draggable |
| ChipsDataGrid | 列宽 minmax + data-label | Table 列协议 |
| ChipsForm | 只读模式（配合 ChipsKeyValue） | Form 只读语义 |

### 3.4 M4 系统级封装（Host 域）

SwiftUI 的 AVKit/PhotosPicker 对应薯片 Host 层系统组件（非组件库）：媒体播放器整机壳层、资源选择器、文件打开对话框等，由 Host/系统插件提供，组件库不做。

---

## 四、执行规则（第四次重构的工程约束）

1. **不再为"应用场景"发明专用组件**——先判断属于 M1/M2/M3/M4 哪一类；M2 优先做成能力，M3 做成原语+文档化组合模式，M4 留给 Host；
2. **应用自造组件一律先对照本映射表**：属于"有但不用"的 → 迁移到现有组件；属于"变种缺失"的 → 登记组件库增强；属于"完全缺失"的 → 按 M1/M2 清单补正式组件；业务特有 → 保留并登记边界；
3. **新组件必须同时交付**：契约（data-scope/part/state）+ 组件 token + 默认/暗色主题 CSS + 测试 + 文档（05-可访问性与质量基线、09-能力矩阵同步）；
4. **M2 能力层必须优先落地**：它是解决"应用自造"的最短路径（一个 ChipsHelp 消掉 4 个应用 4 种 tooltip 实现）；
5. 组件库第四次重构的验收标准 = 分报告 07 的缺口清单全部收口：18 项完全缺失 → 组件/能力；15 项变种 → 增强；20 项"有但不用" → 应用迁移完毕且新增门禁拦截。

---

## 五、与现有结论的衔接

- task023"缺少的组件.md"18 项 → 本报告 3.2/3.3 清单是它的落地执行版（含 M2 能力层新增）；
- task022 差距分析"需要前端框架级重构，不是只补组件" → 本报告给出框架级重构的具体形态：**M2 能力层（modifier 等价物）+ M1 容器补齐 + M3 原语增强**，三者共同构成"组合式框架"，而非"组件集合"；
- 工单094（技术栈口径）→ M2 能力层实现需要决策：自研 or 借鉴 Radix 的 asChild/Base UI 的组合模式（保持自研状态机路线的约束不变，仅借鉴组合 API 形态，符合 2026-08-02 复核结论）。
