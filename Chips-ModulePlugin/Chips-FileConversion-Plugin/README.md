# Chips FileConversion Plugin

> 文件转换编排模块仓库。负责对外提供统一转换入口，并在 Host 模块运行时内编排 `card -> html`、`html -> pdf`、`html -> image` 原子能力。

## 当前状态

- 仓库已使用 `chips-scaffold-module` 完成初始化，具备正式模块工程骨架。
- `converter.file.convert` 编排能力已完成正式实现，`src/`、`contracts/` 与 `tests/` 已切换为真实转换链路实现。
- 本仓的正式需求、技术方案与阶段计划已经写入：
  - `需求文档/`
  - `技术文档/`
  - `开发计划/`

## 仓库定位

- 这是 `Chips-ModulePlugin/` 下对外统一的文件转换编排模块。
- 对调用方的唯一公开入口仍然是 Host 模块服务：`module.listProviders / module.resolve / module.invoke / module.job.*`。
- 本仓不新增插件类型，不新增 Host 服务域；它只是一个普通模块插件，通过内部流水线编排其他原子转换模块。

## 开发基线

- 工程入口、Manifest、构建脚本与测试骨架保持 `chips-scaffold-module` 正式口径。
- 正式能力契约、方法名与 schema 已按生态共用技术文档冻结为 `converter.file.convert/convert`。
- 模块访问 Host 文件动作统一使用 Host 注入的 `ctx.host.invoke("file.*", payload)`。
- 模块间调用只能走 Host 注入的 `ctx.module.invoke(...)`，不得直接 `import` 其他模块源码。

## 当前实现范围

- 对外统一提供 `converter.file.convert/convert` 异步任务方法。
- 支持 `card -> html`、`card -> pdf`、`card -> image`、`html -> pdf`、`html -> image` 五条正式流水线。
- `card -> pdf/image` 会先生成临时 HTML 目录，再继续调用原子模块完成最终导出。
- 子模块如果返回异步任务，本模块会统一轮询 `module.job.get`，并在父任务取消时联动取消子任务。
- 下游正式能力口径已收口为：
  - `card -> html` 透传 `themeId / locale` 到 Host `card.render`
  - `html -> pdf` 使用 Host `platform.renderHtmlToPdf`
  - `html -> image` 使用 Host `platform.renderHtmlToImage`

## 文档入口

- `需求文档/01-文件转换编排模块需求规格说明.md`
- `技术文档/01-文件转换编排模块技术方案.md`
- `开发计划/00-开发计划索引.md`
