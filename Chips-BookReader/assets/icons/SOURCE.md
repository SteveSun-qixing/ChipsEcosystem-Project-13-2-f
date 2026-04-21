# 书籍阅读器启动图标来源说明

- 正式来源目录：`/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f/design-assets/Appicon/`
- 对应源文件：
  - `AppIcon.png`
  - `AppIcon.ico`
  - `AppIcon.icns`
- 同步时间：2026-04-18

## 当前工程内纳入版本控制的文件

- `app-icon.png`
- `app-icon.ico`
- `app-icon.icns`
- `app-icon.svg`

## 使用边界

- 当前 `Chips-BookReader` 尚无单独的书籍阅读器专属入口图标设计源，因此正式沿用 `design-assets/Appicon/AppIcon.*` 默认应用入口图标链路；
- `app-icon.ico` 是 `manifest.yaml -> ui.launcher.icon` 的正式声明文件；
- Host 会按平台选择 `ico / icns / png` 作为系统入口图标；
- 这些文件只属于操作系统入口图标链路，不属于运行时 `ChipsIcon` 图标模型。
