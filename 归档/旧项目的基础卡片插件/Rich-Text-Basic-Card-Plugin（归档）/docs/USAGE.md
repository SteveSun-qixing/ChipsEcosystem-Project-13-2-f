# 富文本基础卡片插件使用指南

## 快速开始

### 安装

```bash
npm install @chips/rich-text-card-plugin
```

### 基本使用

```typescript
import { RichTextCardPlugin } from '@chips/rich-text-card-plugin';

// 1. 创建插件实例
const plugin = new RichTextCardPlugin();

// 2. 初始化（传入薯片内核实例）
await plugin.initialize(core);

// 3. 启动插件
await plugin.start();
```

---

## 渲染组件使用

### 渲染内联内容

```typescript
// 创建渲染器
const renderer = plugin.createRenderer();

// 配置
const config = {
  card_type: 'RichTextCard',
  content_source: 'inline',
  content_text: '<h1>标题</h1><p>正文内容...</p>'
};

// 渲染到容器
const container = document.getElementById('card-container');
await renderer.render(config, container, {
  mode: 'view',
  interactive: true
});
```

### 渲染文件内容

```typescript
const config = {
  card_type: 'RichTextCard',
  content_source: 'file',
  content_file: 'content.html'  // 文件路径
};

await renderer.render(config, container, {
  mode: 'view'
});
```

### 更新内容

```typescript
// 更新配置
await renderer.update({
  content_text: '<p>新的内容</p>'
});

// 更新主题
await renderer.update({
  theme: 'dark-theme'
});
```

### 获取状态

```typescript
const state = renderer.getState();
console.log(state.content);       // 当前内容
console.log(state.isLoading);     // 是否加载中
console.log(state.currentTheme);  // 当前主题
```

### 销毁渲染器

```typescript
await renderer.destroy();
```

---

## 编辑组件使用

### 创建编辑器

```typescript
const editor = plugin.createEditor();

await editor.render(config, container, {
  toolbar: true,          // 显示工具栏
  autoSave: true,         // 自动保存
  saveDelay: 1000,        // 自动保存延迟（毫秒）
  placeholder: '请输入内容...',
  maxLength: 100000,      // 最大字数
  maxImageSize: 5         // 最大图片大小（MB）
});
```

### 监听变更

```typescript
editor.onChange((newConfig) => {
  console.log('内容已变更:', newConfig);
  
  // 保存到卡片文件
  await saveConfig(cardId, newConfig);
});
```

### 格式化操作

```typescript
// 加粗
editor.format({ type: 'bold' });

// 斜体
editor.format({ type: 'italic' });

// 下划线
editor.format({ type: 'underline' });

// 标题
editor.format({ type: 'heading', level: 2 });

// 有序列表
editor.format({ type: 'orderedList' });

// 无序列表
editor.format({ type: 'unorderedList' });

// 引用
editor.format({ type: 'blockquote' });

// 文字颜色
editor.format({ type: 'color', value: '#FF0000' });

// 背景色
editor.format({ type: 'backgroundColor', value: '#FFFF00' });

// 对齐
editor.format({ type: 'align', value: 'center' });

// 清除格式
editor.format({ type: 'clearFormat' });
```

### 插入内容

```typescript
// 插入链接
editor.insert({
  type: 'link',
  url: 'https://example.com',
  text: '示例链接',
  newWindow: true
});

// 插入图片
editor.insert({
  type: 'image',
  src: 'image.jpg',
  alt: '图片描述'
});

// 插入分隔线
editor.insert({ type: 'horizontalRule' });
```

### 撤销/重做

```typescript
// 撤销
if (editor.canUndo()) {
  editor.undo();
}

// 重做
if (editor.canRedo()) {
  editor.redo();
}
```

### 获取内容

```typescript
// 获取HTML内容
const html = editor.getContent();

// 获取纯文本
const text = editor.getPlainText();

// 获取完整配置
const config = editor.getConfig();
```

### 验证

```typescript
const result = editor.validate();
if (!result.valid) {
  console.log('验证失败:', result.errors);
}
```

---

## 配置选项

### RichTextCardConfig

| 字段 | 类型 | 必需 | 说明 |
|-----|------|-----|------|
| card_type | `'RichTextCard'` | 是 | 卡片类型标识 |
| content_source | `'file' \| 'inline'` | 是 | 内容来源 |
| content_file | string | 否 | 文件路径（file模式） |
| content_text | string | 否 | 内联HTML（inline模式） |
| toolbar | boolean | 否 | 是否显示工具栏 |
| read_only | boolean | 否 | 是否只读 |
| theme | string | 否 | 主题包ID |
| layout | object | 否 | 布局配置 |

### RenderOptions

| 字段 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| mode | `'view' \| 'edit'` | - | 渲染模式 |
| theme | string | `''` | 主题ID |
| readonly | boolean | `true` | 是否只读 |
| interactive | boolean | `true` | 是否可交互 |
| locale | string | `'zh-CN'` | 语言 |

### EditorOptions

| 字段 | 类型 | 默认值 | 说明 |
|-----|------|-------|------|
| toolbar | boolean | `true` | 显示工具栏 |
| autoSave | boolean | `true` | 自动保存 |
| saveDelay | number | `1000` | 保存延迟 |
| placeholder | string | `''` | 占位符 |
| maxLength | number | `100000` | 最大字数 |
| maxImageSize | number | `5` | 最大图片大小(MB) |

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl/Cmd+B | 加粗 |
| Ctrl/Cmd+I | 斜体 |
| Ctrl/Cmd+U | 下划线 |
| Ctrl/Cmd+Z | 撤销 |
| Ctrl/Cmd+Shift+Z | 重做 |
| Tab | 列表缩进 |
| Shift+Tab | 减少缩进 |

---

## 主题定制

### CSS变量

```css
:root {
  --richtext-text-color: #333;
  --richtext-bg-color: #fff;
  --richtext-link-color: #0066cc;
  --richtext-border-color: #ddd;
  --richtext-font-family: sans-serif;
  --richtext-font-size: 16px;
  --richtext-line-height: 1.8;
  --richtext-paragraph-spacing: 1em;
  --richtext-list-indent: 2em;
}
```

### 样式类名

| 类名 | 说明 |
|-----|------|
| `.chips-richtext-container` | 容器 |
| `.chips-richtext-content` | 内容区 |
| `.chips-richtext-paragraph` | 段落 |
| `.chips-richtext-h1` ~ `.chips-richtext-h6` | 标题 |
| `.chips-richtext-ul` / `.chips-richtext-ol` | 列表 |
| `.chips-richtext-blockquote` | 引用 |
| `.chips-richtext-link` | 链接 |
| `.chips-richtext-image` | 图片 |
| `.chips-richtext-code` | 代码 |

---

## 常见问题

### 如何自定义工具栏按钮？

目前工具栏按钮是固定的，如需自定义，可以通过CSS隐藏不需要的按钮：

```css
/* 隐藏图片插入按钮 */
.chips-richtext-toolbar-button[title*="图片"] {
  display: none;
}
```

### 内容安全如何保证？

插件内置了HTML安全过滤器，会自动移除：
- `<script>`、`<style>` 等危险标签
- `onclick` 等事件属性
- `javascript:` 协议链接
- 危险的CSS表达式

### 如何处理大文档性能？

建议：
1. 使用虚拟滚动（需外部实现）
2. 分段加载内容
3. 设置合理的 `maxLength` 限制

### 支持哪些HTML标签？

支持的标签：
- 段落：`p`, `br`, `hr`
- 标题：`h1` ~ `h6`
- 格式：`strong`, `b`, `em`, `i`, `u`, `s`, `del`, `sup`, `sub`, `code`
- 列表：`ul`, `ol`, `li`
- 引用：`blockquote`
- 链接/图片：`a`, `img`
- 容器：`span`, `div`

---

## 故障排除

### 渲染失败

1. 检查配置是否正确（`card_type` 必须是 `'RichTextCard'`）
2. 检查 `content_source` 与内容字段是否匹配
3. 检查控制台是否有错误信息

### 样式不生效

1. 确认主题包已正确加载
2. 检查CSS变量是否已定义
3. 检查是否有更高优先级的样式覆盖

### 快捷键无响应

1. 确认编辑器已获取焦点
2. 检查是否被其他组件捕获了键盘事件

---

## API参考

完整的API文档请参阅：
- [接口定义](./technical/03-接口定义.md)
- [渲染组件设计](./technical/04-渲染组件设计.md)
- [编辑组件设计](./technical/05-编辑组件设计.md)
