# Chips FileConversion Plugin

> 文件转换编排模块仓库。负责对外提供统一转换入口，并在 Host 模块运行时内编排 `card -> html`、`html -> pdf`、`html -> image` 原子能力。

## 当前状态

- 仓库已使用 `chips-scaffold-module` 完成初始化，具备正式模块工程骨架。
- 当前 `src/`、`contracts/` 与 `tests/` 仍保持脚手架示例基线。
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
- 正式能力契约、方法名与 schema 以仓库文档和生态共用技术文档为准，在阶段一完成替换。
- 模块间调用只能走 Host 注入的 `ctx.module.invoke(...)`，不得直接 `import` 其他模块源码。

## 文档入口

- `需求文档/01-文件转换编排模块需求规格说明.md`
- `技术文档/01-文件转换编排模块技术方案.md`
- `开发计划/00-开发计划索引.md`
