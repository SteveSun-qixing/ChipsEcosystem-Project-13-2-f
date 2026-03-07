import test from "node:test";
import assert from "node:assert/strict";
import { validateComponentA11y } from "../src/index.js";

test("stage9 a11y gate validates all component rules", () => {
  const assertions = [
    validateComponentA11y("button", { role: "button", "aria-label": "button" }),
    validateComponentA11y("input", { "aria-label": "input" }),
    validateComponentA11y("checkbox", { role: "checkbox", "aria-label": "checkbox" }),
    validateComponentA11y("radio", { role: "radio", "aria-label": "radio" }),
    validateComponentA11y("switch", { role: "switch", "aria-label": "switch" }),
    validateComponentA11y("select", {
      role: "button",
      "aria-label": "select",
      "aria-expanded": "true",
      "aria-controls": "select-list"
    }),
    validateComponentA11y("dialog", {
      role: "button",
      "aria-label": "dialog",
      "aria-expanded": "true",
      "aria-controls": "dialog-content"
    }),
    validateComponentA11y("popover", {
      role: "button",
      "aria-label": "popover",
      "aria-expanded": "true",
      "aria-controls": "popover-content"
    }),
    validateComponentA11y("tabs", { role: "tab", "aria-label": "tabs" }),
    validateComponentA11y("menu", {
      role: "button",
      "aria-label": "menu",
      "aria-expanded": "true",
      "aria-controls": "menu-content"
    }),
    validateComponentA11y("tooltip", { role: "tooltip" }),
    validateComponentA11y("form-field", { "aria-label": "field" }),
    validateComponentA11y("form-group", { role: "group", "aria-label": "group" }),
    validateComponentA11y("virtual-list", { role: "list", "aria-label": "list" }),
    validateComponentA11y("data-grid", { role: "grid", "aria-label": "grid" }),
    validateComponentA11y("tree", { role: "tree", "aria-label": "tree" }),
    validateComponentA11y("date-time", { "aria-label": "date-time" }),
    validateComponentA11y("command-palette", {
      role: "combobox",
      "aria-label": "commands",
      "aria-expanded": "true",
      "aria-controls": "command-list"
    }),
    validateComponentA11y("split-pane", { role: "group", "aria-label": "split pane" }),
    validateComponentA11y("dock-panel", { role: "tablist", "aria-label": "dock panel" }),
    validateComponentA11y("inspector", { role: "complementary", "aria-label": "inspector" }),
    validateComponentA11y("panel-header", { role: "group", "aria-label": "panel header" }),
    validateComponentA11y("card-shell", { role: "article", "aria-label": "card shell" }),
    validateComponentA11y("tool-window", { role: "dialog", "aria-label": "tool window" }),
    validateComponentA11y("error-boundary", { "aria-label": "error boundary" }),
    validateComponentA11y("loading-boundary", { role: "region", "aria-label": "loading boundary" }),
    validateComponentA11y("notification", { role: "region", "aria-label": "notifications" }),
    validateComponentA11y("toast", { role: "status", "aria-label": "toasts" }),
    validateComponentA11y("empty-state", { role: "region", "aria-label": "empty state" }),
    validateComponentA11y("skeleton", { role: "status", "aria-label": "skeleton" })
  ];

  assert.equal(assertions.every((item) => item === true), true);
});
