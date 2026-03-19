# Chips CardtoHTML Plugin

> `card -> html` 原子转换模块仓库。负责把卡片正式显示链路转换为离线 HTML 交付物，并为 PDF / 图片模块提供中间 HTML 产物。

## 当前状态

- 仓库已使用 `chips-scaffold-module` 完成初始化，具备正式模块工程骨架。
- 当前 `src/`、`contracts/` 与 `tests/` 仍保持脚手架示例基线。
- 本仓的正式需求、技术方案与阶段计划已经写入：
  - `需求文档/`
  - `技术文档/`
  - `开发计划/`

## 仓库定位

- 这是整个转换链路里的底层原子模块。
- 对外能力是“把卡片转换为 HTML 目录或 HTML 压缩包”。
- `Chips-HtmltoPDF-Plugin` 与 `Chips-HtmltoImage-Plugin` 的正式输入，都来自本仓生成的目录态 HTML 中间产物。

## 开发基线

- HTML 产物的视觉效果必须与 Host `card.render(..., { target: "offscreen-render" })` 保持一致。
- 基础卡片前端显示代码必须复用正式卡片渲染链路，不得在本仓复制一套私有渲染实现。
- 资源复制、路径重写、主题保真、压缩打包策略以仓库文档和生态共用技术文档为准。

## 文档入口

- `需求文档/01-卡片转HTML模块需求规格说明.md`
- `技术文档/01-卡片转HTML模块技术方案.md`
- `开发计划/00-开发计划索引.md`
