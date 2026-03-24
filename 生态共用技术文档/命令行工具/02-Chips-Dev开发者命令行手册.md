# Chips Dev 开发者命令行手册（chipsdev）

## 概述

`chipsdev` 是薯片生态正式的开发者命令行工具，随 `chips-sdk` 一起交付。它负责工程创建、构建、测试、打包、运行，以及开发工作区内的 Host 管理能力。

旧文档中的 `chips dev` 写法已经废弃，当前正式入口只有独立命令 `chipsdev`。

## 安装配置

在生态一方仓库中，`chipsdev` 的正式安装方式是通过生态根工作区安装：

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
```

安装完成后：

- 生态根 `package.json` 提供根级 `chips-sdk` 工具依赖；
- 各子工程通过 `volta.extends` 指向生态根；
- 在任意一方工程目录执行 `chipsdev`，都会命中当前工作区中的正式实现。

## 工作区模型

`chipsdev` 始终操作开发工作区，不操作用户工作区。

- 用户工作区：`chips` 默认使用 `~/.chips-host`
- 开发工作区：`chipsdev` 默认向上查找 `.chips-host-dev`，找不到时在当前项目根创建

开发工作区与用户工作区完全隔离，以下状态均不互通：

- 插件安装记录
- 插件启用状态
- 当前主题
- Host 配置
- 运行日志与诊断结果

因此，开发者在 `chips` 中切换的主题，不会自动影响 `chipsdev run` 的结果；反之亦然。

## 命令总览

### 1. 开发工作区 Host 管理命令

以下命令由 `chipsdev` 直接转发到 Host CLI，但工作区固定为开发工作区：

- `chipsdev start`
- `chipsdev stop`
- `chipsdev status`
- `chipsdev config list|set|reset`
- `chipsdev logs`
- `chipsdev plugin list|install|uninstall|enable|disable|query`
- `chipsdev theme list|current|apply|resolve|contract|validate`
- `chipsdev update check|install`
- `chipsdev doctor`
- `chipsdev open <path>`

这些命令与 `chips` 使用同一套 Host 管理能力，但不会落到用户工作区。

### 2. 工程命令

- `chipsdev init`：初始化当前工程的 `chips.config.mjs`
- `chipsdev create <app|card|layout|module|theme> <targetDir>`：创建新工程
- `chipsdev server`：启动 Vite 开发服务器
- `chipsdev debug`：以调试预设启动开发服务器
- `chipsdev module invoke`：在真实 Electron Host 中调用模块 capability/method
- `chipsdev build`：执行正式构建
- `chipsdev test`：执行 Vitest 单元测试
- `chipsdev lint`：执行 ESLint 检查
- `chipsdev e2e`：执行工程提供的端到端测试
- `chipsdev package`：按 `manifest.yaml` 与构建产物生成 `.cpk`
- `chipsdev validate`：执行工程级契约校验
- `chipsdev login`：写入开发者凭据
- `chipsdev publish`：执行发布前校验与元数据整理
- `chipsdev version`：输出当前版本
- `chipsdev help`：查看帮助

补充约束：

- `chipsdev package` 除 `dist/` 构建产物外，还会一并打包 manifest 显式引用的正式静态资源；
- 当前正式收集范围至少包括：
  - `preview`
  - `ui.layout.contract`
  - `ui.layout.minFunctionalSet`
  - `ui.launcher.icon`
  - `screenshots[].path`
- `chipsdev validate` 对上述资源执行存在性检查，并要求与 `package` 的打包范围保持一致。

## `chipsdev run` 的正式行为

`chipsdev run` 当前只支持应用插件（`manifest.type === "app"`）。执行时会完成以下正式链路：

1. 读取当前工程 `chips.config.mjs`；
2. 通过 Vite 构建应用产物，并将 app 构建基准路径固定为相对路径；
3. 对 `react`、`react-dom` 及 JSX runtime 做工程根级去重与别名收敛；
4. 使用工程根 `manifest.yaml` 作为唯一安装清单；
5. 解析开发工作区 `.chips-host-dev`；
6. 若开发工作区尚无已启用主题插件，则自动引导默认主题包进入该工作区并设为当前主题；
7. 拉起真实 Electron Host 主进程；
8. 先按开发工作区 `plugins.json` 重新同步其中已配置的插件副本，确保 Host 运行时不会继续消费旧安装残留；
9. 在开发工作区中安装并启用当前应用插件；
10. 通过 Host `window` 服务打开应用窗口。

补充语义：

- 第 8 步会按 `plugins.json` 中的 `manifestPath` 重新安装已配置插件，并保留各插件在开发工作区中的启用状态；
- 若 `plugins.json` 中存在相对路径，`chipsdev run` 会按工程/工作区上下文解析为真实清单路径；
- 若 `plugins.json` 中记录的是已丢失的 `dist/*.cpk` 开发产物，而对应工程根仍存在正式 `manifest.yaml`，`chipsdev run` 会回退到工程清单继续同步；
- 若某条历史插件记录的来源已经不存在，或来源工程尚未完成正式构建导致入口资产缺失，`chipsdev run` 会输出告警并跳过该条同步，不中断当前目标应用启动；
- 当前目标应用自身会在同步阶段被跳过，随后再单独重装并启用，避免重复处理。

## `chipsdev module invoke` 的正式行为

`chipsdev module invoke` 是模块插件在开发工作区中的正式 Electron 联调入口，适用于：

- 直接调试模块 capability/method；
- 验证依赖 Electron `BrowserWindow` 的模块能力；
- 验证同步返回和异步 job 返回。

正式用法：

```bash
chipsdev module invoke \
  --capability <capability> \
  --method <method> \
  [--input '<json>'] \
  [--input-file /绝对路径/input.json] \
  [--manifest /绝对路径/manifest.yaml] \
  [--timeout-ms 60000]
```

执行时会完成以下正式链路：

1. 解析开发工作区 `.chips-host-dev`；
2. 若开发工作区尚无已启用主题插件，则自动引导默认主题包进入该工作区并设为当前主题；
3. 若当前目录或 `--manifest` 指向模块插件工程，则先执行正式构建；
4. 拉起真实 Electron Host 主进程；
5. 在开发工作区中安装并启用目标模块插件；
6. 通过 Host `module.invoke` 发起 capability/method 调用；
7. 若模块返回 `mode = "job"`，则持续轮询到 `completed/failed/cancelled` 终态；
8. 以 JSON 输出最终结果。

补充边界：

- `chipsdev start/stop/status/config/logs/plugin/theme/open` 仍然是开发工作区 Host 管理命令，底层委托给 Host CLI；
- 这些命令不承担真实 Electron `BrowserWindow` 宿主联调职责；
- 因此，依赖 `platform.renderHtmlToImage`、`platform.renderHtmlToPdf` 之类 Electron 渲染导出能力的模块，必须使用 `chipsdev module invoke` 验证。

## 插件与主题调试

主题包、卡片插件、布局插件、模块插件的联调均应通过开发工作区完成，不应手工修改 `.chips-host-dev` 文件。

其中：

- 主题插件、卡片插件、布局插件，以及模块插件的安装/启停状态验证，可使用 `chipsdev plugin/theme/...`；
- 应用插件窗口联调，使用 `chipsdev run`；
- 模块插件 capability/method 联调，尤其是依赖 Electron 宿主的模块能力，使用 `chipsdev module invoke`。

### 布局插件联调

布局插件没有独立的 `chipsdev run` 窗口入口。  
正式联调链路是：

1. 使用 `chipsdev create layout <targetDir>` 创建工程；
2. 在布局工程内执行 `chipsdev build/test/lint/validate/package`；
3. 使用 `chipsdev plugin install /绝对路径/布局插件.cpk` 安装到开发工作区；
4. 使用 `chipsdev plugin enable <layoutPluginId>` 启用插件；
5. 由箱子查看器、编辑器或其他消费箱子布局的正式应用打开 `.box` 文件，让 Host 按 `layout.layoutType` 加载已安装布局插件。

重要约束：

- 布局插件必须以“已安装插件副本”身份参与 Host 加载，不能直接从源码目录热挂载；
- 查看器和编辑器会按 `layout.layoutType -> installPath + entry` 的正式链路加载布局插件；
- 若重新构建并重新打包了同 ID 的布局插件，必须再次执行 `chipsdev plugin install`，以替换开发工作区中的旧副本。

典型命令如下：

```bash
chipsdev plugin install /绝对路径/插件或主题包.cpk
chipsdev plugin enable theme.theme.chips-official-default-dark-theme
chipsdev theme list
chipsdev theme apply chips-official.default-dark-theme
chipsdev theme current
chipsdev theme validate
```

模块插件典型命令如下：

```bash
chipsdev module invoke \
  --capability converter.html.to-image \
  --method convert \
  --input-file /绝对路径/request.json
```

布局插件典型命令如下：

```bash
chipsdev create layout my-grid-layout
chipsdev build
chipsdev test
chipsdev lint
chipsdev validate
chipsdev package
chipsdev plugin install /绝对路径/my-grid-layout/dist/my-grid-layout.cpk
chipsdev plugin enable chips.layout.my-grid-layout
```

语义说明：

- `chipsdev plugin install` 仅完成安装；
- 若开发工作区中已存在相同 `pluginId`，再次执行 `chipsdev plugin install` 会正式替换旧安装副本，而不是追加重复记录；
- `chipsdev plugin install` 写入 `plugins.json` 时会更新已有记录，并把传入路径规范化为绝对路径；
- 主题插件必须显式 `enable` 后，才会进入 `chipsdev theme list` 的可用主题集合；
- `chipsdev theme apply` 只允许切换到当前开发工作区内已启用的主题；
- `chipsdev theme validate` 会逐个调用 `theme.apply + theme.resolve` 做正式门禁验证。
- `chipsdev module invoke` 会在真实 Electron Host 中完成模块调用；若当前目录是模块工程，会先构建并重新安装该模块。

## 创建工程

`chipsdev create` 在生态根工作区内创建工程时会自动完成以下操作：

1. 保留模板内的正式 semver 依赖；
2. 在需要时自动把新工程注册到根工作区；
3. 自动写入指向生态根 `package.json` 的 `volta.extends`。

补充约束：

- 生成工程默认只输出 README 与运行时、测试、契约等必要目录；
- `需求文档/`、`技术文档/`（或“技术手册”）与 `开发计划/` 不属于 `chipsdev create` 的默认产物。

当前正式支持的类型：

- `app`
- `card`
- `layout`
- `module`
- `theme`

## 构建、打包与校验

正式发布链路如下：

```bash
chipsdev build
chipsdev test
chipsdev lint
chipsdev validate
chipsdev package
```

主题包或插件包生成 `.cpk` 后，推荐继续执行开发工作区联调：

```bash
chipsdev plugin install /绝对路径/产物.cpk
chipsdev plugin enable <pluginId>
chipsdev theme validate   # 主题包
```

模块插件若需要验证正式能力调用，推荐执行：

```bash
chipsdev module invoke --capability <capability> --method <method> --input '<json>'
```

## 常见问题

### 为什么 `chipsdev run` 没有使用我在 `chips` 里切换的主题？

因为两个命令操作的是不同工作区。`chips` 使用用户工作区，`chipsdev` 使用开发工作区。

### 为什么 `chipsdev theme list` 看不到刚安装的主题？

因为主题插件安装后必须先启用。只有已启用主题插件才会进入主题运行时。

### 为什么模块插件不能只靠 `chipsdev start` 验证 Electron 能力？

因为 `chipsdev start` 属于开发工作区 Host 管理命令，底层仍走 Host CLI，不负责模块 capability 的真实 Electron 宿主调用。依赖 `BrowserWindow` 的模块能力要使用 `chipsdev module invoke`。

### 为什么应用启动后不应该写死默认主题？

因为应用初始主题必须从 Host 当前主题读取。主题变更事件只负责增量同步，不能替代初始主题装载。

### 为什么我已经重新构建插件，但 `chipsdev run` 里仍然像是在加载旧代码？

因为 Host 真正运行的是开发工作区 `.chips-host-dev/plugins/` 里的已安装副本，而不是你的源码目录。当前正式行为是：`chipsdev plugin install` 会替换开发工作区中的同 ID 插件副本，`chipsdev run` 也会在启动目标应用前先同步 `plugins.json` 中登记的插件，避免继续消费旧安装残留。

## 质量要求

- 不允许手工改写工作区文件替代正式命令；
- 不允许在开发命令中绕开 Host 主题、插件、窗口和日志链路；
- 不允许在文档或脚手架中继续使用 `chips dev` 历史写法；
- 所有示例命令必须能在当前生态工作区中直接执行。
