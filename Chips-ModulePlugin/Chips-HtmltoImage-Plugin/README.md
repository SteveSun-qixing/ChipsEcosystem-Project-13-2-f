# Chips HtmltoImage Plugin

> `html -> image` 原子转换模块仓库。负责消费目录态 HTML 中间产物，并通过 Host 正式渲染导出能力输出图片文件。

## 当前状态

- 已实现正式模块能力 `converter.html.to-image/convert`。
- 当前模块通过 `ctx.host.invoke("platform.renderHtmlToImage", payload)` 调用 Host 正式截图链路。
- 仓库内已补齐：
  - 正式 `manifest.yaml`
  - 输入输出 schema
  - 模块源码
  - 单元测试
  - 打包级集成测试

## 仓库定位

- 本仓只消费目录态 HTML 中间产物，不直接处理卡片文件。
- 正式上游输入来自 `Chips-CardtoHTML-Plugin`。
- 正式下游交付物是 PNG / JPEG / WebP 图片文件。
- 尺寸、缩放倍率和背景策略在本仓内归一后，交由 Host 正式导出能力执行。

## 开发基线

- HTML 加载与截图输出必须通过 Host 正式动作 `platform.renderHtmlToImage` 实现。
- 模块会强制校验 `conversion-manifest.json`，只接受正式 HTML 中间产物目录。
- 本仓只处理页面级截图与导出，不复制上游 HTML 生成逻辑。
- 与上游 HTML 中间产物的目录结构、入口文件和元数据必须按正式契约对齐。
- 旧脚手架 `run/runAsync` 示例 schema 已移入 `contracts/归档/`，正式仓库只保留 `convert` 能力契约。

## 文档入口

- `需求文档/01-HTML转图片模块需求规格说明.md`
- `技术文档/01-HTML转图片模块技术方案.md`
- `开发计划/00-开发计划索引.md`
