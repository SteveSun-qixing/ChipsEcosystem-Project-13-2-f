# 卡片转HTML模块技术方案

## 1. 当前仓库基线

本仓当前已经完成脚手架初始化，但正式转换能力仍未替换脚手架示例能力。

## 2. 正式实现路线

建议内部结构分为：

- `card-render-adapter`
- `html-rewriter`
- `asset-collector`
- `package-writer`
- `manifest-writer`

## 3. 渲染来源

本仓的 HTML 原文来源必须是 Host 正式卡片渲染结果：

- 调用 `card.render(..., { target: "offscreen-render" })`
- 获取复合卡片 HTML 文档
- 基于 Host 生成结果做离线化处理

## 4. 资源策略

本仓需要对资源做三件事：

- 识别页面与 iframe 中引用的资源
- 复制资源到导出目录
- 把引用改写为导出目录相对路径

## 5. 输出模式

- `directory`：作为下游中间产物
- `zip`：作为最终 HTML 交付物

这两种模式必须复用同一份目录构建逻辑，只在最后一步是否压缩上分叉。

## 6. 测试重点

- Host 渲染结果接入测试
- 资源重写测试
- 目录态和压缩态输出测试
- 视觉回归测试
