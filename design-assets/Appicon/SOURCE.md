# 应用启动图标源目录说明

- 适用目录：`design-assets/Appicon/`
- 同步时间：2026-03-26

## 目录职责

- 本目录只保存应用插件系统入口图标的正式设计源；
- 对应运行时消费链路为 `manifest.ui.launcher.icon`、Host 安装复制、快捷方式解析、安装分发与启动台入口；
- 本目录不是运行时 UI 图标目录，运行时 UI 图标统一使用 `design-assets/material-symbols/` 与 `ChipsIcon + IconDescriptor`；
- 基础卡片 `basecard-icon.svg`、布局插件 `layout-icon.svg` 不再从本目录出源，正式来源已收口到各自工程 `assets/icons/`。

## 当前正式命名基线

| 源文件基名 | 对应工程 | 正式输出物 |
| --- | --- | --- |
| `AppIcon` | `Chips-Scaffold/chips-scaffold-app` 默认模板 | `assets/icons/app-icon.png/.ico/.icns` |
| `CardViewer` | `Chips-CardViewer` | `assets/icons/app-icon.png/.ico/.icns` |
| `EcoSettingsPanel` | `Chips-EcoSettingsPanel` | `assets/icons/app-icon.png/.ico/.icns` |
| `EditingEngine` | `Chips-EditingEngine` | `assets/icons/app-icon.png/.ico/.icns` |

## 更新规则

- 应用启动图标调整时，先更新本目录正式源文件，再同步复制到对应工程 `assets/icons/app-icon.*`；
- 脚手架默认应用图标只允许从 `AppIcon.*` 派生，不允许在模板内自行维护另一套来源；
- 每次改动本目录资产，必须同步更新本文件与对应工程 `assets/icons/SOURCE.md`；
- 不再新增基础卡片或布局插件的旧式 `*.png/.ico/.icns` 导出到本目录。

## 归档说明

- `design-assets/Appicon/归档/2026-03-26-旧版插件图标导出/` 保存历史遗留的基础卡片插件导出文件；
- 这些归档文件不再属于当前正式设计资产入口，也不参与任何运行时或打包链路。
