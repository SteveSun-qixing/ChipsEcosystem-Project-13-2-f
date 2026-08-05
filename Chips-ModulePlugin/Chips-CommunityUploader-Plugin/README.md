# Chips Community Transfer

官方社区卡片传输模块，提供 `community.card.transfer` 能力。该模块只在薯片客户端/Host 中运行，浏览器 Web 运行时不加载。

## 职责

- 在用户设备上解包完整离线 `.card`。
- 扫描卡片内部资源和封面资源。
- 通过社区 `card-transfer` 控制面申请对象存储上传地址。
- 将资源和网络资源卡片直接上传到对象存储。
- 把配置中的卡片根相对资源路径改写为对象存储/CDN URL。
- 生成可逆恢复清单，记录原始路径、网络 URL 和 ZIP Store 条目信息。
- 从客户端下载社区卡片时，按下载计划取回网络资源卡片和资源，恢复原始相对路径并重新打包完整离线卡片。
- 打开远程社区卡片页面时，委托 Host 外部打开能力处理。

社区服务器只保存元数据、对象位置、恢复清单和渲染任务状态；文件字节由对象存储/CDN 承担。

## 能力

```ts
community.card.transfer / upload
community.card.transfer / download
community.card.transfer / openRemote
```

输入输出契约见：

- `contracts/upload.input.schema.json`
- `contracts/upload.output.schema.json`
- `contracts/download.input.schema.json`
- `contracts/download.output.schema.json`
- `contracts/openRemote.input.schema.json`
- `contracts/openRemote.output.schema.json`

## 运行边界

- Desktop Host：支持上传、下载、远程打开。
- Mobile Host/PAL：按同一能力契约支持。
- Web 浏览器：不支持上传、下载和打包；浏览器只负责社区网页查看。

## 验证

- `npm test`
- `npm run build`
- `npm run validate`，该命令会通过 `prevalidate` 自动先构建 `dist/index.mjs`
