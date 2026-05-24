# 应用启动图标说明

## 纳入版本控制的文件

- `app-icon.png`
- `app-icon.ico`
- `app-icon.icns`
- `app-icon.svg`

## 使用边界

- `app-icon.ico` 是 `manifest.yaml -> ui.launcher.icon` 的正式默认文件；
- 生成工程后，Host 会按平台选择 `ico / icns / png` 作为系统入口图标；
- 这些文件只属于操作系统入口图标链路，不属于运行时 `ChipsIcon` 图标模型。
