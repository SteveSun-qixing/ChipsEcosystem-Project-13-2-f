# 箱子布局插件静态图标源目录说明

- 适用目录：`design-assets/Layouticon/`
- 同步时间：2026-05-29
- 生成脚本：`scripts/generate-plugin-material-icons.ts`
- 上游 SVG 缓存：`design-assets/material-symbols/svg/rounded/`
- 视觉基线：白色背景、黑色 Material Symbols Rounded 图标。
- 转换链路：官方 Material Symbols Rounded SVG -> 512px 白底黑色 SVG/PNG -> iconMaker ICO/ICNS 编码器。

## 目录职责

- 本目录保存箱子布局插件静态身份图标的正式设计源；
- 工程内同步到 `assets/icons/layout-icon.*`，用于插件静态身份、物料清点和后续展示链路；
- 布局运行时图标仍以 `layoutDefinition.icon` 与 `ChipsIcon + IconDescriptor` 为准；
- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。

## 当前正式命名基线

| 源文件基名 | Material Symbols 名称 | 对应工程 | 正式输出物 |
| --- | --- | --- | --- |
| `grid-BLP` | `grid_view` | `Chips-BoxLayoutPlugin/grid-BLP` | `Chips-BoxLayoutPlugin/grid-BLP/assets/icons/layout-icon.png/.ico/.icns/.svg` |
| `list-BLP` | `view_list` | `Chips-BoxLayoutPlugin/list-BLP` | `Chips-BoxLayoutPlugin/list-BLP/assets/icons/layout-icon.png/.ico/.icns/.svg` |

## 更新规则

- 图标调整时，先更新本目录正式源文件，再通过 `scripts/generate-plugin-material-icons.ts` 同步所有输出；
- 不再使用字体码位、HTML 文本渲染或截图方式生成图标，避免出现乱码；
- 每次改动本目录资产，必须同步更新本文件与对应工程 `assets/icons/SOURCE.md`；
- 运行时 UI 图标仍通过生态正式 `ChipsIcon + IconDescriptor` 链路渲染。
