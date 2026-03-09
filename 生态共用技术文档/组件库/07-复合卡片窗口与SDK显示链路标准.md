# 复合卡片窗口与 SDK 显示链路标准

## 1. 组件定义

`CompositeCardWindow` 是生态统一复合卡片展示组件，输出为复合卡片 iframe 窗口。

## 2. 链路原则

- 所有应用统一调用 SDK 显示接口
- 应用层仅传入卡片文件并挂载返回窗口
- 基础卡片分发、模板编译、iframe 拼接由 Host 内置渲染运行时处理（可通过 SDK 接口调用）

## 3. 标准链路

1. 用户拖动/导入/内核传递卡片文件
2. 应用调用 SDK 显示接口
3. Host 内置渲染运行时解析复合卡片结构
4. Host 内置渲染运行时分发到基础卡片插件渲染模块
5. 各基础卡片插件编译HTML并输出 iframe
6. Host 内置渲染运行时拼接为复合卡片窗口
7. `CompositeCardWindow` 渲染最终 iframe

## 4. 基础卡片插件职责

每个基础卡片插件包应包含：

- 前端渲染窗口模块
- 编辑器模块
- 信息与配置文件
- 内容模板
- 参数表与填写说明

通用底层能力可由公共模块复用，但基础卡片业务代码在插件包内闭环。

## 5. 组件契约

- `data-scope="composite-card-window"`
- `data-part="root|iframe|overlay|status"`
- `data-state="idle|resolving|rendering|ready|degraded|error|disabled"`

## 6. 质量与安全要求

- 单节点失败可降级，整体窗口不崩溃
- iframe 沙箱与通信边界必须受控
- `mode` 参数仅允许 `view | preview`
- 建议 SDK 输出 iframe origin，组件端按白名单过滤消息来源
- `ready` 语义应兼容两类完成信号：
  - 复合卡片运行时主动发送 `chips.composite:ready`
  - 纯 `srcdoc` / 静态 iframe 至少在原生 `load` 后视为已可展示
- 查看器、编辑器、其他应用调用行为一致

## 6.1 基础卡片节点解析规则

- `structure.yaml` 中的 `structure[].type` 与内容文件中的 `card_type` 是复合卡片层的节点类型标识。
- Host 在分发到基础卡片插件时，使用插件 `capabilities.cardTypes` 进行匹配。
- 当前正式匹配规则：
  - 先尝试直接匹配 `type/card_type` 原值；
  - 若节点类型满足 `*Card` 命名，则再生成 `base.<去掉Card后的小写紧凑名>` 作为插件能力候选。
- 例如：
  - `RichTextCard` -> `base.richtext`
  - `ImageCard` -> `base.image`
  - `VideoCard` -> `base.video`

## 6.2 复合窗口运行时要求

- 外层 `CompositeCardWindow` 最终仍只向应用层交付一个复合 iframe。
- 该复合 iframe 内部必须按结构顺序拼接基础卡片节点窗口。
- 每个基础卡片节点窗口应以独立 iframe 形态交付，便于失败隔离、尺寸回传和后续交互扩展。
- 节点 iframe 加载完成后，应向复合窗口回传高度；复合窗口负责更新节点 iframe 高度并在全部节点完成后发送 `chips.composite:ready`。
- 节点失败时，复合窗口应发送 `chips.composite:node-error`，同时在对应位置显示降级内容。

## 7. SDK 显示接口接入规则

在 `Chips-SDK` 交付统一显示接口之后，组件库与上层应用应优先通过 SDK 接入：

- 封面窗口：`client.card.coverFrame.render({ cardFile, cardName? })`
- 复合窗口：`client.card.compositeWindow.render({ cardFile, mode?: 'view' | 'preview' })`

在以下情况下仍可使用适配器契约作为兼容路径：

- 运行环境使用的是未内置新版 SDK 的旧版 Host；
- 处于渐进迁移阶段，需要同时兼容“无 SDK” 与 “有 SDK” 两种环境。

适配器契约保持不变：

- `resolveCoverFrame({ cardId, cardFile, cardName, signal })`
- `resolveCompositeWindow({ cardFile, mode, signal })`

统一显示接口实现与本标准的落地情况见工单闭环记录：`工单001-SDK-UNIFIED-CARD-DISPLAY-API`。
