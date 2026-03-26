# 编辑引擎启动图标来源说明

- 正式来源目录：`/Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f-task008-图标系统搭建/design-assets/Appicon/`
- 对应源文件：
  - `EditingEngine.png`
  - `EditingEngine.ico`
  - `EditingEngine.icns`
- 同步时间：2026-03-26

## 当前工程内纳入版本控制的文件

- `app-icon.png`
- `app-icon.ico`
- `app-icon.icns`
- `app-icon.svg`

## 使用边界

- `app-icon.ico` 是 `manifest.yaml -> ui.launcher.icon` 的正式声明文件；
- Host 会按平台选择 `ico / icns / png` 作为系统入口图标；
- 这些文件只用于操作系统启动入口、快捷方式和安装分发链路；
- 编辑引擎运行时 UI 图标统一走 `ChipsIcon + IconDescriptor`，不消费这些文件。
