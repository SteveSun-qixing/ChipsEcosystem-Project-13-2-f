# TIFF 转 PNG 资源转换服务设计

> 适用范围：`Chips-Host` 内部实现细节
> 对外正式契约：`生态共用技术文档/协议与契约/11-资源图像转换契约.md`

## 1. 定位

本设计只描述 Host 内部如何承接 `resource.convertTiffToPng`。

内部实现目标：

1. 继续把对外入口收口在 `resource` 服务域；
2. 不把 TIFF 校验、平台分支和错误映射散落在路由层；
3. 让音乐播放器、资源管理器、卡片链路等后续调用方可以复用同一套内部模块。

## 2. 分层拆分

正式分层如下：

```text
resource.convertTiffToPng route
  -> ResourceImageService
       -> PAL image.convertTiffToPng
```

职责划分：

- `register-host-services.ts`
  - 注册 `resource.convertTiffToPng`
  - 只做路由接线、权限、超时与指标
- `packages/resource-image-service`
  - 归一 `resourceId`
  - 校验 TIFF 签名
  - 归一错误码到 `RESOURCE_TIFF_*`
- `packages/pal/src/node-adapter.ts`
  - 承担平台差异
  - 把源文件真正转换为 PNG 文件

## 3. 输入与校验链路

`ResourceImageService.convertTiffToPng(...)` 的内部处理顺序固定为：

1. 把 `resourceId` 归一为本地文件路径；
2. 仅接受本地路径或 `file://`；
3. 读取源文件字节；
4. 校验 TIFF 文件签名；
5. 委托 PAL 图像能力执行转换；
6. 把底层异常映射为 `RESOURCE_TIFF_*`；
7. 返回已落盘的 PNG 文件信息。

当前 TIFF 判定签名支持：

- Little-endian TIFF
- Big-endian TIFF
- Little-endian BigTIFF
- Big-endian BigTIFF

## 4. PAL 策略

当前 Node PAL 的转换策略按平台选择：

- macOS：调用 `sips -s format png ... --out ...`
- Windows：通过 PowerShell + `System.Drawing` 保存 PNG
- 其他平台：优先探测 `magick`，其次 `convert`

说明：

- 服务层不直接判断平台，也不直接调用系统命令；
- 输出 PNG 尺寸由 PAL 在结果文件上读取 IHDR 获得；
- 若当前运行时没有可用策略，PAL 抛出 `PAL_IMAGE_UNSUPPORTED`，再由 `ResourceImageService` 归一为 `RESOURCE_TIFF_CONVERSION_UNSUPPORTED`。

## 5. 错误归一

内部错误映射表：

| 底层错误 | 对外错误 |
|---|---|
| `PAL_IMAGE_SOURCE_NOT_FOUND` | `RESOURCE_TIFF_SOURCE_NOT_FOUND` |
| `PAL_IMAGE_INVALID_OUTPUT` | `RESOURCE_TIFF_INVALID_OUTPUT` |
| `PAL_IMAGE_OUTPUT_EXISTS` | `RESOURCE_TIFF_OUTPUT_EXISTS` |
| `PAL_IMAGE_UNSUPPORTED` | `RESOURCE_TIFF_CONVERSION_UNSUPPORTED` |
| `PAL_COMMAND_NOT_FOUND` / `PAL_COMMAND_FAILED` | `RESOURCE_TIFF_CONVERSION_FAILED` |

未命中的异常保持原样继续上抛，避免误改写未知故障。

## 6. 测试收口

当前测试覆盖：

- `tests/unit/host-services-pal-routing.test.ts`
  - 验证 `resource.convertTiffToPng` 会委托到 PAL 图像能力
- `tests/integration/host-services.test.ts`
  - 在 macOS 上使用真实 TIFF 样本验证 Host 能产出 PNG 文件
- `tests/contract/route-manifest.contract.test.ts`
  - 验证公开路由清单包含 `resource.convertTiffToPng`

## 7. 后续约束

- 若未来扩展更多图片格式转换，优先继续复用 `resource-image-service` 和 PAL `image` 能力；
- 不允许在应用插件、模块插件或单一业务仓再复制第二套 TIFF 转 PNG 实现；
- 若未来公共契约扩展为更多图像格式映射，应先更新共享契约文档，再更新 Host 与 SDK。
