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
- `chipsdev create <name> --type <app|card|theme>`：创建新工程
- `chipsdev server`：启动 Vite 开发服务器
- `chipsdev debug`：以调试预设启动开发服务器
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

## `chipsdev run` 的正式行为

`chipsdev run` 当前只支持应用插件（`manifest.type === "app"`）。执行时会完成以下正式链路：

1. 读取当前工程 `chips.config.mjs`；
2. 通过 Vite 构建应用产物，并将 app 构建基准路径固定为相对路径；
3. 对 `react`、`react-dom` 及 JSX runtime 做工程根级去重与别名收敛；
4. 使用工程根 `manifest.yaml` 作为唯一安装清单；
5. 解析开发工作区 `.chips-host-dev`；
6. 若开发工作区尚无已启用主题插件，则自动引导默认主题包进入该工作区并设为当前主题；
7. 拉起真实 Electron Host 主进程；
8. 在开发工作区中安装并启用当前应用插件；
9. 通过 Host `window` 服务打开应用窗口。

## 插件与主题调试

主题包、卡片插件、布局插件、模块插件的联调均应通过开发工作区完成，不应手工修改 `.chips-host-dev` 文件。

典型命令如下：

```bash
chipsdev plugin install /绝对路径/插件或主题包.cpk
chipsdev plugin enable theme.theme.chips-official-default-dark-theme
chipsdev theme list
chipsdev theme apply chips-official.default-dark-theme
chipsdev theme current
chipsdev theme validate
```

语义说明：

- `chipsdev plugin install` 仅完成安装；
- 主题插件必须显式 `enable` 后，才会进入 `chipsdev theme list` 的可用主题集合；
- `chipsdev theme apply` 只允许切换到当前开发工作区内已启用的主题；
- `chipsdev theme validate` 会逐个调用 `theme.apply + theme.resolve` 做正式门禁验证。

## 创建工程

`chipsdev create` 在生态根工作区内创建工程时会自动完成以下操作：

1. 保留模板内的正式 semver 依赖；
2. 在需要时自动把新工程注册到根工作区；
3. 自动写入指向生态根 `package.json` 的 `volta.extends`。

当前正式支持的类型：

- `app`
- `card`
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

## 常见问题

### 为什么 `chipsdev run` 没有使用我在 `chips` 里切换的主题？

因为两个命令操作的是不同工作区。`chips` 使用用户工作区，`chipsdev` 使用开发工作区。

### 为什么 `chipsdev theme list` 看不到刚安装的主题？

因为主题插件安装后必须先启用。只有已启用主题插件才会进入主题运行时。

### 为什么应用启动后不应该写死默认主题？

因为应用初始主题必须从 Host 当前主题读取。主题变更事件只负责增量同步，不能替代初始主题装载。

## 质量要求

- 不允许手工改写工作区文件替代正式命令；
- 不允许在开发命令中绕开 Host 主题、插件、窗口和日志链路；
- 不允许在文档或脚手架中继续使用 `chips dev` 历史写法；
- 所有示例命令必须能在当前生态工作区中直接执行。
