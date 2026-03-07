import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../contracts/components");

function readContract(fileName) {
  return JSON.parse(fs.readFileSync(path.join(base, fileName), "utf8"));
}

function assertCommonShape(contract) {
  assert.equal(typeof contract.component, "string");
  assert.equal(typeof contract.scope, "string");
  assert.ok(Array.isArray(contract.parts));
  assert.ok(Array.isArray(contract.states));
  assert.ok(Array.isArray(contract.tokens));
  assert.equal(contract.iframe.requiredSandbox, true);
}

test("card-cover-frame contract is complete", () => {
  const contract = readContract("card-cover-frame.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("iframe"));
  assert.ok(contract.states.includes("error"));
});

test("composite-card-window contract includes degraded state", () => {
  const contract = readContract("composite-card-window.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.states.includes("degraded"));
  assert.ok(contract.parts.includes("overlay"));
});

test("button contract contains interactive states", () => {
  const contract = readContract("button.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.states.includes("active"));
  assert.ok(contract.tokens.includes("chips.comp.button.root.surface.idle"));
});

test("input contract contains focus and error tokens", () => {
  const contract = readContract("input.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.states.includes("focus"));
  assert.ok(contract.tokens.includes("chips.comp.input.root.border.error"));
});

test("checkbox contract contains indicator part", () => {
  const contract = readContract("checkbox.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("indicator"));
  assert.ok(contract.tokens.includes("chips.comp.checkbox.indicator.color.checked"));
});

test("radio contract contains item and control parts", () => {
  const contract = readContract("radio.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("item"));
  assert.ok(contract.tokens.includes("chips.comp.radio.control.surface.checked"));
});

test("switch contract contains thumb part", () => {
  const contract = readContract("switch.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("thumb"));
  assert.ok(contract.tokens.includes("chips.comp.switch.thumb.surface"));
});

test("select contract contains list and option parts", () => {
  const contract = readContract("select.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("list"));
  assert.ok(contract.parts.includes("option"));
  assert.ok(contract.tokens.includes("chips.comp.select.option.surface.selected"));
});

test("dialog contract contains content and close parts", () => {
  const contract = readContract("dialog.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("content"));
  assert.ok(contract.parts.includes("close"));
  assert.ok(contract.tokens.includes("chips.comp.dialog.content.surface"));
});

test("popover contract contains positioner and arrow parts", () => {
  const contract = readContract("popover.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("positioner"));
  assert.ok(contract.parts.includes("arrow"));
  assert.ok(contract.tokens.includes("chips.comp.popover.content.border"));
});

test("tabs contract contains panel part and active token", () => {
  const contract = readContract("tabs.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("panel"));
  assert.ok(contract.tokens.includes("chips.comp.tabs.trigger.surface.active"));
});

test("menu contract contains menu item tokens", () => {
  const contract = readContract("menu.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("item"));
  assert.ok(contract.tokens.includes("chips.comp.menu.item.surface.active"));
});

test("tooltip contract contains content text token", () => {
  const contract = readContract("tooltip.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("arrow"));
  assert.ok(contract.tokens.includes("chips.comp.tooltip.content.text.color"));
});

test("form-field contract contains control and error parts", () => {
  const contract = readContract("form-field.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("control"));
  assert.ok(contract.parts.includes("error"));
  assert.ok(contract.tokens.includes("chips.comp.form-field.control.border.error"));
});

test("form-group contract contains content part and gap token", () => {
  const contract = readContract("form-group.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("content"));
  assert.ok(contract.tokens.includes("chips.comp.form-group.root.gap"));
});

test("virtual-list contract contains viewport and item tokens", () => {
  const contract = readContract("virtual-list.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("viewport"));
  assert.ok(contract.tokens.includes("chips.comp.virtual-list.item.surface.active"));
});

test("data-grid contract contains header and cell tokens", () => {
  const contract = readContract("data-grid.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("header"));
  assert.ok(contract.parts.includes("cell"));
  assert.ok(contract.tokens.includes("chips.comp.data-grid.row.surface.selected"));
});

test("tree contract contains node and children parts", () => {
  const contract = readContract("tree.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("children"));
  assert.ok(contract.tokens.includes("chips.comp.tree.node.surface.selected"));
});

test("date-time contract contains input error token", () => {
  const contract = readContract("date-time.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("input"));
  assert.ok(contract.tokens.includes("chips.comp.date-time.input.border.error"));
});

test("command-palette contract contains search and result tokens", () => {
  const contract = readContract("command-palette.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("search"));
  assert.ok(contract.tokens.includes("chips.comp.command-palette.result.surface.active"));
});

test("data-grid contract contains row selected token", () => {
  const contract = readContract("data-grid.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("row"));
  assert.ok(contract.tokens.includes("chips.comp.data-grid.row.surface.selected"));
});

test("tree contract contains node selected token", () => {
  const contract = readContract("tree.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("children"));
  assert.ok(contract.tokens.includes("chips.comp.tree.node.surface.selected"));
});

test("date-time contract contains input border error token", () => {
  const contract = readContract("date-time.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("input"));
  assert.ok(contract.tokens.includes("chips.comp.date-time.input.border.error"));
});

test("command-palette contract contains shortcut token", () => {
  const contract = readContract("command-palette.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("shortcut"));
  assert.ok(contract.tokens.includes("chips.comp.command-palette.shortcut.color"));
});

test("split-pane contract contains resizer token", () => {
  const contract = readContract("split-pane.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("resizer"));
  assert.ok(contract.tokens.includes("chips.comp.split-pane.handle.surface.active"));
});

test("dock-panel contract contains tab and content parts", () => {
  const contract = readContract("dock-panel.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("tab"));
  assert.ok(contract.parts.includes("content"));
  assert.ok(contract.tokens.includes("chips.comp.dock-panel.tab.surface.active"));
});

test("inspector contract contains section header token", () => {
  const contract = readContract("inspector.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("section"));
  assert.ok(contract.tokens.includes("chips.comp.inspector.section.header.surface.active"));
});

test("panel-header contract contains action token", () => {
  const contract = readContract("panel-header.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("actions"));
  assert.ok(contract.tokens.includes("chips.comp.panel-header.action.surface.active"));
});

test("card-shell contract contains border token", () => {
  const contract = readContract("card-shell.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("toolbar"));
  assert.ok(contract.tokens.includes("chips.comp.card-shell.border.color"));
});

test("tool-window contract contains control token", () => {
  const contract = readContract("tool-window.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("controls"));
  assert.ok(contract.tokens.includes("chips.comp.tool-window.control.surface.active"));
});

test("error-boundary contract contains action token", () => {
  const contract = readContract("error-boundary.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("action"));
  assert.ok(contract.tokens.includes("chips.comp.error-boundary.root.border.error"));
});

test("loading-boundary contract contains fallback token", () => {
  const contract = readContract("loading-boundary.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("fallback"));
  assert.ok(contract.tokens.includes("chips.comp.loading-boundary.skeleton.surface.active"));
});

test("notification contract contains list and close tokens", () => {
  const contract = readContract("notification.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("list"));
  assert.ok(contract.tokens.includes("chips.comp.notification.close.color"));
});

test("toast contract contains close token", () => {
  const contract = readContract("toast.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("close"));
  assert.ok(contract.tokens.includes("chips.comp.toast.close.color"));
});

test("empty-state contract contains title and action tokens", () => {
  const contract = readContract("empty-state.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("title"));
  assert.ok(contract.tokens.includes("chips.comp.empty-state.action.surface.active"));
});

test("skeleton contract contains item token", () => {
  const contract = readContract("skeleton.contract.json");
  assertCommonShape(contract);
  assert.ok(contract.parts.includes("item"));
  assert.ok(contract.tokens.includes("chips.comp.skeleton.item.surface.active"));
});
