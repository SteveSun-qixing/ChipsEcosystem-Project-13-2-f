import test from "node:test";
import assert from "node:assert/strict";
import {
  applyThemeVariablesInBatches,
  applyThemeVariables,
  ChipsThemeProvider,
  ChipsTokenProvider,
  subscribeThemeChanged,
  useComponentTokens,
  useThemeRuntime,
  useToken,
  useTokenResolver
} from "../src/index.js";

test("hooks package exports expected APIs", () => {
  assert.equal(typeof ChipsTokenProvider, "function");
  assert.equal(typeof ChipsThemeProvider, "function");
  assert.equal(typeof useTokenResolver, "function");
  assert.equal(typeof useToken, "function");
  assert.equal(typeof useComponentTokens, "function");
  assert.equal(typeof useThemeRuntime, "function");
  assert.equal(typeof applyThemeVariablesInBatches, "function");
});

test("subscribeThemeChanged supports on/off event source", () => {
  const listeners = new Map();
  const payloads = [];
  const source = {
    on(name, handler) {
      listeners.set(name, handler);
    },
    off(name) {
      listeners.delete(name);
    }
  };

  const unsubscribe = subscribeThemeChanged(source, "theme.changed", (payload) => {
    payloads.push(payload);
  });

  listeners.get("theme.changed")({ themeId: "chips.dark" });
  assert.equal(payloads.length, 1);
  unsubscribe();
  assert.equal(listeners.has("theme.changed"), false);
});

test("applyThemeVariables writes css custom properties", () => {
  const records = [];
  const target = {
    style: {
      setProperty(name, value) {
        records.push({ name, value });
      }
    }
  };

  applyThemeVariables(target, {
    "chips.sys.color.surface": "#fff",
    "chips.comp.button.height.md": "40px"
  });

  assert.deepEqual(records, [
    { name: "--chips-sys-color-surface", value: "#fff" },
    { name: "--chips-comp-button-height-md", value: "40px" }
  ]);
});

test("applyThemeVariables throws when target is invalid", () => {
  assert.throws(
    () => applyThemeVariables({}, { "chips.sys.color.surface": "#fff" }),
    /THEME_VARIABLE_TARGET_INVALID/
  );
});

test("applyThemeVariablesInBatches applies variables with chunk diagnostics", async () => {
  const records = [];
  const diagnostics = [];
  const chunks = [];
  const target = {
    style: {
      setProperty(name, value) {
        records.push({ name, value });
      }
    }
  };

  const result = await applyThemeVariablesInBatches(
    target,
    {
      "chips.a": 1,
      "chips.b": 2,
      "chips.c": 3
    },
    {
      chunkSize: 2,
      scheduler: () => Promise.resolve(),
      onDiagnostic(event) {
        diagnostics.push(event);
      },
      onChunkApplied(event) {
        chunks.push(event);
      }
    }
  );

  assert.equal(result.appliedCount, 3);
  assert.equal(result.chunkCount, 2);
  assert.equal(records.length, 3);
  assert.equal(diagnostics.length, 2);
  assert.equal(chunks.length, 2);
});

test("applyThemeVariablesInBatches throws on abort", async () => {
  const target = {
    style: {
      setProperty() {}
    }
  };

  const signal = { aborted: true };
  await assert.rejects(
    () =>
      applyThemeVariablesInBatches(
        target,
        {
          "chips.a": 1
        },
        {
          signal
        }
      ),
    (error) => error.code === "THEME_VARIABLE_APPLY_ABORTED"
  );
});
