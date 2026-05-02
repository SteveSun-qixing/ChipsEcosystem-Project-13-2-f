# 电子书基础卡片插件

`chips.basecard.book` 提供正式基础卡片类型 `base.book`，运行时别名为 `BookCard`。它用于在卡片文件中保存普通电子书资源，或保存从 ZIP/CBZ 图片包解包后的有序漫画图片序列。

## 功能

- 普通电子书：支持 EPUB/EPUB3、PDF、TXT/Markdown、MOBI、AZW/AZW3、FB2、DJVU 等格式作为卡片根目录内部资源保存。
- EPUB 元数据：上传 EPUB 时尽力解析 OPF 中的标题、作者和封面，并把封面作为正式卡片资源导入。
- 图片包：支持 ZIP/CBZ；不保存原压缩包，只保留解包后可识别的图片资源，非图片条目直接丢弃。
- 图片排序：支持按文件名或 ZIP 条目时间排序；时间缺失或不可区分时稳定回退文件名排序。
- 封面：图片包默认使用排序后的第一张图片作为封面，用户可另行上传封面覆盖。
- 打开资源：查看态通过 `openResource(...)` 表达资源打开意图，并透传 `chips.book-card` payload，不硬编码阅读器或图片查看器插件。

## 配置模型

核心字段在 `src/schema/card-config.ts` 中定义：

- `card_type: "BookCard"`
- `source_type: "ebook" | "image-sequence"`
- `book_file`
- `book_format`
- `book_name`
- `book_author`
- `cover_image`
- `image_sequence`
- `image_sort_basis`
- `resource_paths`

所有内部资源路径都必须是卡片根目录相对路径，不允许保存绝对路径、`blob:`、`data:` 或宿主临时 URL。

## 资源链路

编辑器只通过宿主提供的正式资源能力写入和删除内部资源：

- `importResource({ file, preferredPath })`
- `importArchiveBundle({ file, preferredRootDir, include, stripSingleRootDir, excludeSystemArtifacts })`
- `deleteResource(resourcePath)`
- `resolveResourceUrl(resourcePath)`
- `releaseResourceUrl(resourcePath)`

ZIP/CBZ 图片包通过通用 `importArchiveBundle(...)` 解包过滤后写入卡片根目录，不保存原压缩包。替换电子书、封面或图片包时，旧资源会通过 `deleteResource` 登记删除，最终物理删除由宿主持久化阶段处理。

## 打开 Payload

查看态点击普通电子书或图片包时，payload 形状为：

```ts
interface BookCardOpenPayload {
  kind: "chips.book-card";
  version: "1.0.0";
  cardType: "base.book";
  mode: "ebook" | "image-sequence";
  resources: {
    book?: BookOpenResource;
    images?: BookOpenResource[];
  };
  display: {
    title: string;
    author?: string;
  };
}
```

Host 负责把资源打开意图路由给合适的应用插件。`Chips-BookReader` 已消费普通电子书 payload，`Chips-PhotoViewer` 已消费图片序列 payload。

## 开发命令

```bash
npm run build
npm run test
npm run lint
npm run validate
```

工程由 `chips-scaffold-basecard` 初始化，并保留标准导出：

- `renderBasecardView(ctx)`
- `renderBasecardEditor(ctx)`
- `basecardDefinition`
