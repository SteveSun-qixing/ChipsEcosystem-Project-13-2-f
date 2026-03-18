# 复合卡片窗口与 SDK 显示链路标准

## 1. 组件定义

`CompositeCardWindow` 是生态对外公开的通用复合卡片显示组件，最终向应用层交付一个由 Host 托管的复合 iframe 窗口。

适用范围：

- 查看器等查看态应用；
- 需要 Host 托管复合卡片显示的应用插件；
- 第三方集成场景；
- 需要消费正式 `chips.composite:*` 事件协议的场景。

不适用范围：

- 官方编辑引擎的编辑态复合卡片窗口。

编辑引擎的正式编辑态链路遵循 `生态共用技术文档/组件库/08-编辑引擎基础卡片装配与编辑运行时标准.md`。

## 2. 链路原则

- 通用应用层统一通过 SDK 调用卡片显示接口；
- Host 是通用复合卡片渲染、主题解析和窗口编排的唯一执行方；
- 主题必须贯穿应用壳层、复合卡片 iframe、基础卡片 iframe 和原生窗口；
- 除官方编辑引擎编辑态链路外，不允许应用层自行实现第二套复合 iframe 拼接、主题注入或兼容分支。

## 3. 标准链路

1. 应用获得卡片文件路径；
2. 应用调用 `client.card.compositeWindow.render({ cardFile, mode, interactionPolicy? })`；
3. Host 解析复合卡片结构；
4. Host 依据 `capabilities.cardTypes` 分发到基础卡片插件；
5. Host 先为每个基础卡片生成独立的单卡运行时文档，并在该文档内挂载插件 `renderBasecardView`；
6. Host 复合层只负责拼接这些单卡 iframe 区域，不再在复合链路中把基础卡片预渲染成静态 HTML；
7. Host 拼接复合卡片文档并返回复合 iframe；
8. `CompositeCardWindow` 挂载最终 iframe；
9. 当主题运行时缓存键变化时，`CompositeCardWindow` 重新触发整条渲染链。

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

每个基础卡片插件包应完整提供：

- `renderBasecardView`
- `renderBasecardEditor`
- 信息与配置文件
- 内容模板
- 参数表与填写说明

通用能力可以通过公共模块复用，但基础卡片业务代码必须在插件包内闭环。

其中：

- Host 通用显示链路会把插件导出包装到正式 iframe 文档中；
- 官方编辑引擎会按 `08` 号文档定义，静态注册并消费同一组导出；
- 普通应用和第三方集成不得自行扫描插件目录并直接 import 插件源码。

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
- 基础卡片的真实渲染职责属于单卡运行时文档；复合文档只消费这些单卡文档并做区域装配，不得在复合链路里把节点提前拍扁成静态 HTML 片段；
- 复合文档正式只承担基础卡片节点编排职责，不额外输出卡片标题、基础卡片计数、节点外框或其他壳层装饰；
- 对引用卡片内部资源的基础卡片，Host 必须向单卡文档提供可解析卡片根目录相对路径的资源基准地址；
- 若输入是打包态 `.card` 文件，Host 为复合渲染解析出的卡片根目录必须在复合 iframe 生命周期内保持稳定可访问，不能在 `card.render(...)` 返回前提前清理；
- 节点加载完成后向复合窗口回传高度；
- 节点高度回传必须覆盖容器宽度变化引发的重排，确保图片等按宽度缩放的基础卡片在显示区域收窄或放宽时同步更新高度；
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
- 需要把复合卡片内部滚动解释为外层桌面平移/缩放的通用应用场景，才使用 `delegate`。

## 9. 质量要求

- 复合卡片窗口、基础卡片内容和应用壳层必须共享同一主题来源；
- 主题切换后，卡片内容区与应用壳层的刷新结果必须一致；
- 原生窗口背景不得与内容窗口主题脱节；
- 不再保留旧版适配器兼容路径作为正式方案。

## 10. Host 托管编辑器面板链路

`client.card.editorPanel.render(...)` 是与 `CompositeCardWindow` 配套的 Host 托管编辑器 iframe 链路，适用于：

- 第三方宿主集成；
- 需要 Host 统一托管编辑器 iframe 的应用；
- 调试、嵌套检查或需要严格沿 `chips.card-editor:*` 协议通信的场景。

标准流程：

1. 应用调用 `client.card.editorPanel.render({ cardType, initialConfig, baseCardId, resources? })`；
2. Host 通过 `card.renderEditor` 路由到对应基础卡片插件；
3. Host 装载插件 `renderBasecardEditor` 并生成正式编辑器文档；
4. 编辑器文档通过正式 `chips.card-editor:resource-*` 协议向外请求资源解析、导入、删除和释放；
5. SDK 把该文档封装为 iframe，并在应用提供 `resources` 时挂接本地资源桥；
6. 应用通过 `chips.card-editor:*` 或 SDK 事件订阅接收状态与配置变化。

约束：

- 编辑器链路与显示链路必须共享同一插件能力匹配规则；
- `resourcePath` 一律使用相对于卡片根目录的路径；
- `resources` 属于 SDK 本地桥配置，不进入 Host `card.renderEditor` 正式输入契约；
- 普通应用与第三方集成不得绕过 SDK/Host 直接 import 基础卡片插件源码；
- 查看器等 Host 托管场景必须消费正式 iframe 事件协议，而不是私接 iframe 内部 DOM；
- 官方编辑引擎不再把 `editorPanel` 作为其正式主编辑链路。

## 11. 与编辑引擎链路的关系

- `CompositeCardWindow + editorPanel` 仍是生态公开的通用 Host 托管链路；
- 官方编辑引擎的编辑态链路改为“单卡 iframe 拼装 + 本地 EditorHost”，详见 `08` 号文档；
- 两条链路共享同一套 `cardType` 匹配规则、主题 token 来源和基础卡片插件导出；
- 编辑引擎的本地运行时是被正式定义的特例，不意味着其他应用可以自由复制第二套实现。
