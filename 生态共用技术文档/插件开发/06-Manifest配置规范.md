# Manifest配置规范

## 文档定位

本文档定义插件 `manifest.yaml` 的正式公共契约。

当前重点更新：

- `runtime.targets`
- `ui.surface`
- `capabilityFallbacks`

这些字段已经被 Host 运行时、`chipsdev validate`、Scaffold 模板和官方插件清单共同采用。

## 1. 基础要求

- 文件名必须为 `manifest.yaml`
- 文件必须位于插件包根目录
- 工程根 `manifest.yaml` 是唯一正式清单源

`chipsdev` 当前正式行为：

- `chipsdev build` 只生成构建产物
- `chipsdev run` 使用工程根 `manifest.yaml`
- `chipsdev package` 将工程根 `manifest.yaml` 写入包根，并把构建产物放到包内 `dist/`

## 2. 基础字段

必填基础字段：

- `id`
- `name`
- `version`
- `type`
- `entry`

`type` 取值：

- `app`
- `card`
- `layout`
- `module`
- `theme`

`entry` 规则：

- `app/card/layout/module` 通常为字符串，如 `dist/index.html` 或 `dist/index.js`
- `theme` 必须为对象，并显式声明 `tokens` 与 `themeCss`

## 3. 运行目标矩阵：`runtime.targets`

所有正式插件都应声明运行目标矩阵：

```yaml
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: false
```

规则：

1. `runtime.targets` 必须是对象。
2. `desktop / web / mobile / headless` 四个目标必须全部出现。
3. 每个目标当前只接受：

```yaml
supported: <boolean>
```

4. Host 在运行 `type: app` 插件时，会根据当前 `hostKind` 检查目标是否支持。

当前实现状态说明：

- Desktop / Headless 宿主已落地
- Web / Mobile 目标位已冻结，但对应 Shell 仍处于预留状态

## 4. 应用插件界面语义：`ui.surface`

只有 `type: app` 插件允许声明 `ui.surface`。

```yaml
ui:
  surface:
    defaultKind: window
    preferredKinds:
      desktop: window
      web: route
      mobile: fullscreen
      headless: window
```

规则：

1. `ui.surface` 只能出现在 `app` 插件中。
2. `defaultKind` 必须属于：
   - `window`
   - `tab`
   - `route`
   - `modal`
   - `sheet`
   - `fullscreen`
3. `preferredKinds` 必须覆盖合法目标平台标识。
4. Host 在 `surface.open(target=plugin)` 时，会优先按：
   - 调用方显式请求的 `kind`
   - `ui.surface.preferredKinds[currentHostKind]`
   - `ui.surface.defaultKind`
   - Host 默认值
   进行解析。

## 5. 应用插件原生壳层：`ui.window` 与 `ui.launcher`

`ui.window.chrome` 仍然保留，用于桌面原生窗口外观基线。

`ui.launcher` 用于系统快捷方式 / 启动台入口元数据。

```yaml
ui:
  window:
    chrome:
      titleBarStyle: hidden
      titleBarOverlay:
        color: "#ffffff00"
        symbolColor: "#667085"
        height: 44
  launcher:
    displayName: 图片查看器
    icon: assets/icons/app-icon.png
```

规则：

- `ui.launcher` 只允许 `app` 插件声明
- `ui.surface` 只允许 `app` 插件声明
- `ui.window.chrome` 允许 `app` 插件声明

## 6. 能力缺失时的正式策略：`capabilityFallbacks`

应用插件可以声明当宿主缺失某项能力时的正式行为：

```yaml
capabilityFallbacks:
  save-file:
    whenUnsupported: download
  share:
    whenUnsupported: reject
```

当前允许的 `whenUnsupported`：

- `reject`
- `download`
- `share`
- `openExternal`

约束：

1. `capabilityFallbacks` 提供时必须是对象
2. key 必须是非空 capability 名称
3. 每个 fallback 都必须声明 `whenUnsupported`

## 7. 其他类型插件的正式要求

### 7.1 `card`

- 应声明 `runtime.targets`
- 正式解析依据仍是 `capabilities.cardTypes`
- 一般推荐：
  - `desktop: true`
  - `headless: true`
  - `web/mobile: false`（直到对应宿主就绪）

### 7.2 `layout`

- 应声明 `runtime.targets`
- 正式解析依据是 `layout.layoutType`

### 7.3 `module`

- 应声明 `runtime.targets`
- 正式 provider 契约仍以 `module.provides / module.consumes` 为准

### 7.4 `theme`

- 应声明 `runtime.targets`
- 主题入口继续使用对象结构 `entry.tokens / entry.themeCss`

## 8. 应用插件示例

```yaml
id: chips.photo.viewer
name: 图片查看器
version: 1.0.0
type: app
entry: dist/index.html
permissions:
  - file.read
  - file.write
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: false
capabilities:
  - resource-handler:view:image/*
  - file-handler:.png
  - file-handler:.jpg
capabilityFallbacks:
  save-file:
    whenUnsupported: download
ui:
  surface:
    defaultKind: window
    preferredKinds:
      desktop: window
      web: route
      mobile: fullscreen
      headless: window
  window:
    chrome:
      titleBarStyle: hidden
  launcher:
    displayName: 图片查看器
    icon: assets/icons/app-icon.png
```

## 9. 校验门禁

当前 `chipsdev validate` 已正式校验：

1. `manifest.runtime.targets` 存在且结构正确
2. `app` 插件必须声明 `manifest.ui.surface`
3. `ui.surface.defaultKind / preferredKinds` 必须合法
4. `capabilityFallbacks` 若提供则必须合法
5. 非 `app` 插件不得声明 `ui.surface`

## 10. 质量要求

1. Manifest 公共字段变化必须同步更新 Host 解析、CLI 校验、Scaffold 模板和共享文档。
2. 不允许继续把桌面假设直接写死到公共契约里。
3. 宿主尚未实现不等于字段可以省略；运行目标矩阵必须显式声明。
