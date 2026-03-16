# {{ DISPLAY_NAME }}

> 通过 `chips-scaffold-module` 生成的标准模块插件工程。

## 简介

本工程面向 `type: module` 的共享功能模块开发，默认提供以下能力：

- 使用 React 构建可嵌入的模块运行时；
- 使用 `chips-sdk` 读取 Host 主题与语言状态；
- 通过本地 `i18n/*.json` 管理模块 UI 文案；
- 通过 `mountModule()` 提供清晰的挂载、更新、卸载生命周期；
- 内建单元测试、构建、校验与打包脚本。

## 项目结构

```text
{{ PROJECT_NAME }}/
├─ .eslintrc.cjs          # 工程级 ESLint 配置
├─ manifest.yaml          # 插件清单（type: module）
├─ package.json           # NPM 配置
├─ tsconfig.json          # TypeScript 配置
├─ chips.config.mjs       # chipsdev 构建配置
├─ src/
│  ├─ index.ts            # 模块公共导出入口
│  └─ module/
│     ├─ runtime.tsx      # 模块运行时挂载实现
│     ├─ types.ts         # 运行时对外类型
│     └─ i18n.ts          # 本地词典解析与格式化
├─ config/
│  └─ logging.ts          # 日志封装
├─ i18n/
│  ├─ zh-CN.json          # 中文文案
│  └─ en-US.json          # 英文文案
└─ tests/
   └─ unit/
      └─ module-runtime.test.tsx
```

## 快速开始

```bash
cd <生态根工作区>
npm install
cd {{ PROJECT_NAME }}
npm run lint
npm run build
npm test
npm run validate
```

模块插件工程应通过 `chipsdev create module` 接入生态工作区，不再单独手工拼装依赖。若工程位于生态根工作区内，`chipsdev create` 会自动完成工作区注册与 `volta.extends` 写入。

## 运行时设计

模板默认导出：

- `createModuleClient()`：基于 `chips-sdk` 创建 Bridge 客户端；
- `mountModule(context)`：在指定容器中挂载模块运行时；
- 类型导出：`ModuleMountContext`、`ModuleSnapshot`、`ModuleHandle` 等。

模板中的 UI 示例展示了：

- 主题 CSS 注入；
- `theme.changed` / `language.changed` 事件刷新；
- 使用 `startTransition` 与 `useDeferredValue` 管理非紧急更新与筛选交互；
- 通过运行时 provider 解耦 Bridge 调用、主题语言状态和展示组件。

## 正式约束

- `manifest.yaml` 必须保持 `type: module` 且 `entry: dist/index.mjs`；
- 模块能力使用 `capabilities: ["{{ MODULE_CAPABILITY }}"]` 当前正式口径；
- 需要读取主题与语言状态时，必须显式声明 `theme.read`、`i18n.read`；
- 不得使用旧动作 `module.load/unload`，统一通过 `client.module.mount/unmount/query/list` 管理挂载状态；
- 每次功能迭代后应同步更新 README、需求文档、技术文档和开发计划。
