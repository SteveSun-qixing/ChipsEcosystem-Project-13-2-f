# PAL能力落地与路由防重放机制

## 1. 目标

- 将 `dialog/clipboard/shell` 从主机服务层完整下沉到 PAL 实现，消除占位式返回。
- 在 Kernel 路由层对非幂等动作启用 `requestId` 防重放窗口，满足质量文档的 `NFR-SEC-003`。

## 2. PAL Node 适配器落地

实现文件：`packages/pal/src/node-adapter.ts`

### 2.1 Dialog

- 对外能力：`openFile/saveFile/showMessage/showConfirm`。
- 行为优先级：`defaultPath` 优先（可确定性路径） -> 平台原生弹窗 -> 不支持错误。
- 平台策略：
  - macOS：`osascript`
  - Linux：`zenity`
  - Windows：`powershell + System.Windows.Forms`

### 2.2 Clipboard

- 当前基线只支持 `text` 格式。
- 平台策略：
  - macOS：`pbcopy/pbpaste`
  - Windows：`powershell Set-Clipboard/Get-Clipboard`
  - Linux：`wl-copy/wl-paste`，回退 `xclip/xsel`

### 2.3 Shell

- 对外能力：`openPath/openExternal/showItemInFolder`。
- 平台策略：
  - macOS：`open`
  - Windows：`explorer` / `cmd start`
  - Linux：`xdg-open`

## 3. 服务层路由绑定

实现文件：`src/main/services/register-host-services.ts`

- `platform.openExternal` 与 `shell.openExternal` 统一转发到 `ctx.pal.shell.openExternal`。
- `dialog.*` 路由统一走 `ctx.pal.dialog.*`，并对 `message` 必填字段做入站校验。
- `clipboard.*` 路由统一走 `ctx.pal.clipboard.*`，仅接受 `text`。
- `shell.*` 路由统一走 `ctx.pal.shell.*`，不再使用文件系统探测替代真实动作。

## 4. Kernel 防重放机制

实现文件：`packages/kernel/src/router.ts`

- 仅对 `idempotent=false` 的路由启用。
- 去重键：`route + caller.type + caller.id + requestId`。
- 默认窗口：10 分钟，可通过 `replayWindowMs` 配置。
- 命中重放时返回错误码：`ROUTE_REPLAY_DETECTED`。

## 5. 测试覆盖

- `tests/unit/kernel-router.test.ts`
  - 新增非幂等请求重放拒绝用例
  - 新增幂等请求重复放行用例
- `tests/unit/host-services-pal-routing.test.ts`
  - 校验 `dialog/clipboard/shell/platform.openExternal` 全量路由是否正确转发到 PAL
