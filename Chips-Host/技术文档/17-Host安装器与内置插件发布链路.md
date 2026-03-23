# Host 安装器与内置插件发布链路

## 1. 目标

- 交付可分发的 macOS Host 安装包，而不再只停留在 npm 包 / CLI 分发层。
- 让 Host 安装包随包携带官方默认主题与生态设置面板，并在首启时通过 Host 正式插件安装链路落入用户工作区。
- 保持 Host 仍然是唯一宿主程序；设置面板继续作为 `type: app` 插件运行，不下沉为 Host 内部私有页面。

## 2. 实现位置

- 内置插件引导：
  - `src/main/core/built-in-plugins.ts`
  - `src/main/core/host-application.ts`
- 首启默认拉起设置面板：
  - `src/main/electron/app-entry.ts`
- macOS 安装包构建：
  - `src/main/installer/macos-installer.ts`
  - `src/main/installer/cli.ts`
- npm 入口：
  - `package.json` -> `npm run build:installer:macos`

## 3. 内置插件引导链路

### 3.1 内置资源布局

安装包内统一将首发插件放到：

```text
Chips.app/
└── Contents/
    └── Resources/
        └── builtin-plugins/
            ├── theme.theme.chips-official-default-theme/
            │   ├── manifest.yaml
            │   ├── dist/
            │   └── contracts/
            └── com.chips.eco-settings-panel/
                ├── manifest.yaml
                ├── dist/
                └── assets/
```

当前内置插件集合：

1. `theme.theme.chips-official-default-theme`
2. `com.chips.eco-settings-panel`

### 3.2 首次启动行为

`HostApplication.start()` 在 `runtime.load()` 后会执行内置插件引导：

1. 从 `process.resourcesPath/builtin-plugins` 解析内置插件清单；
2. 若用户工作区中缺少对应插件，调用 `PluginRuntime.install(...)` 正式安装；
3. 对默认主题与设置面板统一执行 `runtime.enable(...)`；
4. 对设置面板补齐 `plugin.getShortcut -> plugin.createShortcut` 正式快捷方式治理链路；
5. 若本轮是“首次安装设置面板”，记录首启启动意图。

这条链路不会绕过 Host 插件运行时，不会直接向工作区私拷文件。

### 3.3 首启窗口行为

`app-entry.ts` 仍然保持既有优先级：

1. 应用快捷方式参数 `--chips-launch-plugin=...`
2. 文件关联输入（当前已接入 `.card/.box` 进程参数与 macOS `open-file`）
3. 若本次没有任何显式启动输入，且设置面板是本轮首次落库，则自动执行：

```ts
plugin.launch({
  pluginId: 'com.chips.eco-settings-panel',
  launchParams: { trigger: 'host-first-run' }
})
```

这样 Host 安装后的第一次可见窗口就是设置面板初始化入口，而不是后台静默驻留。

## 4. macOS 打包链路

### 4.1 构建命令

在 `Chips-Host/` 目录执行：

```bash
npm run build:installer:macos -- --output=../release-artifacts/YYYY-MM-DD/macos-installer
```

脚本会顺序执行：

1. `Chips-EcoSettingsPanel` 的 `npm run build`
2. `ThemePack/Chips-default` 的 `npm run build`
3. `Chips-Host` 的 `npm run build`
4. 生成 `Chips.app`
5. 先将 `Chips.app` 显式 staging 到 `payload-root/Applications/Chips.app`
6. 再使用 `pkgbuild --root <payload-root> --install-location /` 生成携带 `postinstall` 的组件包
7. 再使用 `productbuild` 包装为可直接交给 Installer.app 的 product archive

### 4.2 Host App 打包内容

`prepareMacHostAppBundle()` 生成的 `Chips.app` 包含：

- Electron 模板 App（重命名主可执行文件为 `Chips`）
- `Resources/app/dist` 中的 Host 编译产物
- `Resources/app/node_modules/*`
  - 由 `Chips-Host/package.json` 的正式生产依赖递归收集而来；
  - 当前至少包含 `yaml`、`jsdom`、`esbuild`，以及它们的传递依赖 / 平台二进制包，确保 `packages/card-service` 在安装包内可直接执行富文本、复合卡片渲染与运行时编译链路。
- `Resources/builtin-plugins/*` 中的默认主题与设置面板运行产物

`createMacPkgInstaller()` 在生成 `.pkg` 时不会直接把构建机上的 `Chips.app` 路径交给 `pkgbuild --component`。安装器会先创建一份只包含下列结构的 staging root：

```text
payload-root/
└── Applications/
    └── Chips.app
```

随后通过 `pkgbuild --root payload-root --install-location /` 生成组件包。这样可以把安装 payload 固定为 `/Applications/Chips.app`，避免 macOS Installer 因组件可重定位语义把构建产物所在的用户目录（例如 `Users/<name>/Downloads/...`）错误写入最终安装路径。

### 4.3 安装阶段的设置面板启动台入口

macOS 安装包当前不再等待 Host 首次启动后才补建设置面板快捷方式，而是在组件包的 `postinstall` 阶段直接完成：

1. 识别当前登录用户；
2. 先确保 `~/Applications` 与 `~/Applications/Chips Apps` 目录归当前登录用户所有，避免后续运行时为其他应用插件创建启动台入口时出现 `EACCES`；
3. 在 `~/Applications/Chips Apps/生态设置面板.app` 生成 launcher app；
4. launcher app 会补齐标准 macOS `.app` 结构：
   - `Contents/Info.plist`
   - `Contents/PkgInfo`
   - `Contents/MacOS/chips-eco-settings-panel`
   - `Contents/Resources/AppIcon.icns`（若内置图标存在）
5. launcher app 运行时调用：

```bash
/Applications/Chips.app/Contents/MacOS/Chips \
  --workspace=$HOME/.chips-host \
  --chips-launch-plugin=com.chips.eco-settings-panel
```

6. 调用 `lsregister -f` 让 Launch Services 立即登记该 launcher。

这样用户在“安装完成但尚未手动启动 Host”时，也能在启动台直接看到“生态设置面板”。

### 4.4 系统文件关联

当前安装包在 `Info.plist` 中正式写入了 `.card` 文件关联：

- 扩展名：`.card`
- MIME：`application/x-card`
- `LSHandlerRank: Owner`

## 5. 当前边界

- 本轮安装包只正式注册 `.card` 文件关联。
- `.box` 关联仍未进入安装包元数据，原因是生态内仍缺少正式 `file-handler:.box` 的箱子查看器应用；若现在把 `.box` 直接绑定到 Host，会把未闭环能力暴露给最终用户。
- 因此，`工单061-Host安装分发文件关联与箱子查看器未闭环` 仍需继续保留，用于后续收口 `.box` 分发与消费链路。

## 6. 验证

本轮对应验证：

- `npm run build`
- `npm test`
- `npm run build:installer:macos -- --output=../release-artifacts/2026-03-22/macos-installer`
- 安装包产物内校验：
  - `Resources/app/node_modules` 已递归带入 Host 正式运行时依赖；
  - 可从安装包内直接 `require('jsdom')` 与 `require('esbuild')`，避免复合卡片节点和卡片转换链路在新系统中报 `MODULE_NOT_FOUND`。
  - `Resources/builtin-plugins/com.chips.eco-settings-panel/dist/index.html` 已包含正式 CSP，且不再声明 `unsafe-eval`。
  - `pkgutil --payload-files` 显示安装包 payload 顶层仅包含 `./Applications/Chips.app`，不再混入 `Users/...` 构建机目录。

构建产物（2026-03-22）：

- `release-artifacts/2026-03-22/macos-installer/Chips.app`
- `release-artifacts/2026-03-22/macos-installer/Chips-Host-0.1.0-macos.pkg`
