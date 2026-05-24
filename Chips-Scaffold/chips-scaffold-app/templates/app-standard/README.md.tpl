# {{ DISPLAY_NAME }}

> 插件 ID：`{{ PLUGIN_ID }}`

这是一个薯片生态 `type: app` 应用插件工程，默认使用 Host surface、`chips-sdk`、React Environment、组件库、主题 token、多语言资源、命令系统、预览 smoke 与质量门禁。

## 快速开始

```bash
cd <生态根工作区>
npm install
cd {{ PROJECT_NAME }}
npm run dev
```

应用插件依赖通过生态根工作区解析；工程根 `manifest.yaml` 是唯一正式清单源，Host 通过 `entry: dist/index.html` 加载构建产物。

## 常用脚本

- `npm run dev`：启动开发服务器。
- `npm run lint`：执行源码规范检查。
- `npm run typecheck`：执行 TypeScript 类型检查。
- `npm test`：运行单元测试与 e2e smoke。
- `npm run build`：构建应用插件产物。
- `npm run validate`：校验 manifest 与构建产物。
- `npm run preview:smoke`：生成 Host mock 预览链路报告并校验报告。
- `npm run quality:gate`：生成生态质量门禁摘要报告。
- `npm run verify`：串联执行完整本地验证。

## 目录结构

```text
{{ PROJECT_NAME }}/
├─ manifest.yaml
├─ package.json
├─ chips.config.mjs
├─ index.html
├─ assets/
│  └─ icons/
├─ config/
│  ├─ app-config.ts
│  └─ logging.ts
├─ i18n/
│  ├─ zh-CN.json
│  └─ en-US.json
├─ src/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ AppRoot.tsx
│  │  ├─ AppProviders.tsx
│  │  ├─ AppRuntimeProvider.tsx
│  │  ├─ AppShell.tsx
│  │  ├─ app-shell.css
│  │  └─ scene-registry.ts
│  ├─ commands/
│  ├─ i18n/
│  ├─ preview/
│  ├─ runtime/
│  ├─ scenes/
│  ├─ testing/
│  ├─ theme/
│  └─ views/
└─ tests/
   ├─ unit/
   └─ e2e/
```

## 技术口径

- 官方前端栈使用 React。
- 系统能力通过 `chips-sdk` 与组件库 Environment hooks 消费。
- 命令通过 `client.command.*` 注册、查询、调用和监听，不写入 `manifest.commands`。
- 用户可见文案统一维护在 `i18n/*.json`，渲染期通过本地同步 adapter 解析。
- 视觉表达走组件库结构、主题 token 和 `--chips-*` CSS 变量，不在组件中写硬编码颜色、阴影或圆角。
- 应用入口图标来自 `manifest.ui.launcher.icon`，运行时 UI 图标使用组件库 `ChipsIcon` 与 `IconDescriptor`。
