# Standard Basecard Plugin

> 通过 `chips-scaffold-basecard` 生成的标准基础卡片插件工程。

## 简介

本插件工程实现了一个基础卡片插件（`type: card`），用于演示如何：

- 在查看器中渲染基础卡片内容；
- 在编辑引擎中提供编辑面板，编辑基础卡片配置；
- 使用 YAML 配置文件保存基础卡片数据；
- 使用多语言文案与基础错误处理。

## 项目结构

```text
card-standard-project/
├─ manifest.yaml          # 插件清单（type: card）
├─ package.json           # NPM 配置
├─ tsconfig.json          # TypeScript 配置
├─ chips.config.mjs       # chips dev 构建配置
├─ src/
│  ├─ index.ts            # 插件入口（注册渲染与编辑模块）
│  ├─ render/
│  │  ├─ view.tsx         # 渲染模块：基础卡片视图
│  │  └─ runtime.ts       # 渲染运行时挂载逻辑
│  ├─ editor/
│  │  ├─ panel.tsx        # 编辑模块：编辑面板视图
│  │  └─ runtime.ts       # 编辑运行时挂载逻辑
│  ├─ schema/
│  │  └─ card-config.ts   # 配置 Schema 与类型定义
│  └─ shared/
│     └─ utils.ts         # 渲染与编辑共享工具函数
├─ config/
│  └─ logging.ts          # 日志封装
├─ i18n/
│  ├─ zh-CN.json          # 中文文案
│  └─ en-US.json          # 英文文案
├─ templates/
│  ├─ default-card-config.yaml  # 默认基础卡片配置模板
│  └─ parameters.md       # 参数表与填写说明
├─ tests/
│  ├─ unit/
│  │  ├─ render-view.test.tsx
│  │  └─ editor-panel.test.tsx
│  └─ integration/
│     └─ card-flow.test.ts
└─ assets/
   └─ icons/
      └─ basecard-icon.svg
```

## 快速开始

```bash
cd card-standard-project
npm install
npm run dev
```

在开发模式下，使用 `chips dev server` 启动本地开发环境，根据 `chips dev` 工具文档在 Host 工作区中加载插件进行调试。

## 配置结构

基础卡片配置类型在 `src/schema/card-config.ts` 中定义，对应 YAML 文件示例位于 `templates/default-card-config.yaml`。

参数表与填写说明见 `templates/parameters.md`。

