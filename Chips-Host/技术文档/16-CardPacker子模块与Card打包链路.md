# CardPacker子模块与Card打包链路

## 适用范围

- 本文只描述 `Chips-Host` 内部 `card-packer` 子模块实现细节；
- 对外公开动作面与协议口径以生态共用技术文档为准。

## 模块归属

- 子模块位置：`packages/card-packer/src/`
- 上层接入点：`packages/card-service/src/card-service.ts`
- 对外路由：`card.pack`、`card.unpack`、`card.readMetadata`

## 职责边界

`CardPacker` 只负责卡片归档相关能力：

1. 校验目录态卡片必需结构：
   - `.card/metadata.yaml`
   - `.card/structure.yaml`
   - `.card/cover.html`
   - `content/`
2. 在打包前刷新 `structure.yaml manifest.card_count/resource_count/resources`
3. 生成并回填 `metadata.file_info`
4. 使用 `StoreZipService` 以 ZIP Store 模式输出正式 `.card`
5. 负责正式 `.card` 的解包
6. 负责免完整解包读取 `.card/metadata.yaml`

`CardPacker` 不负责：

- 卡片渲染
- 基础卡片插件分发
- 主题注入
- 编辑器运行时

这些职责继续留在 `CardService`。

## 关键实现

### pack

- 先把源目录复制到临时 staging 目录，避免直接改写工作区中的目录态卡片
- 在 staging 中重建 `structure.yaml manifest.*`
- 计算 `metadata.file_info.checksum` 时，会剥离 `file_info.total_size/checksum/generated_at`，避免校验值递归依赖最终归档自身
- `metadata.file_info.total_size` 通过反复打包直到大小稳定后回填

### unpack

- 直接委托 `StoreZipService.extract(...)`

### readMetadata

- 目录态卡片：直接读取 `.card/metadata.yaml`
- 归档态卡片：通过 `StoreZipService.readEntry(...)` 直接读取 `.card/metadata.yaml`，不先完整解包整个归档

## 调用链

1. 上层插件或 SDK 调用 `card.pack / card.unpack / card.readMetadata`
2. `register-host-services.ts` 把请求路由到 `CardService`
3. `CardService` 再委托 `CardPacker`
4. `CardPacker` 调用 `StoreZipService` 完成 ZIP Store 读写

## 维护注意事项

- 不要在调用方直接用 `zip.compress` 代替 `card.pack`
- 若后续扩展 `.card` 校验规则，应优先收口在 `CardPacker`
- 若调整 `metadata.file_info` 或 `structure.yaml manifest` 生成规则，必须同步更新共享文档与测试
