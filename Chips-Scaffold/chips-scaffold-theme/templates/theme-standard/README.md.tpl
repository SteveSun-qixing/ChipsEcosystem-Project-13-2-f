# {{displayName}}

这是基于 Chips 官方脚手架生成的主题插件工程。该主题遵循薯片生态的主题系统设计与插件规范，可以通过 `.cpk` 打包后安装到 Chips Host 中使用。

## 基本信息

- 插件 ID：`{{pluginId}}`
- 主题 ID：`{{themeId}}`
- 版本：`{{version}}`
- 描述：`{{description}}`

## 目录结构

```text
.
├─ manifest.yaml          # 插件与主题配置
├─ package.json           # NPM 配置与脚本
├─ tsconfig.json          # TypeScript 配置
├─ chips.config.mjs       # Chips Dev 配置
├─ tokens/                # 设计 Token 源文件（五层结构输入）
├─ src/                   # 构建与校验脚本
├─ styles/                # 主题 CSS 文件
├─ icons/                 # 图标资源规范说明
├─ fonts/                 # 字体资源规范说明
├─ contracts/             # 主题契约与最小功能集声明
├─ preview/               # 预览资源
└─ tests/                 # 本地测试与校验用例
```

## 常用命令

- `npm run build`：构建主题 Token 与 CSS，输出到 `dist/`。
- `npm run validate:theme`：对构建结果进行基础校验（Token 结构与关键组件契约）。
- `npm test`：运行本地单元测试。

## 后续集成

- 使用 `chips dev package` 打包为 `.cpk` 后，通过 `chips host plugin install` 安装到指定工作空间；
- 使用 `chips host theme list` / `theme apply` / `theme validate` 等命令进行运行时级联动校验。

