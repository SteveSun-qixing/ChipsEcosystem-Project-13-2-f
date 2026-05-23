# @chips/testing

Testing helpers for component contract assertions, fixture builders, fallback-chain checks,
Provider-ready Chips environment mocks, and fault-injection scaffolding.

`@chips/testing` keeps component-library test ergonomics in one place. SDK/Bridge/Host action
semantics are owned by `chips-sdk/testing`; when a test needs formal Host simulator behavior,
prefer `chips-sdk/testing` directly. The mock client exported here keeps the same calls/state/events
shape for component hooks and Provider tests.

## Exports

- `assertHasContractAttrs(nodeAttrs)`
- `createComponentFixture(options)`
- `assertAriaRole(nodeAttrs, expectedRole)`
- `assertStatePriority(state, priorityList)`
- `createThemeFallbackFixture(overrides)`
- `resolveFallbackScopeValue(fixture, key)`
- `injectFault(type, payload)`
- `createMockSurfaceContext(overrides)`
- `createMockLaunchContext(overrides)`
- `createMockPermissionDeniedError(action, required, granted, options)`
- `createMockThemeDiagnosticSummary(overrides)`
- `createMockChipsHost(options)`
- `createMockChipsClient(options)`
- `createMockChipsEnvironment(options)`

## Usage

```js
import {
  createComponentFixture,
  assertHasContractAttrs,
  injectFault
} from "@chips/testing";

const fixture = createComponentFixture({
  scope: "button",
  part: "root",
  state: "focus",
  role: "button",
  ariaLabel: "save"
});

assertHasContractAttrs(fixture);

const fault = injectFault("config-source-exception", {
  key: "systemUx.toast.maxStack"
});
```

## Mock Chips Environment

```js
import {
  createMockChipsClient,
  createMockChipsEnvironment,
  createMockPermissionDeniedError
} from "@chips/testing";

const client = createMockChipsClient({
  permissions: ["theme.read"],
  translations: {
    "demo.save": "保存"
  }
});

await client.theme.apply("chips-official.default-dark-theme");
await client.command.register({
  commandId: "chips.demo.save",
  titleKey: "demo.commands.save.title",
  handlerId: "save"
});

client.setPermissionDenied("control-plane.diagnose", "control.write", ["control.read"]);

const environmentProps = createMockChipsEnvironment({ client });
```

Notes:

- `client.calls` records Host-like action calls.
- `client.events` and domain `onChanged/onInvoked` helpers share the same local event bus.
- Permission faults should use `createMockPermissionDeniedError` or `client.setPermissionDenied(...)` so hook tests receive standard diagnostics.
