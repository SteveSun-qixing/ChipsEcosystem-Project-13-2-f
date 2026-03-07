import test from "node:test";
import assert from "node:assert/strict";
import {
  assertAriaRole,
  assertHasContractAttrs,
  assertStatePriority,
  createComponentFixture,
  createThemeFallbackFixture,
  injectFault,
  resolveFallbackScopeValue
} from "../src/index.js";

test("assertHasContractAttrs validates required attrs", () => {
  assert.equal(
    assertHasContractAttrs({
      "data-scope": "x",
      "data-part": "root",
      "data-state": "idle"
    }),
    true
  );
});

test("assertHasContractAttrs throws on missing attr", () => {
  assert.throws(
    () => assertHasContractAttrs({ "data-scope": "x", "data-part": "root" }),
    /TEST_CONTRACT_ATTR_MISSING:data-state/
  );
});

test("createComponentFixture generates contract attrs", () => {
  const fixture = createComponentFixture({
    scope: "button",
    part: "root",
    state: "focus",
    role: "button",
    ariaLabel: "button fixture"
  });

  assert.equal(fixture["data-scope"], "button");
  assert.equal(fixture.role, "button");
});

test("assertAriaRole validates role", () => {
  assert.equal(assertAriaRole({ role: "alert" }, "alert"), true);
  assert.throws(() => assertAriaRole({ role: "status" }, "alert"), /TEST_ARIA_ROLE_MISMATCH/);
});

test("assertStatePriority validates known state", () => {
  const priority = ["disabled", "loading", "error", "active", "focus", "hover", "idle"];
  assert.equal(assertStatePriority("focus", priority), true);
  assert.throws(() => assertStatePriority("unknown", priority), /TEST_STATE_NOT_IN_PRIORITY/);
});

test("resolveFallbackScopeValue follows high-to-low chain", () => {
  const fixture = createThemeFallbackFixture({
    global: { "chips.sys.color.surface": "g" },
    app: { "chips.sys.color.surface": "a" },
    component: {}
  });

  const resolved = resolveFallbackScopeValue(fixture, "chips.sys.color.surface");
  assert.deepEqual(resolved, {
    scope: "app",
    value: "a"
  });
});

test("injectFault returns typed fault payload", () => {
  const fault = injectFault("token-missing", { key: "chips.comp.button.root.surface.idle" });
  assert.equal(fault.type, "token-missing");
  assert.equal(fault.payload.key, "chips.comp.button.root.surface.idle");
});
