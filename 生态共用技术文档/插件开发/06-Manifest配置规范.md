# Manifest配置规范

## 概述

Manifest是插件的配置文件，定义了插件的元数据、能力依赖、入口点等关键信息。每个CPK包必须包含manifest.yaml文件，系统通过解析manifest来加载和管理插件。

## 文件位置

Manifest文件必须位于CPK包的根目录，文件名为manifest.yaml。文件名大小写敏感，必须全小写。

## 基础字段

必填的基础字段包括以下内容：

id字段是插件的唯一标识符，采用反向域名格式。标识符由点号分隔的多段组成，每段由小写字母、数字和连字符组成。例如com.example.my-plugin。标识符一旦发布不应更改。

name字段是插件的显示名称，用于在界面中展示。名称长度建议不超过50个字符。可以包含空格和大多数Unicode字符。

version字段是插件版本号，遵循语义化版本规范。格式为主版本号.次版本号.修订号，例如1.0.0。

type字段是插件类型，枚举值包括app表示应用插件，card表示卡片插件，layout表示布局插件，module表示模块插件，theme表示主题插件。

entry字段定义插件的运行入口，相对于manifest所在的插件根目录。

- 对于 `app/card/layout/module` 插件，`entry` 通常是字符串，例如 `dist/index.js` 或 `dist/index.html`；
- 对于 `theme` 插件，`entry` 必须是对象，并显式声明：
  - `tokens`: `dist/tokens.json`
  - `themeCss`: `dist/theme.css`

在生态工程中，工程根 `manifest.yaml` 是唯一正式清单源：

- `chipsdev build` 只负责生成 `dist/` 构建产物；
- `chipsdev run` 使用工程根 `manifest.yaml` 作为安装输入；
- `chipsdev package` 将工程根 `manifest.yaml` 写入包根，并将构建产物写入包内 `dist/`。

因此应用插件工程应保持 `manifest.yaml` 位于工程根，并让 `entry` 指向 `dist/` 中的构建产物。

## 描述字段

可选的描述字段丰富插件信息：

description字段是插件的功能描述，用于应用市场和插件管理界面。建议控制在100-200字。

author字段是作者信息，可以是字符串或包含name、email、url的对象。

homepage字段是项目主页URL。

license字段是开源许可证标识，如MIT、Apache-2.0、GPL-3.0等。

keywords字段是关键词数组，用于应用市场搜索。

screenshots字段是截图数组，每个截图包含path路径和alt描述。

## 依赖字段

dependencies字段声明插件依赖的其他插件。格式为对象，键是依赖的插件ID，值是版本范围字符串。

版本范围可以使用精确版本如1.0.0 caret范围如^1.0.0表示兼容补丁版本，tilde范围如~1.0.0表示兼容补丁版本，或星号范围如*表示任意版本。

peerDependencies字段声明对宿主环境的依赖。系统会检查宿主环境是否满足要求。

## 权限字段

permissions字段声明插件需要的系统能力。数组形式，每个元素是权限名称。

常用权限包括file-access允许访问文件系统，network-request允许发起网络请求，clipboard-access允许访问剪贴板，window-management允许管理窗口，global-shortcut允许注册全局快捷键。

权限声明应遵循最小权限原则，只声明实际需要的权限。

## 能力字段

capabilities字段声明插件提供的具体能力，不同类型插件有不同结构。

应用插件可以声明提供的功能如可打开的文件类型。卡片插件声明支持的卡片类型如VideoCard、ImageCard。布局插件声明布局标识如grid-layout。

## 环境字段

engines字段声明兼容的宿主环境版本。格式为对象，键是环境名称如chips或node，值是版本范围字符串。

os字段声明兼容的操作系统，数组形式如["darwin", "win32", "linux"]。

## 扩展字段

插件可以定义自定义扩展字段，自定义字段以x-前缀开头。这些字段会被保留给插件特定用途。

## 布局配置字段

插件可以在 manifest.yaml 中声明页面级布局配置。

ui.layout 字段定义布局参数：

| 字段 | 说明 | 可选值 |
|------|------|--------|
| owner | 布局责任人 | `page` |
| unit | 尺寸单位 | `cpx` |
| baseWidth | 逻辑基准宽度 | `1024` |
| contract | 布局契约文件路径 | 相对路径 |
| minFunctionalSet | 最小功能集文件路径 | 相对路径 |

示例：

```yaml
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
    contract: ./contracts/page-layout.contract.json
    minFunctionalSet: ./contracts/min-functional-set.json
```

> 遵循页面级响应式自治原则，不使用全局横竖模板。

## 窗口外观配置字段

应用插件可以在 manifest.yaml 中声明窗口原生外观基线。

`ui.window.chrome` 字段定义窗口标题栏与外壳配置：

| 字段 | 说明 | 可选值 |
|------|------|--------|
| frame | 是否保留原生边框 | `true` / `false` |
| transparent | 是否启用透明窗口 | `true` / `false` |
| backgroundColor | 原生窗口背景色 | CSS 色值字符串 |
| titleBarStyle | 标题栏样式 | `default` / `hidden` / `hiddenInset` / `customButtonsOnHover` |
| titleBarOverlay | 标题栏覆盖层 | `boolean` 或对象 |

覆盖层对象支持以下字段：

| 字段 | 说明 |
|------|------|
| color | 覆盖层背景色 |
| symbolColor | 系统标题栏图标颜色 |
| height | 覆盖层高度 |

示例：

```yaml
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
  window:
    chrome:
      backgroundColor: "#ffffff"
      titleBarStyle: hidden
      titleBarOverlay:
        color: "#ffffff00"
        symbolColor: "#667085"
        height: 44
```

> 该能力属于 Host 正式窗口契约，应用插件不得绕过 Host 私自改 Electron 窗口参数。

## 应用启动入口配置字段

应用插件可以在 `manifest.yaml` 中声明系统启动入口元数据，供 Host 在创建应用快捷方式时使用。

`ui.launcher` 字段定义应用启动入口展示名与图标资源：

| 字段 | 说明 | 可选值 |
|------|------|--------|
| displayName | 快捷方式/启动台中显示的应用名称 | 非空字符串 |
| icon | 应用启动入口图标，相对插件根目录路径 | 例如 `assets/icons/app-icon.ico` |

示例：

```yaml
ui:
  layout:
    owner: page
    unit: cpx
    baseWidth: 1024
  launcher:
    displayName: 卡片查看器
    icon: assets/icons/app-icon.ico
  window:
    chrome:
      titleBarStyle: default
```

约束要求：

- 仅 `type: app` 插件允许声明 `ui.launcher`；
- `icon` 必须指向随插件一起发布的正式资源文件；
- Windows 快捷方式优先使用 `.ico`，macOS 启动台入口会由 Host 转换或复制为系统可识别图标资源；
- 应用插件不得自行创建系统级快捷方式，必须通过 Host 正式接口完成。

Host 当前正式行为补充如下：

- `displayName` 优先作为系统快捷方式显示名，同时也作为 `plugin.launch` 打开的窗口标题；未声明时回退到 `manifest.name`；
- `icon` 会在插件安装时按普通静态资源一起复制到插件安装目录，Host 创建快捷方式时优先读取该声明路径；
- 若未声明 `ui.launcher.icon`，Host 会按约定文件名探测图标，当前探测顺序为：
  - `assets/icons/app-icon.ico`
  - `assets/icons/app-icon.icns`
  - `assets/icons/app-icon.png`
  - `assets/icons/app-icon.svg`
  - `assets/icons/icon.ico`
  - `assets/icons/icon.icns`
  - `assets/icons/icon.png`
  - `assets/icons/icon.svg`
- Windows 当前正式落点是当前用户桌面 `.lnk`；
- macOS 当前正式落点是 `~/Applications/Chips Apps/<displayName>.app`，系统索引后在启动台显示；
- Host 为快捷方式写入的启动参数固定包含当前工作区与目标插件标识，因此同一插件在不同工作区中的快捷方式状态是按工作区隔离的。

推荐约定：

- 正式应用插件统一将启动图标放在 `assets/icons/app-icon.ico`；
- `displayName` 应稳定、可读，不应在发布后频繁变更；
- 快捷方式图标不应依赖运行时下载或外部绝对路径，必须随插件包一起交付。

## 验证规则

系统对manifest进行验证：

必填字段缺失会导致验证失败。字段类型不匹配会导致验证失败。版本格式不正确会导致验证失败。依赖的插件不存在会导致验证失败。

## 最佳实践

遵循以下最佳实践提升插件质量：

使用有意义的插件ID。提供清晰完整的描述。正确声明依赖和权限。及时更新版本号。
