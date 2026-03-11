import test from "node:test";
import assert from "node:assert/strict";
import * as aggregate from "../index.js";
import { toStandardError as toComponentStandardError } from "@chips/components";
import { toStandardError as toCardRuntimeStandardError } from "@chips/card-runtime";

test("component-library aggregate exports the formal package surface", () => {
  assert.equal(typeof aggregate.ChipsThemeProvider, "function");
  assert.ok(aggregate.ChipsButton);
  assert.equal(typeof aggregate.CardCoverFrame, "function");
  assert.equal(typeof aggregate.CompositeCardWindow, "function");
  assert.equal(typeof aggregate.loadCompositeWindowData, "function");
  assert.equal(typeof aggregate.validateCardDisplayAdapter, "function");
});

test("component-library aggregate resolves helper name collisions through explicit aliases", () => {
  assert.equal("toStandardError" in aggregate, false);
  assert.equal(aggregate.toComponentStandardError, toComponentStandardError);
  assert.equal(aggregate.toCardRuntimeStandardError, toCardRuntimeStandardError);
});
