# Chips CardtoHTML Plugin

> `card -> html` 原子转换模块仓库。负责把卡片正式显示链路转换为离线 HTML 交付物，并为 PDF / 图片模块提供中间 HTML 产物。

## 当前状态

- 已替换脚手架示例能力，正式对外提供 `converter.card.to-html/convert`。
- 当前实现通过 Host 正式动作完成 `card.render`、文件读写与 ZIP 打包，不复制私有渲染器。
- 仓库内保留正式需求、技术方案与阶段计划：
  - `需求文档/`
  - `技术文档/`
  - `开发计划/`

## 仓库定位

- 这是整个转换链路里的底层原子模块。
- 对外能力是“把卡片转换为 HTML 目录或 HTML 压缩包”。
- `Chips-HtmltoPDF-Plugin` 与 `Chips-HtmltoImage-Plugin` 的正式输入，都来自本仓生成的目录态 HTML 中间产物。

## 开发基线

- HTML 产物中的卡片内容必须与 Host `card.render(..., { target: "offscreen-render" })` 保持一致。
- 转换模块在最终导出阶段负责补充网页展示背景、响应式居中宽度和上下留白，但不改变卡片内容结构与渲染来源。
- 单次导出主题与语言覆盖统一依赖 Host `card.render(..., { options.themeId, options.locale })` 正式能力。
- 基础卡片前端显示代码必须复用正式卡片渲染链路，不得在本仓复制一套私有渲染实现。
- 中间 HTML 若供 PDF / 图片模块消费，必须包含自包含资源与 `conversion-manifest.json`。

## 当前输出

- `directory`：写出 `index.html`，按需写出 `assets/content/` 与 `conversion-manifest.json`。
- `zip`：先构建同结构目录，再通过 `zip.compress` 打包为最终 ZIP。
- `includeAssets=false` 只允许目录态直接导出，结果会保留原始 `file://` 引用并返回警告。
- `includeManifest=false` 会省略 `conversion-manifest.json`，仅适用于不再进入下游转换链路的直接 HTML 导出。

## 验证命令

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run validate`

## 文档入口

- `需求文档/01-卡片转HTML模块需求规格说明.md`
- `技术文档/01-卡片转HTML模块技术方案.md`
- `开发计划/00-开发计划索引.md`
