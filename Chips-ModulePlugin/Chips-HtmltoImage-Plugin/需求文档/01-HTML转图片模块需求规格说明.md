# HTML转图片模块需求规格说明

## 1. 模块定位

`Chips-HtmltoImage-Plugin` 是 `html -> image` 原子转换模块，只消费目录态 HTML 中间产物。

它不是页面渲染宿主。模块的正式职责是参数校验、导出请求编排、Host 能力调用与结果归一。

## 2. 功能目标

- 加载目录态 HTML 页面
- 应用截图尺寸、缩放倍率和背景策略
- 调用 Host 正式 HTML 渲染导出能力完成截图
- 输出图片文件
- 返回尺寸和警告信息

## 3. 功能需求

- `FR-01` 支持 HTML 根目录与入口文件输入
- `FR-02` 支持 PNG / JPEG / WebP 输出
- `FR-03` 支持尺寸、缩放倍率和背景参数
- `FR-04` 输出单个图片文件
- `FR-05` 读取并校验目录内 `conversion-manifest.json`
- `FR-06` 将输入参数映射为 Host `platform.renderHtmlToImage` 请求
- `FR-07` 将 Host 导出结果归一为模块正式输出
- `FR-08` 以 job 方式上报正式阶段进度并响应取消

## 4. 非功能需求

- `NFR-01` 不解析卡片文件
- `NFR-02` 不复制 HTML 生成逻辑
- `NFR-03` 与上游 HTML 中间产物目录结构稳定对齐
- `NFR-04` 不直接导入 `electron`
- `NFR-05` 不直接引入 `puppeteer` 或其他独立浏览器运行时
- `NFR-06` 页面截图能力必须通过 Host 正式能力提供
- `NFR-07` 输出效果必须与 Host 受控渲染页面一致

## 5. 验收口径

- 能稳定消费上游目录态 HTML
- 能通过 Host 正式截图链路生成目标图片文件
- 不直接导入 Electron，且通过 Host `platform.renderHtmlToImage` 完成导出
- 参数变化能够影响输出结果并可测试
- 输入缺失、清单非法、渲染失败、输出失败等场景能返回正式错误码

## 6. 当前实现状态

- 已实现 `converter.html.to-image/convert` job 方法
- 已实现 `conversion-manifest.json` 校验与入口文件检查
- 已实现 `platform.renderHtmlToImage` 参数映射
- 已覆盖 PNG、JPEG 背景归一、清单缺失、WEBP 不支持等单测场景
- 已覆盖真实打包插件安装后的 `card -> html -> image` 集成测试场景
