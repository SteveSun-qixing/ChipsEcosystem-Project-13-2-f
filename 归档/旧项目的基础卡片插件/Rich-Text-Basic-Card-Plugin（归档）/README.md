# 富文本基础卡片插件 (Rich Text Basic Card Plugin)

**版本**: 1.1.0  
**状态**: 已重构优化  
**最后更新**: 2026-02-04

## 🎉 最新改进（v1.1.0）

- ✅ **零硬编码多语言**：所有文本使用多语言系统
- ✅ **标准化错误处理**：完整的错误码和错误类
- ✅ **完善服务注册**：注册richtext.render和richtext.format服务
- ✅ **优化主题应用**：扩展CSS变量支持
- ✅ **改进资源访问**：使用chips://协议

**符合度提升**: 72% → 90%+ ✅

---

## 概述

富文本基础卡片插件是薯片生态的26种基础卡片类型之一，用于显示和编辑RTF格式的富文本内容。本插件提供完整的渲染组件和编辑组件，支持所见即所得的富文本编辑体验。

## 功能特性

### 渲染组件
- 正确渲染富文本格式内容（加粗、斜体、下划线、删除线等）
- 支持多级标题（H1-H6）
- 支持有序列表和无序列表
- 支持文字颜色和背景色
- 支持文字大小调整
- 支持对齐方式（左对齐、居中、右对齐、两端对齐）
- 支持超链接
- 支持图片嵌入
- 响应式布局设计
- 支持主题系统

### 编辑组件
- 所见即所得编辑模式
- 工具栏提供常用格式化功能
- 支持快捷键操作
- 实时预览
- 自动保存
- 撤销/重做支持

## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite + tsup
- **测试框架**: Vitest
- **富文本引擎**: 基于公共基础层的富文本渲染器

## 目录结构

```
Rich-Text-Basic-Card-Plugin/
├── docs/                          # 文档目录
│   ├── requirements/              # 需求文档
│   │   └── 01-需求规格说明书.md
│   ├── technical/                 # 技术文档
│   │   ├── 01-架构设计.md
│   │   ├── 02-数据模型设计.md
│   │   ├── 03-接口定义.md
│   │   ├── 04-渲染组件设计.md
│   │   └── 05-编辑组件设计.md
│   └── development/               # 开发计划
│       ├── 00-开发计划总览.md
│       └── Phase*/                # 各阶段任务
├── src/                           # 源代码
│   ├── renderer/                  # 渲染组件
│   ├── editor/                    # 编辑组件
│   ├── types/                     # 类型定义
│   ├── utils/                     # 工具函数
│   └── index.ts                   # 入口文件
├── tests/                         # 测试文件
│   ├── unit/                      # 单元测试
│   └── integration/               # 集成测试
├── assets/                        # 资源文件
│   └── i18n/                      # 国际化
├── manifest.yaml                  # 插件清单
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript配置
├── vite.config.ts                 # Vite配置
└── vitest.config.ts               # 测试配置
```

## 安装

```bash
npm install @chips/rich-text-card-plugin
```

## 快速开始

```typescript
import { RichTextCardPlugin } from '@chips/rich-text-card-plugin';

// 注册插件
const plugin = new RichTextCardPlugin();
await plugin.initialize(core);

// 渲染卡片
const renderer = plugin.createRenderer();
await renderer.render(config, container, options);
```

## API文档

详见 [技术文档](./docs/technical/)

## 开发指南

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 许可证

MIT License

## 贡献指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)
