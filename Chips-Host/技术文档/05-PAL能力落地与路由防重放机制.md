# PAL能力落地与路由防重放机制

## 1. 目标

- 将系统能力统一收敛到 `platform.*` 服务域动作，Bridge 子域仅保留语义入口。
- 补齐 PAL 侧托盘、通知、快捷键、电源能力，消除“能力声明存在但实现缺失”的断层。
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

### 2.4 Tray / Notification / Shortcut / Power

- Tray：`set/clear/getState`，Electron 环境下对接 `Tray/Menu`，非 Electron 环境保留状态模型。
- Notification：`show`，Electron 环境下对接 `Notification`，无宿主时回退系统命令/控制台输出。
- Shortcut：`register/unregister/isRegistered/list/clear`，Electron 环境对接 `globalShortcut`。
- Power：`getState/setPreventSleep`，Electron 环境对接 `powerMonitor/powerSaveBlocker`。

## 3. 服务层路由绑定

实现文件：`src/main/services/register-host-services.ts`

- `platform.openExternal/platform.shellOpenExternal` 统一转发到 `ctx.pal.shell.openExternal`。
- `platform.dialog*` 路由统一走 `ctx.pal.dialog.*`，并对 `message` 必填字段做入站校验。
- `platform.clipboard*` 路由统一走 `ctx.pal.clipboard.*`，仅接受 `text`。
- `platform.shell*` 路由统一走 `ctx.pal.shell.*`，不再使用文件系统探测替代真实动作。
- 新增 `platform.notificationShow/platform.tray*/platform.shortcut*/platform.power*` 路由，完整覆盖 PAL 系统能力面。

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
  - 校验 `platform.dialog*/clipboard*/shell*/notification/tray/shortcut/power` 全量路由是否正确转发到 PAL
