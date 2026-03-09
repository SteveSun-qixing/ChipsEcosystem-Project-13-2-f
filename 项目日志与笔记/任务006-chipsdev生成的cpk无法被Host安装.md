# 任务006-chipsdev生成的cpk无法被Host安装

- 日期：2026-03-08
- 发现阶段：插件打包与 Host 安装联调
- 问题类型：文件格式 / 工具链契约不一致
- 问题描述：按照 `chipsdev package` 生成的 `.cpk` 文件，在 Host 侧执行插件安装时被判定为无效包。Host 运行时返回 `PLUGIN_PACKAGE_INVALID`，具体错误为 `Failed to extract .cpk package` 与 `Unsupported ZIP compression method`。这表明 `chipsdev` 产出的 `.cpk` 与 Host 插件安装器实际支持的包格式不一致。
- 影响范围：所有通过 `chipsdev package` 打包并准备交给 Host 安装的插件，包括应用插件、卡片插件、布局插件、主题插件等。
- 复现步骤：
  1. 在任意插件工程中执行 `chipsdev package` 生成 `.cpk` 文件。
  2. 在 Host 侧执行 `plugin install <cpk路径>`。
  3. 观察 Host 无法解包并报 `Unsupported ZIP compression method`。
- 期望行为：`chipsdev package` 生成的 `.cpk` 应可被 Host 按设计直接安装并启用。
- 根因：
  1. `chipsdev package` 之前使用了普通 ZIP 压缩输出，生成的 entry 压缩方法为 Deflate，而 Host 侧 `zip-service` 只支持 ZIP Store 模式；
  2. 当构建输出目录为 `dist/` 时，打包逻辑会把 `dist/manifest.yaml`、历史 `.cpk` 甚至正在生成的 `.cpk` 自身再次打进包里，导致安装包结构污染。
- 处理结果（2026-03-09）：
  1. 已将 `chipsdev package` 改为输出 ZIP Store 模式 `.cpk`；
  2. 已在打包阶段排除重复 manifest、历史 `.cpk` 与 `publish-meta.json` 等非运行时文件；
  3. 已补充 SDK 侧包格式兼容性测试；
  4. 已补充 Host 侧“安装 chipsdev 实际产出 `.cpk`”回归测试。
- 验证：
  1. `Chips-SDK`：`npm test` 通过；
  2. `Chips-Host`：`npx vitest run tests/unit/plugin-runtime.test.ts` 通过；
  3. 手工联调：`chipsdev package` 生成的 `.cpk` 可通过 `chips plugin install <cpk路径>` 成功安装。
- 状态：已修复
