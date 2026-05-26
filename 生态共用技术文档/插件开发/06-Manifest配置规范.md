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
- `permissions`
- `runtime.targets`

`permissions` 规则：

- 必须是数组；
- 无权限插件也必须显式写入 `permissions: []`；
- 权限名采用点分命名空间，例如 `file.read`、`theme.read`、`zip.manage`。

`type` 取值：

- `app`
- `card`
- `layout`
- `module`
- `theme`

`entry` 规则：

- `app/card/layout/module` 通常为字符串，如 `dist/index.html`、`dist/index.mjs` 或 `dist/index.js`
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
   - `desktop`
   - `web`
   - `mobile`
   - `headless`
4. Host 在 `surface.open(target=plugin)` 时，会优先按：
   - 调用方显式请求的 `kind`
   - `ui.surface.preferredKinds[currentHostKind]`
   - `ui.surface.defaultKind`
   - Host 默认值
   进行解析。

`type: app` 插件必须同时声明完整 `runtime.targets` 与完整 `ui.surface`。Host、SDK CLI 和脚手架校验都应把缺少 `runtime.targets`、缺少 `ui.surface.defaultKind`、缺少任一目标平台 `preferredKinds` 视为无效 Manifest。

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

### 5.1 权限补充

`permissions` 字段继续用于声明插件会调用的正式宿主能力。

补充约束：

- 任何直接调用 `zip.compress / zip.extract / zip.list` 的插件，都必须声明 `zip.manage`；
- 若应用插件承载网页基础卡片、电子书图片包这类 `importArchiveBundle(...)` 通用目录导入能力，并在内部复用 ZIP 子域完成校验与解压，也必须声明 `zip.manage`；
- 仅声明 `file.read / file.write` 并不能替代 `zip.manage`。

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
- 不得声明 `ui.surface`
- 一般推荐：
  - `desktop: true`
  - `headless: true`
  - `web/mobile: false`（直到对应宿主就绪）

标准基础卡片插件示例：

```yaml
id: chips.basecard.example
name: 示例基础卡片插件
version: 0.1.0
type: card
entry: dist/index.mjs
capabilities:
  cardTypes:
    - base.example
permissions: []
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: true
```

`basecardDefinition.pluginId` 应与 `manifest.id` 对齐，`basecardDefinition.cardType` 应与 `manifest.capabilities.cardTypes[0]` 对齐。

### 7.2 `layout`

- 应声明 `runtime.targets`
- 正式解析依据是 `layout.layoutType`
- 必须声明 `layout.displayName`
- 不得声明 `ui.surface`
- 常见权限基线是 `box.read`、`theme.read`、`i18n.read`

标准布局插件示例：

```yaml
id: chips.layout.example
name: 示例布局插件
version: 0.1.0
type: layout
entry: dist/index.mjs
permissions:
  - box.read
  - theme.read
  - i18n.read
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: true
layout:
  layoutType: chips.layout.example
  displayName: 示例布局
```

### 7.3 `module`

- 应声明 `runtime.targets`
- 正式 provider 契约仍以 `module.provides / module.consumes` 为准
- `module.apiVersion` 当前为数字版本；
- `module.runtime` 当前正式值为 `worker`；
- `module.activation` 当前支持 `onDemand` 与 `eager`；
- `module.provides[].methods[]` 必须声明稳定 `name`、`mode`，并按需声明 `inputSchema` 与 `outputSchema`；
- 模块调用其他 capability 时，目标 capability 必须预先声明在 `module.consumes[]` 中。

标准模块插件示例：

```yaml
id: chips.module.example
name: 示例模块插件
version: 0.1.0
type: module
entry: dist/index.mjs
permissions:
  - file.read
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: true
module:
  apiVersion: 1
  runtime: worker
  activation: onDemand
  provides:
    - capability: example.process
      version: 1.0.0
      methods:
        - name: run
          mode: sync
          inputSchema: contracts/run.input.schema.json
          outputSchema: contracts/run.output.schema.json
  consumes:
    - capability: example.normalize
      versionRange: ^1.0.0
```

### 7.4 `theme`

- 应声明 `runtime.targets`
- 主题入口继续使用对象结构 `entry.tokens / entry.themeCss`
- 必须声明 `themeId` 与显示名称字段；
- `isDefault`、`parentTheme` 按主题继承和默认主题需要声明；
- 主题契约资产通过 `ui.layout.contract` 与 `ui.layout.minFunctionalSet` 提供给 `chipsdev package` 收集，并由 Host 主题运行时按安装副本读取。

标准主题插件示例：

```yaml
id: theme.theme.example
name: 示例主题
version: 1.0.0
type: theme
entry:
  tokens: dist/tokens.json
  themeCss: dist/theme.css
permissions:
  - theme.read
runtime:
  targets:
    desktop:
      supported: true
    web:
      supported: false
    mobile:
      supported: false
    headless:
      supported: true
themeId: chips.example.theme
displayName: 示例主题
isDefault: false
parentTheme: chips-official.default-theme
ui:
  layout:
    contract: contracts/theme-interface.contract.json
    minFunctionalSet: contracts/theme-min-functional-set.json
```

## 8. CLI 与 Host 校验边界

`chipsdev validate` 是工程打包前校验入口，当前至少检查基础字段、`permissions` 数组、完整 `runtime.targets`、应用插件 `ui.surface`、`capabilityFallbacks`、模块 provider 契约和 manifest 声明资产存在性。

Host `plugin.install` 是运行时安装入口，支持传入目录、单个 manifest 文件或 `.cpk` 文件。`.cpk` 会先解包到受控临时目录，再查找 manifest、校验资源并复制为当前工作区 `plugins/<pluginId>` 下的已安装副本。Host 还会解析主题、布局与模块的类型专属字段。开发者不应把源码目录当作 Host 正式运行入口。

## 9. 应用插件示例

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

## 10. 校验门禁

当前 `chipsdev validate` 已正式校验：

1. `manifest.runtime.targets` 存在且结构正确
2. `app` 插件必须声明 `manifest.ui.surface`
3. `ui.surface.defaultKind / preferredKinds` 必须合法
4. `capabilityFallbacks` 若提供则必须合法
5. 非 `app` 插件不得声明 `ui.surface`

## 11. 质量要求

1. Manifest 公共字段变化必须同步更新 Host 解析、CLI 校验、Scaffold 模板和共享文档。
2. 不允许继续把桌面假设直接写死到公共契约里。
3. 宿主尚未实现不等于字段可以省略；运行目标矩阵必须显式声明。
