import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  flattenTokens,
  validateComponentContract
} from "../src/validator.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../tokens/tokens");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function buildTokenTree() {
  const tree = {};
  for (const fileName of ["ref.json", "sys.json", "motion.json", "layout.json"]) {
    merge(tree, readJson(path.join(root, fileName)));
  }
  for (const fileName of [
    "button.json",
    "input.json",
    "checkbox.json",
    "radio.json",
    "switch.json",
    "select.json",
    "dialog.json",
    "popover.json",
    "tabs.json",
    "menu.json",
    "tooltip.json",
    "form-field.json",
    "form-group.json",
    "virtual-list.json",
    "data-grid.json",
    "tree.json",
    "date-time.json",
    "command-palette.json",
    "split-pane.json",
    "dock-panel.json",
    "inspector.json",
    "panel-header.json",
    "card-shell.json",
    "tool-window.json",
    "error-boundary.json",
    "loading-boundary.json",
    "notification.json",
    "toast.json",
    "empty-state.json",
    "skeleton.json",
    "card-cover-frame.json",
    "composite-card-window.json"
  ]) {
    merge(tree, readJson(path.join(root, "comp", fileName)));
  }
  return tree;
}

test("validateComponentContract accepts valid contract", () => {
  const tokenTree = buildTokenTree();
  const flat = flattenTokens(tokenTree);
  const contract = {
    component: "card-cover-frame",
    scope: "card-cover-frame",
    parts: ["root", "iframe"],
    states: ["idle", "ready"],
    tokens: ["chips.comp.card-cover-frame.name.color"],
    iframe: {
      requiredSandbox: true
    }
  };

  assert.equal(validateComponentContract(contract, flat), true);
});

test("validateComponentContract rejects unknown token", () => {
  const tokenTree = buildTokenTree();
  const flat = flattenTokens(tokenTree);
  const contract = {
    component: "card-cover-frame",
    scope: "card-cover-frame",
    parts: ["root"],
    states: ["idle"],
    tokens: ["chips.comp.card-cover-frame.missing.value"],
    iframe: {
      requiredSandbox: true
    }
  };

  assert.throws(
    () => validateComponentContract(contract, flat),
    /THEME_CONTRACT_TOKEN_MISSING/
  );
});
