# 复合卡片窗口与 SDK 显示链路标准

## 1. 组件定义

`CompositeCardWindow` 是生态统一复合卡片展示组件，最终向应用层交付一个复合 iframe 窗口。

## 2. 链路原则

- 应用层统一通过 SDK 调用卡片显示接口；
- Host 是唯一的卡片渲染、主题解析和窗口编排执行方；
- 主题必须贯穿应用壳层、复合卡片 iframe、基础卡片 iframe 和原生窗口；
- 不允许应用层自行实现另一套 iframe 拼接、主题注入或兼容分支。

## 3. 标准链路

1. 应用获得卡片文件路径；
2. 应用调用 `client.card.compositeWindow.render({ cardFile, mode, interactionPolicy? })`；
3. Host 解析复合卡片结构；
4. Host 依据 `capabilities.cardTypes` 分发到基础卡片插件；
5. Host 渲染基础卡片节点 iframe；
6. Host 拼接复合卡片文档并返回复合 iframe；
7. `CompositeCardWindow` 挂载最终 iframe；
8. 当主题运行时缓存键变化时，`CompositeCardWindow` 重新触发整条渲染链。

## 4. 主题同步链路

正式主题同步顺序如下：

1. Host `theme.getCurrent/getAllCss/resolve` 产出当前主题快照；
2. preload 将主题 CSS、变量和 `data-chips-theme-id`、`data-chips-theme-version` 注入应用文档；
3. 应用 `ChipsThemeProvider` 以 Host 当前主题初始化；
4. 组件库主题运行时生成缓存键；
5. `CompositeCardWindow` 监听缓存键变化后重新渲染复合卡片 iframe；
6. Host 卡片渲染服务把主题包 CSS 与解析后的变量一并注入复合文档和基础卡片文档；
7. 主题包自身的 `color-scheme` 必须保留，不得被渲染服务覆盖。

## 5. 基础卡片插件职责

每个基础卡片插件包应包含：

- 前端渲染模块
- 编辑器模块
- 信息与配置文件
- 内容模板
- 参数表与填写说明

通用能力可以通过公共模块复用，但基础卡片业务代码必须在插件包内闭环。

## 6. 组件契约

- `data-scope="composite-card-window"`
- `data-part="root|iframe|overlay|status"`
- `data-state="idle|resolving|rendering|ready|degraded|error|disabled"`

## 7. 节点解析与装配规则

- `structure.yaml` 中的 `structure[].type` 与内容文件中的 `card_type` 是复合卡片层节点类型标识；
- Host 分发时使用插件 `capabilities.cardTypes` 进行匹配；
- 当前正式匹配规则：
  - 先尝试直接匹配原始 `type/card_type`
  - 若节点类型满足 `*Card` 命名，再生成 `base.<去掉 Card 后的小写紧凑名>` 作为补充候选

例如：

- `RichTextCard` -> `base.richtext`
- `ImageCard` -> `base.image`
- `VideoCard` -> `base.video`

## 8. 运行时要求

- 外层只向应用层交付一个复合 iframe；
- 每个基础卡片节点在复合文档内部保持独立 iframe，以便失败隔离和尺寸回传；
- 节点加载完成后向复合窗口回传高度；
- 复合文档在初始装载、节点高度变化和整体布局变化后，必须向外层发送 `chips.composite:resize`，回传整张复合卡片当前总高度；
- 全部节点就绪后发送 `chips.composite:ready`；
- 当 `interactionPolicy = 'delegate'` 时，基础卡片 iframe 与复合壳层内部发生的滚轮、触摸滚动、捏合缩放等正式交互意图，必须通过 `chips.composite:interaction` 回传到应用壳层；
- 复合卡片处于 `mode: 'preview'` 时，基础卡片节点被点击后必须发送 `chips.composite:node-select`；
- 单节点失败时发送 `chips.composite:node-error`，同时在对应位置输出降级内容；
- 整体严重错误时发送 `chips.composite:fatal-error`。

`interactionPolicy` 约束：

- `native`：保持复合卡片内部原生滚动/触摸行为，不向应用壳层代理交互意图；
- `delegate`：由 Host 复合文档统一归一化基础卡片 iframe 与复合壳层的交互意图，再通过正式协议发送给应用壳层；
- 查看器、普通局部滚动容器等默认应使用 `native`；
- 编辑引擎无限画布中的展开态复合卡片，为了实现“卡片滚动驱动整桌面平移/缩放”，应使用 `delegate`。

## 9. 质量要求

- 复合卡片窗口、基础卡片内容和应用壳层必须共享同一主题来源；
- 主题切换后，卡片内容区与应用壳层的刷新结果必须一致；
- 原生窗口背景不得与内容窗口主题脱节；
- 不再保留旧版适配器兼容路径作为正式方案。

## 10. 编辑器配套链路

复合卡片显示链路的正式配套链路是基础卡片编辑器面板链路。

标准流程：

1. 编辑引擎卡片窗口统一使用 `client.card.compositeWindow.render({ cardFile, mode: 'preview', interactionPolicy })`；
2. 编辑引擎编辑面板统一使用 `client.card.editorPanel.render({ cardType, initialConfig, baseCardId })`；
3. Host 通过 `card.renderEditor` 路由到对应基础卡片插件；
4. 基础卡片插件导出 `renderBasecardEditor`，由 Host 装载到独立 iframe；
5. 编辑模式下，复合卡片 iframe 通过 `chips.composite:node-select` 把基础卡片选中事件回传给应用壳层；
6. 复合卡片展开态通过 `chips.composite:resize` 把当前总高度回传给应用壳层；
7. 编辑器通过 `chips.card-editor:*` 事件与应用壳层通信。

约束：

- 编辑器链路与显示链路必须共享同一插件能力匹配规则；
- 编辑引擎壳层只负责容器、选中态与数据保存，不负责插件源码装载；
- 编辑引擎应直接消费 `chips.composite:node-select`，不应在复合卡片旁再维护一套重复的基础卡片列表作为正式交互入口；
- 编辑引擎、查看器等应用不得自行探测 iframe 内部 DOM 高度，必须消费正式 `chips.composite:resize` / `client.card.compositeWindow.onResize(...)`；
- 需要由应用壳层接管复合卡片内部滚动/触摸意图的场景，必须消费正式 `chips.composite:interaction` / `client.card.compositeWindow.onInteraction(...)`，不得私接 iframe DOM；
- 不允许编辑引擎额外实现一套脱离 Host/SDK 的编辑器运行时。
