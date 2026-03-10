# Chips Dev 开发者命令行手册（chipsdev）

## 概述

Chips Dev 开发者命令行工具（命令名为 `chipsdev`）是开发薯片生态插件的核心工具。通过命令行，开发者可以创建项目、构建插件、调试代码、发布插件等。命令行工具支持完整的开发工作流。

> 说明：早期文档中曾使用 `chips dev` 作为开发命令行的形式表示，现已统一为独立命令 `chipsdev`，不再提供 `chips dev` 二级命令形式。

## 安装配置

在生态一方仓库中，`chipsdev` 的正式安装方式只有一种：通过生态根工作区安装 `chips-sdk`。不再使用 `npm link` 作为正式方案。

标准步骤：

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
```

完成后，工作区内的应用插件、卡片插件、主题包工程都可以直接通过项目内二进制调用 `chipsdev`。生态根 `package.json` 统一维护 Volta 工具链版本，各工作区 `package.json` 通过 `volta.extends` 指向生态根，从而保证 `chipsdev` 在 npm workspace hoist 与 Volta 环境下都能在工程目录直接解析。工具依赖 Node.js 环境，需要预先安装。

配置使用 `chipsdev init` 命令进行初始化。初始化创建必要的配置文件和目录结构。首次使用需要配置开发者账号。

当前版本不提供独立的 `chipsdev update` 子命令。升级方式为更新 `chips-sdk` 依赖版本或重新执行全局安装。

## 项目创建

创建新项目使用 `chipsdev create` 命令。命令需要指定项目名称和类型。当前已落地支持应用插件（app）、基础卡片插件（card）和主题包（theme）。

项目模板使用-t或--template选项指定。模板包含基本代码结构。开发者可以在模板基础上进行开发。

当目标目录位于生态根工作区内时，`chipsdev create` 会自动完成三件事：

1. 保持模板中的正式 semver 依赖不变；
2. 当目标目录未被现有工作区 glob 覆盖时，自动把新工程注册到根工作区；
3. 自动写入指向生态根 `package.json` 的 `volta.extends`，保证在子工程目录直接执行 `chipsdev` 时仍能稳定解析工作区根的二进制。

项目创建后会初始化Git仓库。Git仓库用于版本管理和协作开发。提交规范应该遵循团队约定。

## 项目结构

项目目录包含源代码、配置、资源等。src目录存放源代码，dist目录存放构建结果，tests目录存放测试文件，config目录存放配置文件。

Manifest 文件 manifest.yaml 定义插件元数据。包括插件 ID、名称、版本、类型、入口点等。Manifest 是插件系统识别插件的基础。

配置文件 chips.config.mjs 定义构建和开发选项。包括源码目录、输出目录、入口文件、测试目录等。配置可以根据项目需要调整。

## 开发命令

启动开发服务器使用 `chipsdev server` 命令。开发服务器支持热重载，代码修改后自动更新。服务器启动后可以在浏览器中预览效果。

调试模式使用 `chipsdev debug` 命令启动。调试模式支持断点调试，可以单步执行代码。调试工具集成在 VSCode 中。

代码检查使用 `chipsdev lint` 命令。检查代码规范和潜在问题。检查规则在 .eslintrc 配置文件中定义。

在插件仓库中使用 `chipsdev run` 命令，可以在开发模式下启动完整的 Host 底层并运行应用插件。该命令会执行以下步骤：

- 根据 chips.config.mjs 使用 Vite 完成构建；
- app 构建默认输出相对静态资源路径，确保 Host 以本地文件方式加载 `dist/index.html` 时仍可解析 `dist/assets/*`；
- 对 `react` / `react-dom` 及其 JSX runtime 进行工程根级去重与别名收敛，避免本地联动工作区把多份 React 运行时打进同一个应用包；
- 保持工程根 `manifest.yaml` 作为唯一清单源，并使用其中的 `entry` 指向构建产物；
- 拉起真实 Electron Host 主进程（使用当前工作区或上层目录中的 `.chips-host-dev` 工作区）；
- 通过 Host 的 plugin 服务以工程根 `manifest.yaml` 安装并启用当前应用插件；
- 初始化插件会话并通过 Host 的 window 服务打开应用窗口。

`chipsdev run` 当前仅支持应用插件（manifest.type === "app"）。对于卡片插件、布局插件、模块插件、主题包等类型，应通过 Host 侧的卡片/箱子/主题验证流程进行调试。

## 构建命令

构建插件使用 `chipsdev build` 命令。构建会编译代码并打包为 cpk 文件。构建结果存放在 dist 目录。

发布构建使用 `chipsdev build --release` 命令。发布构建启用所有优化，包括压缩、混淆等。发布构建用于正式发布。

构建目标使用 `-o` 或 `--output` 选项指定。指定输出目录可以构建到不同位置。不同目标用于不同用途。

## 测试命令

运行测试使用 `chipsdev test` 命令。测试框架使用 Vitest。测试文件命名以 `.test.ts` 或 `.spec.ts` 结尾。

测试覆盖率使用 `chipsdev test --coverage` 命令查看。覆盖率报告显示代码被测试覆盖的比例。测试覆盖率达标是发布的必要条件。

端到端测试使用 `chipsdev e2e` 命令。端到端测试模拟用户操作。测试用例编写在 `tests/e2e` 目录中。

## 插件命令

工程依赖安装统一使用工作区命令：

```bash
cd /Users/sevenstars/Documents/ChipsCard/Develop/Project-13-2-f
npm install
```

在生态工作区内：

- `chips-sdk`、`chips-host`、`@chips/component-library` 等一方依赖统一声明为正式 semver 版本，由根工作区自动链接到本地包；
- 生态根 `package.json` 必须显式声明根级工具依赖 `chips-sdk` 与 `chips-host`，确保 Volta 在根目录执行 `chipsdev` / `chips` 时命中当前工作区实现，而不是回退到旧的全局工具；
- 各工作区 `package.json` 必须通过 `volta.extends` 指向生态根 `package.json`，使 Volta 在子工程目录也能解析根工作区 hoist 的 `chipsdev` / `chips`；
- 禁止继续使用 `file:` 或 `npm link`；
- 安装完成后，可在工程目录直接执行 `chipsdev build`、`chipsdev test`、`chipsdev run` 等命令。

打包插件使用 `chipsdev package` 命令。打包会生成 cpk 文件。cpk 文件可以安装到主机或发布到市场。

`chipsdev package` 的当前输出契约如下：

- 输出路径默认位于工程 `dist/` 目录，文件名格式为 `<pluginId>-<version>.cpk`；
- 包根目录固定写入工程根部的 `manifest.yaml`；
- 构建产物写入包内 `dist/` 目录；
- `.cpk` 使用 ZIP Store 模式输出，不做 Deflate 压缩，以确保可被 Host 直接安装；
- 打包时会排除构建目录中的重复 manifest、旧 `.cpk` 文件与 `publish-meta.json` 等非运行时内容，避免生成无效安装包。

推荐在打包完成后使用 `chips plugin install <cpk路径>` 进行本地 Host 安装验证。

验证插件使用 `chipsdev validate` 命令。验证检查插件是否符合规范。验证包括格式检查、权限检查、依赖检查等。

## 发布命令

登录账号使用 `chipsdev login` 命令。登录需要开发者账号和密码。登录信息会保存在本地配置中。

发布插件使用 `chipsdev publish` 命令。发布会将插件上传到市场。上传前需要填写插件信息。

版本管理使用 `chipsdev version` 命令管理版本。版本号遵循语义化版本规范。版本命令可以查看当前版本、升级版本。

## 调试技巧

日志输出使用console.log和console.error。日志可以在开发工具的控制台查看。不同级别日志使用不同颜色标识。

断点调试支持在VSCode中设置断点。断点停止程序执行，可以查看变量值。断点调试适合复杂逻辑排查。

网络调试查看插件的网络请求。开发工具的网络面板可以查看请求详情。请求和响应的内容都可以查看。

## 常见问题

依赖安装失败时，先确认自己是否在生态根工作区执行过 `npm install`。若模板工程位于生态根内，检查根 `package.json` 的 `workspaces` 是否已覆盖该工程，以及工程依赖版本是否与本地工作区包版本匹配。禁止用 `npm link` 或手工 `file:` 修改来绕过问题。

构建失败查看错误信息定位问题。错误信息通常包含问题位置和原因。根据错误提示修复代码或配置。

调试连接失败确认开发服务器已启动。检查端口配置是否正确。防火墙可能阻止连接。

## 自动化

持续集成可以在CI环境中使用命令行。构建和测试可以自动化运行。集成结果可以通知到团队。

脚本集成可以编写npm脚本简化操作。package.json中的scripts字段定义自定义命令。常用操作可以定义为脚本。

钩子配置可以在Git钩子中集成检查。提交前运行代码检查和测试。确保提交代码的质量。

## 开发规范

代码规范遵循团队的编码风格。规范定义在.eslintrc和.prettierrc文件中。提交前应该运行代码检查。

提交规范使用Conventional Commits格式。提交信息包含类型、描述、原因等内容。规范的提交信息便于追溯。

文档规范要求为新功能编写文档。文档包括使用说明和API参考。文档是插件的重要组成部分。
