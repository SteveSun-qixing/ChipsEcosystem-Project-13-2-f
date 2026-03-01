# manifest.yaml 参考

> 文档状态：阶段06口径同步稿（2026-02-26）

`manifest.yaml` 定义插件元信息、入口、权限与兼容性，是插件安装与运行的合同。

## 1. 顶层字段

```yaml
schemaVersion: "1.0.0"
id: "publisher.plugin-name"
name: "i18n.plugin.600001"
version: "1.0.0"
type: "app"
publisher: "publisher"
description: "i18n.plugin.600002"
icon: "assets/icon.png"
entry:
  main: "dist/index.html"
permissions:
  - file.read
compatibility:
  host: ">=1.0.0"
  sdk: ">=1.0.0"
  platform:
    - win32
    - darwin
    - linux
dependencies:
  plugins:
    - id: "chips-official.default-theme"
      version: ">=1.0.0"
locales:
  default: "zh-CN"
  supported:
    - zh-CN
    - en-US
  path: "locales"
```

## 2. 各类型入口

### 2.1 app

```yaml
entry:
  main: "dist/index.html"
window:
  width: 1200
  height: 800
  minWidth: 800
  minHeight: 600
  resizable: true
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

### 2.2 card

```yaml
entry:
  renderer: "dist/renderer/index.html"
  editor: "dist/editor/index.html"
capabilities:
  cardType: "rich-text"
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

### 2.3 layout

```yaml
entry:
  renderer: "dist/renderer/index.html"
  editor: "dist/editor/index.html"
capabilities:
  layoutType: "grid"
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

### 2.4 module

```yaml
entry:
  module: "dist/index.js"
  iframe: "dist/index.html"
exports:
  - name: "createPlayer"
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

### 2.5 theme

```yaml
entry:
  tokens: "tokens/global.css"
  themeCss: "theme.css"
theme:
  tokensVersion: "1.0.0"
  inherits: "chips-official.default-theme"
```

## 3. 页面型插件 `ui.layout` 契约（阶段06）

`app/card/layout/module` 必须声明：

```yaml
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

`theme` 插件豁免 `ui.layout`，仅要求 `entry.tokens`、`entry.themeCss` 与 `theme` 字段。

## 4. 权限示例

```yaml
permissions:
  - file.read
  - file.write
  - card.read
  - card.write
  - box.read
  - box.write
  - plugin.read
  - dialog.open
  - dialog.save
  - clipboard.read
  - clipboard.write
  - shell.openPath
```

## 5. 旧字段禁用清单

以下字段已废弃，不应出现在新 manifest 中：

- `protocol_version`
- `min_core_version`
- `supported_locales` / `default_locale`（请使用 `locales.default/supported`）

## 6. 校验建议

发布前至少校验：

1. `type` 是否为允许值
2. 入口字段是否与类型匹配
3. 权限是否最小化且与调用一致
4. `compatibility` 与 `dependencies` 是否完整
