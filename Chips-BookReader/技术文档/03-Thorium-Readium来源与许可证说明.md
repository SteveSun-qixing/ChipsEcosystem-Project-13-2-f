# Thorium / Readium 来源与许可证说明

## 1. 来源

本项目本轮实现直接参考并移植了以下上游源码与资源：

- `thorium-reader-develop/LICENSE`
- `thorium-reader-develop/src/resources/ReadiumCSS/**`
- `thorium-reader-develop/src/r2-xxx-js/r2-navigator-js/electron/common/readium-css-inject.ts`
- `thorium-reader-develop/src/r2-xxx-js/r2-navigator-js/electron/common/readium-css-settings.ts`
- `thorium-reader-develop/src/r2-xxx-js/r2-navigator-js/electron/common/pagination.ts`
- `thorium-reader-develop/src/r2-xxx-js/r2-navigator-js/electron/renderer/webview/readium-css.ts`

本项目内对应的正式落地点：

- `src/domain/readium/assets/ReadiumCSS/**`
- `src/domain/readium/runtime.ts`

## 2. 许可证

- Thorium Reader 使用 BSD-3-Clause。
- BSD-3-Clause 允许复制、修改、再分发，但必须保留版权声明、许可证文本和免责条款。

## 3. 本项目的处理方式

- 对移植和改写的运行时代码保留上游 BSD 版权头。
- `ReadiumCSS` 资源文件按原目录结构随项目一起分发。
- 外部暴露的仍然是薯片生态自己的应用接口、manifest、主题、多语言和 Host 契约。
- 未迁入 Thorium 的 Electron 主进程、Redux、书架、设置、OPDS、LCP/DRM 等非阅读器内核代码。

## 4. 改写边界

本项目不是把 Thorium 整体搬入，而是做了以下深度改造：

- 把 Electron / webview / IPC 依赖改写成普通 iframe DOM 运行时。
- 把 ReadiumCSS 资源从上游目录收口到插件内部资产目录。
- 把分页、滚动、fragment 定位和视口重对齐逻辑收口到 `ReadiumDocumentController`。
- 保持 React 应用壳、主题系统、多语言、Host 启动链路和阅读器 UI 仍由薯片生态自身实现。
