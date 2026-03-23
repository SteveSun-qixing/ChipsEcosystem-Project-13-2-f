# HTML转PDF模块技术方案

## 1. 当前实现状态

本仓已完成 `converter.html.to-pdf/convert` 正式实现，运行时基于 Host 注入上下文工作，不再依赖脚手架示例能力。

## 2. 正式结构

当前内部结构分为：

- `src/index.ts`：模块 provider 导出
- `src/exporter.ts`：输入归一、路径校验、Host 调用、结果校验、进度上报
- `src/errors.ts`：模块错误与警告模型
- `src/types.ts`：请求、结果与上下文类型

## 3. 输入约束

本仓只接受目录态 HTML：

- `htmlDir`
- `entryFile`
- `outputFile`
- PDF 页面参数

## 4. 实现路线

- 校验并归一 `htmlDir / entryFile / outputFile / options`
- 对 `entryFile` 做路径归一，禁止越出 `htmlDir`
- 通过 `file.stat` 校验 `htmlDir` 与入口文件存在
- 通过 `ctx.host.invoke("platform.renderHtmlToPdf", payload)` 请求 Host 导出
- 由 Host 在受控离屏页面环境中加载 `entryFile`
- 由 Host 等待页面稳定并调用 PDF 输出能力
- 对复合卡片 HTML，Host 必须继续等待 iframe 文档加载、基础卡片高度上报与复合卡片 `ready/resize` 稳定
- 模块对 Host 返回值再做结构校验，并确认输出文件已写出
- 模块按 `prepare -> render-pdf -> completed` 上报 job 进度

补充约束：

- 模块不得直接 `import("electron")`
- 模块不得自行创建 `BrowserWindow`
- `entryFile` 必须保持在 `htmlDir` 内，路径边界由模块与 Host 双侧共同校验
- 为避免当前构建链路把 Node 内建模块浏览器外置化，本仓不在运行时代码中依赖 `node:path`

## 5. 测试重点

- HTML 输入存在性测试
- 参数映射测试
- `platform.renderHtmlToPdf` 请求映射测试
- PDF 输出成功 / 失败测试
- 非法 `entryFile`、非法 `pageSize`、输出文件缺失、Host 返回非法结果测试
- 与上游 HTML 模块联调测试

## 6. 安装级验证

本仓补充了打包安装级验证脚本：

- 先执行 `chipsdev build + chipsdev package`
- 再执行 `chipsdev plugin install + chipsdev plugin enable`
- 最后在 Host 模块服务上调用 `module.invoke`

为保证 CI 和终端环境下的稳定回归，该脚本默认使用 Host `BrowserWindow` mock 验证正式调用链路，而不是在测试进程里直接旁路 Electron。

补充说明：

- mock e2e 负责验证正式模块调用链路、schema 与 Host 路由集成
- mock e2e 产出的 PDF 仅用于链路校验，不作为视觉验收文件
- 真正的 PDF 像素级导出结果必须在 Electron Host 进程内完成最终验收；纯 Node 进程下会返回 `PLATFORM_UNSUPPORTED`
