# Host 安装器与内置插件发布链路

## 1. 目标

本文档记录当前 Host 在 macOS 安装分发、内置插件引导、首启窗口与文件关联注册方面的正式实现。

## 2. 实现位置

- 内置插件引导：
  - `src/main/core/built-in-plugins.ts`
  - `src/main/core/host-application.ts`
- 启动输入与文件关联分发：
  - `src/main/electron/app-entry.ts`
  - `src/main/core/file-association.ts`
- macOS 安装器：
  - `src/main/installer/macos-installer.ts`
  - `src/main/installer/cli.ts`

## 3. 当前内置插件集合

### 3.1 默认内置插件

当前 Host 默认会处理以下内置插件：

1. `theme.theme.chips-official-default-theme`
2. `com.chips.eco-settings-panel`
3. `com.chips.photo-viewer`

### 3.2 必选与可选

内置插件并非全部都是“缺失即失败”：

1. 默认主题与生态设置面板属于正式首发内置插件；
2. 图片查看器被视为可选内置 app 插件：
   - 若发行包携带它，Host 会按正式链路安装并启用；
   - 若发行包不携带它，Host 启动不会失败。

这保证了 Host 可以有“带图片查看器”和“不带图片查看器”的不同发行形态。

## 4. 内置插件引导链路

`HostApplication.start()` 在 `runtime.load()` 后会执行内置插件引导：

1. 从 `process.resourcesPath/builtin-plugins` 解析内置插件根目录；
2. 对存在的内置插件调用 `PluginRuntime.install(...)`；
3. 对需要自动启用的插件执行 `runtime.enable(...)`；
4. 对设置面板补齐快捷方式治理；
5. 若设置面板是本轮首次安装，则记录首启拉起意图。

图片查看器现在属于可选内置插件，因此缺 bundle 时只会跳过，不会阻塞 Host 首启。

## 5. 启动输入与文件关联分发

### 5.1 Electron 主入口

`src/main/electron/app-entry.ts` 当前会接收：

1. `--chips-launch-plugin=...`
2. 进程参数中的任意带扩展名文件路径
3. macOS `open-file`
4. `second-instance` 转发的文件路径

### 5.2 文件关联分发规则

`src/main/core/file-association.ts` 当前规则如下：

1. `.card`
   - 走 `card.open`
2. `.box`
   - 走 `box.inspect`
   - 再按 `file-handler:.box` 查找并拉起 app 插件
3. 其它扩展名
   - 查询 `plugin.query({ type: "app", capability: "file-handler:<ext>" })`
   - 命中后调用 `plugin.launch(...)`
   - 未命中时回退 `platform.shellOpenPath`

因此，普通文件类型的正式消费方已经由“硬编码扩展名白名单”变成“app 插件 capability 驱动”。

## 6. macOS 安装器行为

### 6.1 构建流程

`npm run build:installer:macos` 会：

1. 构建 Host；
2. 构建存在的内置插件工程；
3. 组装 `Chips.app`；
4. 生成 `.pkg` 安装包。

对可选内置插件的处理规则是：

1. 若工程目录存在，则纳入构建与打包；
2. 若工程目录不存在且被标记为可选，则直接跳过；
3. 若工程目录不存在但属于必选插件，则构建失败。

### 6.2 文件关联元数据生成

`prepareMacHostAppBundle()` 会扫描内置 app 插件 manifest 中的 `file-handler:<ext>` 能力，并把这些扩展名转换成 `Info.plist` 里的文档类型。

当前固定保留：

1. `.card`

当前按能力条件追加：

1. `.png`
2. `.jpg`
3. `.jpeg`
4. `.webp`
5. `.gif`
6. `.bmp`
7. `.svg`
8. `.avif`

前提是这些扩展名来自当前随包携带的内置 app 插件。

### 6.3 “没装图片查看器就不接图片”

当前正式结论如下：

1. 若标准发行包携带 `Chips-PhotoViewer`
   - 安装器会把上述图片类型注册到 Host；
   - 用户双击这些图片时，Host 会把文件路由到图片查看器；
2. 若发行包不携带 `Chips-PhotoViewer`
   - 安装器不会注册这些图片类型；
   - Host 运行时也不会因为缺少图片查看器而失败；
   - 结果就是 Host 不会接住这些图片文件。

## 7. 当前边界

### 7.1 已闭环

当前已经闭环：

1. `.card` 固定注册；
2. 普通文件类型基于 `file-handler:<ext>` 的 app 插件分发；
3. 图片查看器能力驱动的 macOS 文件关联注册；
4. 图片查看器缺失时的可选内置插件跳过逻辑。

### 7.2 尚未扩展

当前仍未扩展：

1. 多个图片查看器并存时的优先级治理；
2. 动态卸载图片查看器后的系统级关联回收；
3. 非文件路径资源的跨应用票据化转交；
4. `.box` 的安装分发级正式文件关联。

## 8. 验证

截至 2026-04-02，本链路已执行并通过：

1. `npm run build`
2. `npm test`
3. `npm run test:contract`

本轮新增验证重点包括：

1. 通用图片扩展名的 `file-handler` 分发集成测试；
2. `resource.resolve` 的正式 `file://` 编码结果；
3. 安装器在内置图片查看器存在时注册图片文档类型；
4. 安装器在图片查看器缺失时跳过注册且仍可正常打包；
5. 内置图片查看器缺失时 Host 启动引导不报错。
