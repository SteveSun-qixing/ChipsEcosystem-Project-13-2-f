# 卡片查看器 · Chips Card Viewer

> 仓库：`Chips-CardViewer`
> 插件类型：应用插件（`type: app`）
> 角色：统一卡片显示链路的查看器应用套壳

## 1. 功能概述

卡片查看器用于：

- 接收卡片文件（`.card`）路径；
- 通过 SDK 调用 Host 统一卡片显示链路；
- 在应用窗口中展示复合卡片 iframe；
- 跟随当前工作区主题同步应用壳层、复合卡片内容区和窗口外观。

应用本身不负责基础卡片分发、模板编译或 iframe 拼接，这些逻辑全部由 Host 渲染运行时完成。

## 2. 运行方式

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
cd Chips-CardViewer
chipsdev theme list
chipsdev run
```

`chipsdev run` 会在开发工作区 `.chips-host-dev` 中启动真实 Electron Host，并加载当前应用插件。

## 3. 主题链路

卡片查看器当前使用正式主题链路：

1. Host preload 在应用文档中注入当前主题 CSS、变量和 `data-chips-theme-id` / `data-chips-theme-version`；
2. 应用入口先读取文档注入主题，再调用 `client.theme.getCurrent()` 做启动校准；
3. `ChipsThemeProvider` 以 Host 当前主题作为初始状态，并订阅 `theme.changed`；
4. `CardWindow` 监听主题运行时缓存键变化，在主题切换后重新渲染复合卡片 iframe；
5. 原生窗口背景若未显式指定，由 Host 从当前主题 token 自动推导；
6. 复合卡片内容区保留主题包自己的 `color-scheme`，不再被服务层强制改回浅色模式。

## 4. 技术要点

- React + `@chips/component-library` + `chips-sdk`
- 统一卡片显示接口：`client.card.compositeWindow.render({ cardFile, mode: 'view' })`
- 应用壳层、拖拽区、加载态与错误态统一消费主题变量
- 主题切换时应用壳层与卡片内容区同步刷新
- 日志统一包含 `scope`、`traceId` 和必要上下文

## 5. 调试建议

开发态调试主题问题时，优先使用：

```bash
chipsdev plugin list
chipsdev theme current
chipsdev theme resolve
chipsdev doctor
```

如果你刚在 `chips` 中切换过主题，但 `chipsdev run` 结果没有变化，先确认自己正在查看的是开发工作区 `.chips-host-dev`，而不是用户工作区 `~/.chips-host`。
