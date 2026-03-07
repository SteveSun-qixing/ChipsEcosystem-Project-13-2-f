# @chips/testing

Testing helpers for component contract assertions, fixture builders, fallback-chain checks,
and fault-injection scaffolding.

## Exports

- `assertHasContractAttrs(nodeAttrs)`
- `createComponentFixture(options)`
- `assertAriaRole(nodeAttrs, expectedRole)`
- `assertStatePriority(state, priorityList)`
- `createThemeFallbackFixture(overrides)`
- `resolveFallbackScopeValue(fixture, key)`
- `injectFault(type, payload)`

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
