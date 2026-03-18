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
- `manifest.yaml` 已声明 `file-handler:.card` 与 `ui.launcher`，可同时接入文件关联与系统快捷方式链路
- 应用壳层、拖拽区、加载态与错误态统一消费主题变量
- 主题切换时应用壳层与卡片内容区同步刷新
- 复合卡片承载区域在横向窗口中按页面基准宽度居中收口，纵向窗口中接近满宽显示
- 启动时通过 `client.platform.getLaunchContext()` 恢复 `targetPath` 等启动参数
- 日志统一包含 `scope`、`traceId` 和必要上下文

## 5. 快捷方式与文件关联链路

卡片查看器当前接入了两条正式启动链路：

1. **系统快捷方式**
   - Host 读取 `ui.launcher.displayName/icon`
   - Windows 生成桌面快捷方式，macOS 生成启动台入口
   - 用户点击后统一回到 `plugin.launch`
   - 启动上下文包含 `trigger: 'app-shortcut'`

2. **文件关联 / 文件入口**
   - Host 或 `chips open <file>` 命中 `.card` 文件时，优先查找声明 `file-handler:.card` 的已启用应用插件
   - 若命中本插件，则通过 `plugin.launch` 打开卡片查看器
   - 启动上下文包含 `trigger: 'file-association'` 与 `targetPath`

应用入口当前会在首次渲染时读取 `launchContext.launchParams.targetPath`，若存在则直接恢复为当前待显示卡片文件。

## 6. 调试建议

开发态调试主题问题时，优先使用：

```bash
chipsdev plugin list
chipsdev theme current
chipsdev theme resolve
chipsdev doctor
```

如果你刚在 `chips` 中切换过主题，但 `chipsdev run` 结果没有变化，先确认自己正在查看的是开发工作区 `.chips-host-dev`，而不是用户工作区 `~/.chips-host`。
