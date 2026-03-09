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
cd Chips-CardViewer
npm install
npm run dev        # 启动开发服务器（chipsdev server）
chipsdev run       # 启动完整 Host 底层并加载当前应用插件
```

在 Host 中加载本插件后：

- 可以将 `*.card` 文件拖入窗口；
- 或通过 Host 菜单“用卡片查看器打开”传入卡片文件；
- 或通过 `cardViewer.pickCard` 路由由 Host 弹出文件选择器。

## 3. 技术要点

- React + `@chips/component-library` + 主题系统；
- 统一卡片显示链路：`window.chips.client.card.compositeWindow.render({ cardFile, mode: 'view' })`；
- 多语言与配置均通过独立文件管理，避免硬编码；
- 日志封装为单独模块，预留接入 Host 日志服务入口。

