# 图片基础卡片插件 (Image Basic Card Plugin)

**薯片生态 (Chips Ecosystem)** 图片基础卡片插件，用于展示图片内容。

## 功能特性

- **四种排版类型**
  - 单张图片：支持宽度百分比调节和对齐方式选择
  - 网格排版：支持 2×2、3×3、三列无限行三种网格模式
  - 长图拼接：支持固定窗口滚动和自适应无限长两种模式
  - 横向滑动：图片横向拼接，支持滑动查看

- **编辑功能**
  - 上传图片文件（拖拽或点击）
  - 通过 URL 添加图片
  - 拖动排序
  - 图片标题和替代文本编辑
  - 撤销/重做

- **开发规范**
  - 零硬编码文本（全部通过 i18n 系统管理）
  - 零硬编码样式（全部通过 CSS 变量和主题系统注入）
  - 通过内核路由通信
  - 完整的类型定义和配置验证
  - 80%+ 测试覆盖率

## 安装

```bash
pnpm add @chips/image-card-plugin
```

## 快速开始

```typescript
import { ImageCardPlugin } from '@chips/image-card-plugin';

// 创建插件实例
const plugin = new ImageCardPlugin();

// 初始化（传入内核实例）
await plugin.initialize(core);
await plugin.start();

// 创建渲染器
const renderer = plugin.createRenderer();
await renderer.render(config, container, { mode: 'view', interactive: true });

// 创建编辑器
const editor = plugin.createEditor();
await editor.render(config, container, { toolbar: true, preview: true });
editor.onChange((newConfig) => {
  // 保存配置到卡片文件
});
```

## 配置结构

```yaml
# content/{ID}.yaml
card_type: "ImageCard"
images:
  - id: "abc1234567"
    source: "file"
    file_path: "images/photo.jpg"
    alt: "示例图片"
    title: "一张照片"
  - id: "def7890123"
    source: "url"
    url: "https://example.com/image.png"
layout_type: "grid"           # single | grid | long-scroll | horizontal-scroll
layout_options:
  grid_mode: "3x3"            # 2x2 | 3x3 | 3-column-infinite
  gap: 8                      # 图片间距（像素）
theme: ""
layout:
  height_mode: "auto"
```

## 排版类型说明

### 单张图片 (`single`)
仅显示一张图片。当图片列表只有一张时自动使用此模式。
- `single_width_percent`: 图片宽度百分比（10-100）
- `single_alignment`: 对齐方式（left / center / right）

### 网格排版 (`grid`)
- `2x2`: 2列2行，最多显示4张图片
- `3x3`: 3列3行，最多显示9张，超出则最后格显示 "+N"
- `3-column-infinite`: 3列无限行，显示所有图片

### 长图拼接 (`long-scroll`)
图片按顺序纵向排列。
- `fixed-window`: 固定窗口大小，内容滚动
- `adaptive`: 窗口自适应，显示全部内容

### 横向滑动 (`horizontal-scroll`)
图片横向排列，用户可横向滑动查看。

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 类型检查
pnpm type-check

# 构建
pnpm build
```

## 项目结构

```
Image-Basic-Card-Plugin/
├── src/
│   ├── index.ts              # 主入口
│   ├── plugin.ts             # 插件主类
│   ├── renderer/
│   │   ├── index.ts          # 渲染器导出
│   │   ├── ImageRenderer.ts  # 渲染器类
│   │   └── ImageRenderer.vue # 渲染器Vue组件
│   ├── editor/
│   │   ├── index.ts          # 编辑器导出
│   │   ├── ImageEditor.ts    # 编辑器类
│   │   ├── ImageEditor.vue   # 编辑器Vue组件
│   │   └── history.ts        # 撤销重做管理器
│   ├── types/
│   │   ├── index.ts          # 类型导出
│   │   ├── config.ts         # 配置类型
│   │   ├── state.ts          # 状态类型
│   │   ├── commands.ts       # 命令类型
│   │   ├── options.ts        # 选项类型
│   │   ├── constants.ts      # 常量定义
│   │   ├── errors.ts         # 错误类型
│   │   ├── events.ts         # 事件类型
│   │   └── validation.ts     # 验证类型
│   └── utils/
│       ├── index.ts          # 工具导出
│       ├── i18n.ts           # 多语言工具
│       ├── validator.ts      # 配置验证器
│       └── dom.ts            # DOM和图片工具
├── tests/
│   ├── setup.ts              # 测试环境设置
│   ├── unit/                 # 单元测试
│   │   ├── plugin.test.ts
│   │   ├── validator.test.ts
│   │   ├── i18n.test.ts
│   │   ├── history.test.ts
│   │   └── dom.test.ts
│   └── integration/          # 集成测试
│       └── plugin.test.ts
├── assets/
│   └── i18n/
│       └── dev_vocabulary.yaml
├── docs/
├── manifest.yaml
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 技术栈

- **语言**: TypeScript 5.x
- **框架**: Vue 3.4+
- **构建**: Vite 5.x
- **测试**: Vitest 1.x
- **运行环境**: 薯片生态 (Chips Ecosystem)

## 许可证

MIT
