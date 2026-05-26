# Chips Community Uploader

官方社区上传模块，提供 `community.card.publish/publish` 能力。

## 职责

- 在用户设备上解包 `.card`。
- 扫描卡片内部资源和封面资源。
- 通过社区上传会话申请资源直传地址。
- 将资源直传到资源服务器。
- 替换 `content/*.yaml` 与 `.card/cover.html` 中的内部资源引用。
- 删除已外置资源并重新打包处理后的 `.card`。
- 把处理后的 `.card` 提交给社区服务器。

社区服务器保存 `.card` 源文件并异步生成查看缓存；本模块不做图形界面，也不在本地渲染社区查看页。

## 能力

```ts
community.card.publish / publish
```

输入见 `contracts/publish.input.schema.json`，输出见 `contracts/publish.output.schema.json`。

## 验证

- `npm test`
- `npm run build`
- `npm run validate`，该命令会通过 `prevalidate` 自动先构建 `dist/index.mjs`
