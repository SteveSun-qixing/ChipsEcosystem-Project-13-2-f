# SDK 使用指南

> 文档状态：阶段06任务02口径同步稿（2026-02-26）
> 统一口径：12层 vNext、Bridge 三层（`UI Hooks -> Runtime Client -> Bridge Transport`）、主题动作（`theme.list/theme.apply/theme.getCurrent/theme.getAllCss/theme.resolve/theme.contract.get`）、`cpx` + `baseWidth: 1024`。
> 冲突优先级：若与历史描述冲突，以 `生态架构设计/生态重构开发计划/18-阶段18-主题系统组件库前端框架开发/执行计划/阶段05-Host-SDK-桥接中间层统一/` 目录下任务文档为准。

`@chips/sdk` 是插件开发的官方工具包。阶段05任务03后，SDK 不再提供历史动作自动映射。

阶段06模板契约边界补充：
- 页面型模板（`app/card/layout/module`）要求 `ui.layout` 字段；
- `theme` 模板豁免 `ui.layout`，但仍必须遵守统一调用链和错误模型。

## 1. 安装

```bash
pnpm add @chips/sdk
```

## 2. 初始化 SDK

```ts
import { ChipsSDK } from '@chips/sdk';

const sdk = new ChipsSDK({
  autoConnect: true,
  bridge: { timeout: 30_000 },
});

await sdk.initialize();
```

## 3. Runtime Client 用法

```ts
import { RuntimeClient } from '@chips/sdk';

const runtime = new RuntimeClient();

const currentTheme = await runtime.invoke('theme', 'getCurrent', {});
await runtime.invoke('theme', 'apply', { id: 'chips-official.default-theme' });
```

约束：
- 自动重试仅在 `retryable=true` 时生效。
- 退避固定 `200ms * 2^n`，最多 3 次。
- 历史动作（如 `theme.getCSS`、`theme.setCurrent`）不再映射，直接按契约阻断。

## 4. Hooks（推荐）

```ts
import {
  useThemeHook,
  useI18nHook,
  useFile,
  useWindow,
  usePlugin,
  useConfigHook,
} from '@chips/sdk';

const theme = useThemeHook();
await theme.apply('chips-official.default-theme');

const i18n = useI18nHook();
await i18n.setCurrent('en-US', { persist: true });
```

## 5. Vue composables（现行导出）

```ts
import { useTheme, useI18n, useCard, useConfig } from '@chips/sdk';
```

## 5.1 主题与 i18n 事件订阅

SDK Hooks 自动订阅 `theme.changed` 和 `language.changed` 事件：

```ts
const theme = useThemeHook();

// 订阅主题变更（theme.apply 后自动触发）
theme.onChanged((payload) => {
  console.log('主题已切换:', payload.themeId);
  // 重新获取 CSS 并更新样式
});

const i18n = useI18nHook();

// 订阅语言变更（i18n.setCurrent 后自动触发）
i18n.onChanged((payload) => {
  console.log('语言已切换:', payload.language);
});
```

> 注：事件由 Host 服务层发布，通过 `event-forwarder` 自动转发到所有渲染进程。SDK Hooks 内部通过 `window.chips.on('theme.changed', ...)` 订阅。

## 6. 错误处理

```ts
try {
  await runtime.invoke('theme', 'getAllCss', {});
} catch (error) {
  const e = error as { code?: string; message?: string; details?: unknown; retryable?: boolean };
  console.error(e.code, e.message, e.retryable, e.details);
}
```

错误对象统一为：

```ts
interface StandardError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}
```

## 7. 规范来源

- `生态架构设计/技术规格/Bridge API 技术规格.md`
- `生态架构设计/技术规格/基础服务 API 规格.md`
- `生态共用/05-前端接口标准.md`
