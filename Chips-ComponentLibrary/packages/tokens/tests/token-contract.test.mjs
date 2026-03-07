import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPath(target, keyPath) {
  return keyPath.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), target);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tokens");

test("card runtime component tokens exist", () => {
  const cardCover = readJson(path.join(root, "comp/card-cover-frame.json"));
  const composite = readJson(path.join(root, "comp/composite-card-window.json"));
  const button = readJson(path.join(root, "comp/button.json"));
  const input = readJson(path.join(root, "comp/input.json"));
  const checkbox = readJson(path.join(root, "comp/checkbox.json"));
  const radio = readJson(path.join(root, "comp/radio.json"));
  const sw = readJson(path.join(root, "comp/switch.json"));
  const select = readJson(path.join(root, "comp/select.json"));
  const dialog = readJson(path.join(root, "comp/dialog.json"));
  const popover = readJson(path.join(root, "comp/popover.json"));
  const tabs = readJson(path.join(root, "comp/tabs.json"));
  const menu = readJson(path.join(root, "comp/menu.json"));
  const tooltip = readJson(path.join(root, "comp/tooltip.json"));
  const formField = readJson(path.join(root, "comp/form-field.json"));
  const formGroup = readJson(path.join(root, "comp/form-group.json"));
  const virtualList = readJson(path.join(root, "comp/virtual-list.json"));
  const dataGrid = readJson(path.join(root, "comp/data-grid.json"));
  const tree = readJson(path.join(root, "comp/tree.json"));
  const dateTime = readJson(path.join(root, "comp/date-time.json"));
  const commandPalette = readJson(path.join(root, "comp/command-palette.json"));
  const splitPane = readJson(path.join(root, "comp/split-pane.json"));
  const dockPanel = readJson(path.join(root, "comp/dock-panel.json"));
  const inspector = readJson(path.join(root, "comp/inspector.json"));
  const panelHeader = readJson(path.join(root, "comp/panel-header.json"));
  const cardShell = readJson(path.join(root, "comp/card-shell.json"));
  const toolWindow = readJson(path.join(root, "comp/tool-window.json"));
  const errorBoundary = readJson(path.join(root, "comp/error-boundary.json"));
  const loadingBoundary = readJson(path.join(root, "comp/loading-boundary.json"));
  const notification = readJson(path.join(root, "comp/notification.json"));
  const toast = readJson(path.join(root, "comp/toast.json"));
  const emptyState = readJson(path.join(root, "comp/empty-state.json"));
  const skeleton = readJson(path.join(root, "comp/skeleton.json"));

  assert.ok(getPath(cardCover, "chips.comp.card-cover-frame.border.radius"));
  assert.ok(getPath(cardCover, "chips.comp.card-cover-frame.status.color.error"));
  assert.ok(getPath(composite, "chips.comp.composite-card-window.overlay.surface"));
  assert.ok(getPath(composite, "chips.comp.composite-card-window.status.color.error"));
  assert.ok(getPath(button, "chips.comp.button.root.surface.idle"));
  assert.ok(getPath(input, "chips.comp.input.root.border.error"));
  assert.ok(getPath(checkbox, "chips.comp.checkbox.control.surface.checked"));
  assert.ok(getPath(radio, "chips.comp.radio.control.surface.checked"));
  assert.ok(getPath(sw, "chips.comp.switch.track.surface.on"));
  assert.ok(getPath(select, "chips.comp.select.option.text.color"));
  assert.ok(getPath(dialog, "chips.comp.dialog.content.surface"));
  assert.ok(getPath(popover, "chips.comp.popover.content.border"));
  assert.ok(getPath(tabs, "chips.comp.tabs.trigger.surface.active"));
  assert.ok(getPath(menu, "chips.comp.menu.item.surface.active"));
  assert.ok(getPath(tooltip, "chips.comp.tooltip.content.text.color"));
  assert.ok(getPath(formField, "chips.comp.form-field.control.border.error"));
  assert.ok(getPath(formGroup, "chips.comp.form-group.status.color.error"));
  assert.ok(getPath(virtualList, "chips.comp.virtual-list.item.surface.active"));
  assert.ok(getPath(dataGrid, "chips.comp.data-grid.row.surface.selected"));
  assert.ok(getPath(tree, "chips.comp.tree.node.surface.selected"));
  assert.ok(getPath(dateTime, "chips.comp.date-time.input.border.error"));
  assert.ok(getPath(commandPalette, "chips.comp.command-palette.result.surface.active"));
  assert.ok(getPath(splitPane, "chips.comp.split-pane.handle.surface.active"));
  assert.ok(getPath(dockPanel, "chips.comp.dock-panel.tab.surface.active"));
  assert.ok(getPath(inspector, "chips.comp.inspector.section.header.surface.active"));
  assert.ok(getPath(panelHeader, "chips.comp.panel-header.action.surface.active"));
  assert.ok(getPath(cardShell, "chips.comp.card-shell.border.color"));
  assert.ok(getPath(toolWindow, "chips.comp.tool-window.control.surface.active"));
  assert.ok(getPath(errorBoundary, "chips.comp.error-boundary.root.border.error"));
  assert.ok(getPath(loadingBoundary, "chips.comp.loading-boundary.skeleton.surface.active"));
  assert.ok(getPath(notification, "chips.comp.notification.action.surface.active"));
  assert.ok(getPath(toast, "chips.comp.toast.close.color"));
  assert.ok(getPath(emptyState, "chips.comp.empty-state.description.color"));
  assert.ok(getPath(skeleton, "chips.comp.skeleton.item.surface.active"));
});

test("system token layer exists", () => {
  const sys = readJson(path.join(root, "sys.json"));

  assert.ok(getPath(sys, "chips.sys.color.surface"));
  assert.ok(getPath(sys, "chips.sys.color.error"));
});
