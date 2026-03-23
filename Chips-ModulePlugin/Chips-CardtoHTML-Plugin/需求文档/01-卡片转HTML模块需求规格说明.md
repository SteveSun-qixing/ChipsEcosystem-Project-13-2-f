# 卡片转HTML模块需求规格说明

## 1. 模块定位

`Chips-CardtoHTML-Plugin` 是整个转换链路的底层原子模块，负责把卡片转换为：

- 目录态 HTML 中间产物
- 压缩态 HTML 最终交付物

## 2. 功能目标

- 复用正式卡片显示链路生成 HTML
- 收集并复制资源
- 重写离线资源路径
- 按需生成转换清单
- 输出目录或压缩包

## 3. 功能需求

- `FR-01` 支持 `.card` 文件与目录态卡片作为输入
- `FR-02` 支持 `directory` 与 `zip` 两种输出模式
- `FR-03` 必须通过 Host `card.render(..., { target: "offscreen-render" })` 获取正式 HTML 视图
- `FR-04` HTML 导出结果中的卡片内容必须与 Host `card.render` 一致
- `FR-05` 支持将请求中的 `themeId / locale` 透传到 Host `card.render` 单次调用覆盖参数
- `FR-06` `includeAssets=true` 时，模块必须识别 `file://` 资源根、复制资源树，并改写为导出目录相对路径
- `FR-07` `includeAssets=false` 时，仅允许 `directory` 输出，并返回“保留原始 `file://` 引用”的结构化警告
- `FR-08` `includeManifest=true` 时必须生成 `conversion-manifest.json`；`includeManifest=false` 时允许省略，但结果不得作为 PDF / 图片链路中间产物
- `FR-09` 目录态输出至少包含 `index.html`；当 `includeAssets=true` 时包含 `assets/content/`；当 `includeManifest=true` 时包含 `conversion-manifest.json`
- `FR-10` `zip` 输出必须复用同一份目录构建逻辑，并在末阶段通过 Host ZIP 能力打包
- `FR-11` 输出已存在且 `overwrite=false` 时必须拒绝覆盖
- `FR-12` 资源复制、文件写入或打包失败时，必须清理本次产生的部分输出与临时目录
- `FR-13` 失败时返回结构化错误，成功时可返回结构化警告
- `FR-14` 模块必须在最终导出 HTML 上补充网页展示背景、响应式居中宽度和上下留白
- `FR-15` 导出展示壳层不得引入查看器运行时逻辑，不得改写卡片内部语义结构

## 4. 非功能需求

- `NFR-01` 不复制一套私有基础卡片渲染器
- `NFR-02` 模块运行时只通过 Host 注入的正式动作访问系统能力
- `NFR-03` 对资源型基础卡片必须保持路径正确
- `NFR-04` 目录态中间产物必须满足下游 PDF / 图片模块的正式输入约束
- `NFR-05` 输出目录结构必须稳定
- `NFR-06` 导出展示壳层和卡片内容一致性必须可回归验证

## 5. 验收口径

- HTML 导出产物能在离线环境打开
- 目录态输出可被 PDF / 图片模块直接消费
- 指定 `themeId / locale` 时，导出结果必须反映对应主题和语言覆盖
- 直接 HTML 导出若选择省略 manifest 或资源，结果必须返回明确警告，并且不影响正式中间产物链路约束
- 资源复制失败、写入失败和打包失败时，不得残留本次转换生成的脏输出
- 卡片内容与 Host 正式卡片显示结果保持一致，同时导出页面具备正式背景与留白布局
