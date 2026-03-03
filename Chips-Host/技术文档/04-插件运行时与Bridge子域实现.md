# 插件运行时与 Bridge 子域实现

## 实现目标

- 落地 `plugin-init` 握手流程（会话 nonce 校验）。
- 提供插件会话、权限快照、配额治理能力。
- Bridge 提供 `window/dialog/plugin/clipboard/shell` 子域 API。

## 插件运行时

实现文件：
- `src/runtime/plugin-runtime.ts`

核心能力：
- 插件安装/启停/卸载持久化。
- 会话握手：`plugin.init` -> `plugin.handshake.complete`。
- 权限校验：按 manifest 权限声明执行。
- 配额治理：CPU、内存、消息频率预算。

## Bridge 子域

实现文件：
- `packages/bridge-api/src/bridge-transport.ts`

子域动作映射：
- `window.*` -> `window.open/focus/resize/setState/getState/close`
- `dialog.*` -> `dialog.openFile/saveFile/showMessage/showConfirm`
- `plugin.*` -> `plugin.install/enable/disable/uninstall/query`
- `clipboard.*` -> `clipboard.read/write`
- `shell.*` -> `shell.openPath/openExternal/showItemInFolder`

## 服务注册联动

实现文件：
- `src/main/services/register-host-services.ts`
- `src/main/services/register-schemas.ts`

已增加对上述动作的 schema 注册与服务处理逻辑。

## 测试覆盖

- `tests/unit/plugin-runtime.test.ts`
- `tests/unit/bridge-transport.test.ts`
- `tests/contract/route-manifest.contract.test.ts`
- `tests/integration/host-services.test.ts`（插件握手流程）
