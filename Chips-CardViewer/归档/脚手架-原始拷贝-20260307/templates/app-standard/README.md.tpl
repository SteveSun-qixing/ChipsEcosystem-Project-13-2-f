# {{ DISPLAY_NAME }} · 卡片查看器应用

> 插件 ID：`{{ PLUGIN_ID }}`  
> 模板：`app-standard`（卡片查看器）  
> 生成自：`chips-scaffold-app` / Chips-CardViewer

## 1. 快速开始

```bash
npm install
npm run dev        # 启动开发服务器（等价 chips dev server）
```

开发服务器启动后，薯片主机通过 `manifest.yaml` 中的 `entry: index.html` 加载本插件窗口。本应用负责：接收卡片文件路径 → 调用 SDK 统一卡片显示接口 → 在窗口内展示复合卡片 iframe。

## 2. 可用脚本

- `npm run dev`：启动开发服务器（`chips dev server`）
- `npm run build`：构建 `cpk` 插件包（`chips dev build`）
- `npm test`：运行单元测试与组件测试（`chips dev test`，基于 Vitest）
- `npm run lint`：运行代码规范检查（`chips dev lint`）
- `npm run validate`：执行插件规范校验（`chips dev validate`）

## 3. 目录结构总览

```text
{{ PROJECT_NAME }}/
├─ manifest.yaml        # 插件清单（id/name/version/type/permissions/entry 等）
├─ package.json         # NPM 包描述与脚本
├─ tsconfig.json        # TypeScript 配置
├─ chips.config.mjs     # Chips Dev 构建/运行配置
├─ index.html           # HTML 入口文件
├─ src/
│  ├─ main.tsx          # React 入口（挂载到 index.html）
│  ├─ App.tsx           # 根组件（卡片查看器）
│  ├─ components/
│  │  ├─ CardViewerShell.tsx  # 查看器外壳布局（头部 + 内容区域）
│  │  ├─ DropZone.tsx         # 拖拽区域，接收 *.card 文件
│  │  └─ CardWindow.tsx       # 使用 SDK 统一卡片显示接口显示复合卡片 iframe
│  └─ hooks/
│     └─ useChipsBridge.ts    # 访问 window.chips 的统一入口
├─ config/
│  ├─ app-config.ts     # 应用级配置（Feature Flag 等）
│  └─ logging.ts        # 日志封装（预留接入 Host 日志服务）
├─ i18n/
│  ├─ zh-CN.json        # 中文文案
│  └─ en-US.json        # 英文文案
├─ tests/
│  ├─ unit/             # 单元/组件测试
│  └─ e2e/              # 端到端测试
└─ assets/
   └─ icons/            # 图标等静态资源
```

## 4. 技术栈与规范

- 前端框架：React（参见生态设计原稿与应用插件开发指南）
- UI 能力：`@chips/component-library`（组件库对外使用总览）
- 多语言：所有界面文案通过 `i18n/*.json` 管理，不在组件内硬编码文本
- 主题系统：通过组件库 `ChipsThemeProvider` 接入主题运行时，不在业务代码中硬编码颜色/圆角/阴影
- 系统能力调用：仅通过 `window.chips.*`（Bridge API），不越层直接访问 Host 内部模块
- 卡片显示链路：通过 SDK 统一接口 `client.card.compositeWindow.render({ cardFile, mode })` 获取复合卡片 iframe

## 5. 数据流与交互流程（卡片查看器）

1. 用户通过以下方式之一选择卡片文件：  
   - 在应用窗口中拖入 `*.card` 文件（由 `DropZone` 处理）；  
   - 通过 Host 菜单“用卡片查看器打开”，由 Host 传入卡片文件路径；  
   - 通过 `cardViewer.pickCard` 等 Host 路由，由工具栏按钮触发。  
2. `App` 组件保存当前的 `cardFile` 状态。  
3. 当存在 `cardFile` 时，`App` 渲染 `CardWindow`：  
   - 通过 `window.chips.client.card.compositeWindow.render({ cardFile, mode: 'view' })` 调用 SDK；  
   - 将返回的 `iframe` DOM 节点挂载到 `CardWindow` 容器中。  
4. Host 内置渲染运行时：  
   - 解析复合卡片结构；  
   - 将内容分发给基础卡片插件；  
   - 收集各基础卡片 iframe 并拼接为完整的复合卡片窗口；  
   - 最终通过 `CompositeCardWindow` / SDK 接口将 iframe 交付给本应用。  

## 6. 下一步开发建议

1. 根据业务需要在 `src/features/` 或 `src/components/` 中扩展页面与组件；  
2. 通过组件库与主题系统接入真实 UI 并补充交互测试；  
3. 按需扩展 `manifest.yaml` 中的权限与 capabilities（遵循插件开发规范与 Manifest 配置规范）；  
4. 在编写或调整 Host/Bridge/SDK 调用前，查阅生态共用技术文档与 `Chips-SDK/技术文档/05-统一卡片显示链路技术方案.md`，保持与统一卡片显示链路规范一致。  

