# 卡片查看器 · Chips Card Viewer

> 仓库：`Chips-CardViewer`  
> 插件类型：应用插件（`type: app`）  
> 角色：统一卡片显示链路的查看器应用套壳

## 1. 功能概述

卡片查看器是薯片生态内的一个简单应用插件，用于：

- 接收卡片文件（`.card`）路径；
- 通过 SDK 统一卡片显示接口调用 Host 内置渲染运行时；
- 在应用窗口中展示复合卡片 iframe。

应用本身不负责基础卡片分发、模板编译或 iframe 拼接，这些逻辑全部由 Host 渲染运行时与基础卡片插件完成。

## 2. 运行方式

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-CardViewer
npm run dev        # 启动开发服务器（chipsdev server）
chipsdev run       # 启动完整 Host 底层并加载当前应用插件
```

`Chips-CardViewer` 的 `chips-sdk`、`@chips/component-library`、`chipsdev` 和 ESLint 工具链统一由生态根工作区解析，不再单独维护一套本地 `file:` 依赖或子工程独立安装链路。

在 Host 中加载本插件后：

- 可以将 `*.card` 文件拖入窗口；
- 或通过 Host 菜单“用卡片查看器打开”传入卡片文件；
- 或通过应用内“打开卡片”按钮调用 `platform.dialogOpenFile` 选择文件。

## 3. 技术要点

- React + `@chips/component-library` + 主题系统；
- 统一卡片显示链路：`chips-sdk -> client.card.compositeWindow.render({ cardFile, mode: 'view' })`；
- 查看器壳层、拖拽区、加载态与错误态统一消费主题变量，不再保留深色/暖色硬编码兜底；
- 多语言与配置均通过独立文件管理，避免硬编码；
- 日志封装为单独模块，当前输出到浏览器控制台，字段统一包含时间、scope、traceId 与必要上下文。

## 4. 调试日志

当前版本已为以下链路补齐控制台调试日志：

- 应用启动、React 根挂载、全局 `error` / `unhandledrejection`；
- 拖拽进入、离开、投放、文件路径解析；
- 按钮打开文件对话框、Host 返回选择结果；
- `client.card.compositeWindow.render` 调用开始、返回 iframe、挂载完成；
- `chips.composite:ready`、`chips.composite:node-error`、`chips.composite:fatal-error`；
- iframe 原生 `load/error` 与组件清理阶段。

拖拽导入的本地文件路径解析走 `window.chips.platform.getPathForFile(file)`，由 Host preload 通过 Electron `webUtils` 提供，避免依赖已废弃的 `File.path`。

排查时可直接在 DevTools Console 中搜索 `card-viewer:` 或 `trace=`。
