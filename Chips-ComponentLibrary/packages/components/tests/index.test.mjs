import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComponentContract,
  ChipsButton,
  ChipsCheckbox,
  ChipsCommandPalette,
  ChipsDataGrid,
  ChipsDateTime,
  ChipsDockPanel,
  ChipsDialog,
  ChipsEmptyState,
  ChipsIcon,
  ChipsErrorBoundary,
  ChipsFormField,
  ChipsFormGroup,
  ChipsInput,
  ChipsInspector,
  ChipsLoadingBoundary,
  ChipsMenu,
  ChipsNotification,
  ChipsPanelHeader,
  ChipsPopover,
  ChipsRadioGroup,
  ChipsSkeleton,
  ChipsSplitPane,
  ChipsSelect,
  ChipsSwitch,
  ChipsTabs,
  ChipsToast,
  ChipsToolWindow,
  ChipsTree,
  ChipsTooltip,
  ChipsVirtualList,
  ChipsCardShell,
  COMPONENT_TOKEN_MAP,
  clampSplitRatio,
  createObservationRecord,
  dismissSystemMessage,
  applyDataGridSort,
  computeVirtualWindow,
  createComponentMeta,
  filterCommandPaletteItems,
  findTreeParentId,
  flattenTreeNodes,
  getNextEnabledIndex,
  InteractiveEventType,
  interactiveStateReducer,
  normalizeSystemMessageItems,
  parsePositiveInteger,
  P0_BASE_INTERACTIVE_COMPONENTS,
  P0_DATA_FORM_COMPONENTS,
  resolveConfigValue,
  resolveDockPanelStateMap,
  resolveI18nText,
  resolveSystemMessageQueue,
  resolveInteractiveState,
  STAGE7_DATA_ADVANCED_COMPONENTS,
  STAGE7_WORKBENCH_COMPONENTS,
  STAGE8_SYSTEM_UX_COMPONENTS,
  toStandardError,
  toggleInspectorSection,
  validateComponentA11y
} from "../src/index.js";

test("createComponentMeta builds metadata", () => {
  const meta = createComponentMeta({
    name: "ChipsButton",
    scope: "button",
    parts: ["root"],
    states: ["idle"]
  });

  assert.equal(meta.scope, "button");
});

test("createComponentMeta validates parts", () => {
  assert.throws(
    () => createComponentMeta({ name: "X", scope: "x", parts: [], states: ["idle"] }),
    /COMPONENT_META_INVALID:parts/
  );
});

test("resolveInteractiveState follows priority order", () => {
  assert.equal(
    resolveInteractiveState({
      disabled: true,
      loading: true,
      error: { code: "X", message: "x" },
      interaction: { active: true, focused: true, hovered: true }
    }),
    "disabled"
  );

  assert.equal(
    resolveInteractiveState({
      disabled: false,
      loading: true,
      error: { code: "X", message: "x" },
      interaction: { active: true, focused: true, hovered: true }
    }),
    "loading"
  );

  assert.equal(
    resolveInteractiveState({
      disabled: false,
      loading: false,
      error: { code: "X", message: "x" },
      interaction: { active: true, focused: true, hovered: true }
    }),
    "error"
  );
});

test("interactiveStateReducer transitions states correctly", () => {
  let state = {
    hovered: false,
    focused: false,
    active: false
  };

  state = interactiveStateReducer(state, { type: InteractiveEventType.POINTER_ENTER });
  state = interactiveStateReducer(state, { type: InteractiveEventType.FOCUS });
  state = interactiveStateReducer(state, { type: InteractiveEventType.PRESS_START });

  assert.deepEqual(state, {
    hovered: true,
    focused: true,
    active: true
  });

  state = interactiveStateReducer(state, { type: InteractiveEventType.POINTER_LEAVE });
  assert.equal(state.hovered, false);
  assert.equal(state.active, false);
});

test("buildComponentContract returns predefined contract", () => {
  const contract = buildComponentContract("button");
  assert.equal(contract.scope, "button");
  assert.ok(contract.tokens.includes("chips.comp.button.root.radius"));
});

test("buildComponentContract validates component key", () => {
  assert.throws(
    () => buildComponentContract("unknown-component"),
    /COMPONENT_CONTRACT_TOKEN_MAP_MISSING/
  );
});

test("buildComponentContract returns icon component contract", () => {
  const contract = buildComponentContract("icon");
  assert.equal(contract.scope, "icon");
  assert.deepEqual(contract.parts, ["root"]);
});

test("component token map includes complete P0 base interactive keys", () => {
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.button));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.input));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.checkbox));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.radio));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.select));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.switch));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.dialog));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.popover));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.tabs));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.menu));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.tooltip));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["form-field"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["form-group"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["virtual-list"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["data-grid"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.tree));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["date-time"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["command-palette"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["split-pane"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["dock-panel"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.inspector));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["panel-header"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["card-shell"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["tool-window"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["error-boundary"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["loading-boundary"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.notification));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.toast));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP["empty-state"]));
  assert.ok(Array.isArray(COMPONENT_TOKEN_MAP.skeleton));
});

test("validateComponentA11y validates known components and rejects missing rule", () => {
  assert.equal(
    validateComponentA11y("icon", {
      "aria-hidden": "true"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("input", {
      "aria-label": "name"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("switch", {
      role: "switch",
      "aria-label": "state"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("select", {
      role: "button",
      "aria-label": "selector",
      "aria-expanded": "true",
      "aria-controls": "list-id"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("dialog", {
      role: "button",
      "aria-label": "open dialog",
      "aria-expanded": "true",
      "aria-controls": "dialog-id"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("tabs", {
      role: "tab",
      "aria-label": "general"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("menu", {
      role: "button",
      "aria-label": "open menu",
      "aria-expanded": "true",
      "aria-controls": "menu-id"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("tooltip", {
      role: "tooltip"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("form-field", {
      "aria-label": "card name"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("form-group", {
      role: "group",
      "aria-label": "base card group"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("virtual-list", {
      role: "list",
      "aria-label": "result list"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("data-grid", {
      role: "grid",
      "aria-label": "table"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("tree", {
      role: "tree",
      "aria-label": "tree"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("date-time", {
      "aria-label": "time input"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("command-palette", {
      role: "combobox",
      "aria-label": "search command",
      "aria-expanded": "true",
      "aria-controls": "palette-list"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("split-pane", {
      role: "group",
      "aria-label": "split layout"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("dock-panel", {
      role: "tablist",
      "aria-label": "dock panel list"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("inspector", {
      role: "complementary",
      "aria-label": "inspector"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("panel-header", {
      role: "group",
      "aria-label": "panel header"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("card-shell", {
      role: "article",
      "aria-label": "card shell"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("tool-window", {
      role: "dialog",
      "aria-label": "tool window"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("error-boundary", {
      role: "alert",
      "aria-label": "error boundary"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("loading-boundary", {
      role: "region",
      "aria-label": "loading boundary"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("notification", {
      role: "region",
      "aria-label": "notification center"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("toast", {
      role: "status",
      "aria-label": "toast"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("empty-state", {
      role: "region",
      "aria-label": "empty state"
    }),
    true
  );

  assert.equal(
    validateComponentA11y("skeleton", {
      role: "status",
      "aria-label": "loading placeholder"
    }),
    true
  );

  assert.throws(
    () => validateComponentA11y("calendar", {}),
    /COMPONENT_A11Y_RULE_MISSING/
  );
});

test("ChipsIcon normalizes ligature name and axis variables", () => {
  const rendered = ChipsIcon.render(
    {
      descriptor: {
        name: "calendar-month",
        style: "rounded",
        fill: 1,
        wght: 500,
        grad: 25,
        opsz: 20
      },
      size: 20,
      color: "rebeccapurple"
    },
    null
  );

  assert.equal(rendered.props["data-icon-name"], "calendar_month");
  assert.equal(rendered.props["data-icon-style"], "rounded");
  assert.equal(rendered.props.style["--chips-icon-fill"], "1");
  assert.equal(rendered.props.style["--chips-icon-size"], "20px");
  assert.equal(rendered.props.children, "calendar_month");
});

test("ChipsIcon requires a label for non-decorative icons", () => {
  assert.throws(
    () =>
      ChipsIcon.render(
        {
          descriptor: {
            name: "warning",
            decorative: false
          }
        },
        null
      ),
    /ICON_A11Y_LABEL_REQUIRED/
  );
});

test("toStandardError normalizes object and primitive errors", () => {
  assert.deepEqual(toStandardError({ code: "X", message: "failed", retryable: true }), {
    code: "X",
    message: "failed",
    details: undefined,
    retryable: true
  });

  assert.equal(
    toStandardError("failed", "SYSTEM_ERROR").code,
    "SYSTEM_ERROR"
  );
});

test("resolveI18nText and resolveConfigValue apply fallback path", () => {
  const diagnostics = [];

  const text = resolveI18nText({
    i18n: null,
    key: "missing.key",
    fallback: "Fallback",
    onDiagnostic(event) {
      diagnostics.push(event);
    }
  });

  const value = resolveConfigValue({
    configSource: { systemUx: { loading: { delayMs: 200 } } },
    key: "systemUx.loading.delayMs",
    defaultValue: 120,
    parser: (source) => (Number.isInteger(source) ? source : undefined)
  });

  assert.equal(text, "Fallback");
  assert.equal(value, 200);
  assert.equal(diagnostics[0].code, "SYSTEM_UX_I18N_KEY_FALLBACK");
});

test("createObservationRecord includes standard fields", () => {
  const record = createObservationRecord({
    traceId: "trace-001",
    component: "toast",
    action: "dismiss",
    durationMs: 12
  });

  assert.equal(record.traceId, "trace-001");
  assert.equal(record.component, "toast");
  assert.equal(record.action, "dismiss");
  assert.equal(record.durationMs, 12);
});

test("parsePositiveInteger accepts positive integers only", () => {
  assert.equal(parsePositiveInteger(3), 3);
  assert.equal(parsePositiveInteger(0), undefined);
  assert.equal(parsePositiveInteger(-1), undefined);
  assert.equal(parsePositiveInteger(1.2), undefined);
});

test("normalizeSystemMessageItems normalizes tone id and duration", () => {
  const normalized = normalizeSystemMessageItems(
    [
      { title: "A", tone: "warning", durationMs: 1000 },
      { id: 2, title: "B", tone: "x", durationMs: -1 }
    ],
    "notification"
  );

  assert.equal(normalized[0].id, "notification-0");
  assert.equal(normalized[0].tone, "warning");
  assert.equal(normalized[1].id, "2");
  assert.equal(normalized[1].tone, "info");
  assert.equal(normalized[1].durationMs, null);
});

test("resolveSystemMessageQueue respects max and duration fallback", () => {
  const queue = resolveSystemMessageQueue({
    items: [
      { id: "a", message: "one", durationMs: null },
      { id: "b", message: "two", durationMs: 1500 },
      { id: "c", message: "three", durationMs: null }
    ],
    maxVisible: 2,
    defaultDurationMs: 3000
  });

  assert.equal(queue.length, 2);
  assert.equal(queue[0].effectiveDurationMs, 3000);
  assert.equal(queue[1].effectiveDurationMs, 1500);
});

test("dismissSystemMessage removes target item", () => {
  const next = dismissSystemMessage(
    [
      { id: "a", message: "one" },
      { id: "b", message: "two" }
    ],
    "a"
  );

  assert.deepEqual(next, [{ id: "b", message: "two" }]);
});

test("resolveI18nText supports function and object adapters", () => {
  const fromFunction = resolveI18nText({
    i18n: (key) => (key === "x" ? "X" : ""),
    key: "x",
    fallback: "fallback"
  });
  const fromObject = resolveI18nText({
    i18n: {
      translate({ key }) {
        return key === "y" ? "Y" : "";
      }
    },
    key: "y",
    fallback: "fallback"
  });

  assert.equal(fromFunction, "X");
  assert.equal(fromObject, "Y");
});

test("resolveI18nText falls back when adapter throws", () => {
  const diagnostics = [];
  const text = resolveI18nText({
    i18n() {
      throw new Error("i18n crashed");
    },
    key: "z",
    fallback: "[[z]]",
    onDiagnostic(event) {
      diagnostics.push(event);
    }
  });

  assert.equal(text, "[[z]]");
  assert.equal(diagnostics[0].code, "SYSTEM_UX_I18N_ADAPTER_ERROR");
});

test("resolveConfigValue supports function get and object source", () => {
  const fromFunction = resolveConfigValue({
    configSource(key) {
      return key === "a.b" ? 11 : undefined;
    },
    key: "a.b",
    defaultValue: 1
  });
  const fromGet = resolveConfigValue({
    configSource: {
      get(key) {
        return key === "x.y" ? 22 : undefined;
      }
    },
    key: "x.y",
    defaultValue: 1
  });
  const fromObject = resolveConfigValue({
    configSource: { c: { d: 33 } },
    key: "c.d",
    defaultValue: 1
  });

  assert.equal(fromFunction, 11);
  assert.equal(fromGet, 22);
  assert.equal(fromObject, 33);
});

test("resolveConfigValue falls back when source or parser throws", () => {
  const diagnostics = [];
  const fromSourceError = resolveConfigValue({
    configSource() {
      throw new Error("source error");
    },
    key: "a",
    defaultValue: 7,
    onDiagnostic(event) {
      diagnostics.push(event);
    }
  });
  const fromParserError = resolveConfigValue({
    configSource: { a: 3 },
    key: "a",
    defaultValue: 8,
    parser() {
      throw new Error("parser error");
    },
    onDiagnostic(event) {
      diagnostics.push(event);
    }
  });

  assert.equal(fromSourceError, 7);
  assert.equal(fromParserError, 8);
  assert.ok(diagnostics.some((item) => item.code === "SYSTEM_UX_CONFIG_SOURCE_ERROR"));
  assert.ok(diagnostics.some((item) => item.code === "SYSTEM_UX_CONFIG_PARSER_ERROR"));
});

test("P0 base interactive metadata is complete", () => {
  assert.equal(P0_BASE_INTERACTIVE_COMPONENTS.length, 11);
  assert.deepEqual(
    P0_BASE_INTERACTIVE_COMPONENTS.map((item) => item.scope),
    [
      "button",
      "input",
      "checkbox",
      "radio",
      "switch",
      "select",
      "dialog",
      "popover",
      "tabs",
      "menu",
      "tooltip"
    ]
  );
});

test("all base interactive component exports exist", () => {
  for (const component of [
    ChipsButton,
    ChipsInput,
    ChipsCheckbox,
    ChipsRadioGroup,
    ChipsSwitch,
    ChipsSelect,
    ChipsDialog,
    ChipsPopover,
    ChipsTabs,
    ChipsMenu,
    ChipsTooltip
  ]) {
    assert.equal(typeof component, "object");
    assert.equal(typeof component.render, "function");
  }
});

test("all stage-seven data-form component exports exist", () => {
  for (const component of [ChipsFormField, ChipsFormGroup, ChipsVirtualList]) {
    assert.equal(typeof component, "object");
    assert.equal(typeof component.render, "function");
  }
});

test("all stage-seven advanced data component exports exist", () => {
  for (const component of [ChipsDataGrid, ChipsTree, ChipsDateTime, ChipsCommandPalette]) {
    assert.equal(typeof component, "object");
    assert.equal(typeof component.render, "function");
  }
});

test("all stage-seven workbench component exports exist", () => {
  for (const component of [
    ChipsSplitPane,
    ChipsDockPanel,
    ChipsInspector,
    ChipsPanelHeader,
    ChipsCardShell,
    ChipsToolWindow
  ]) {
    assert.equal(typeof component, "object");
    assert.equal(typeof component.render, "function");
  }
});

test("all stage-eight system ux component exports exist", () => {
  for (const component of [
    ChipsErrorBoundary,
    ChipsLoadingBoundary,
    ChipsNotification,
    ChipsToast,
    ChipsEmptyState,
    ChipsSkeleton
  ]) {
    assert.equal(typeof component, "object");
    assert.equal(typeof component.render, "function");
  }
});

test("buildComponentContract includes stage-six third batch components", () => {
  const dialog = buildComponentContract("dialog");
  const popover = buildComponentContract("popover");
  const tabs = buildComponentContract("tabs");
  const menu = buildComponentContract("menu");
  const tooltip = buildComponentContract("tooltip");

  assert.ok(dialog.tokens.includes("chips.comp.dialog.content.surface"));
  assert.ok(popover.tokens.includes("chips.comp.popover.content.border"));
  assert.ok(tabs.tokens.includes("chips.comp.tabs.panel.surface"));
  assert.ok(menu.tokens.includes("chips.comp.menu.item.surface.active"));
  assert.ok(tooltip.tokens.includes("chips.comp.tooltip.content.text.color"));
});

test("buildComponentContract includes stage-seven first batch components", () => {
  const formField = buildComponentContract("form-field");
  const formGroup = buildComponentContract("form-group");
  const virtualList = buildComponentContract("virtual-list");

  assert.ok(formField.tokens.includes("chips.comp.form-field.control.border.error"));
  assert.ok(formGroup.tokens.includes("chips.comp.form-group.root.gap"));
  assert.ok(virtualList.tokens.includes("chips.comp.virtual-list.item.surface.active"));
});

test("buildComponentContract includes stage-seven second batch components", () => {
  const dataGrid = buildComponentContract("data-grid");
  const tree = buildComponentContract("tree");
  const dateTime = buildComponentContract("date-time");
  const commandPalette = buildComponentContract("command-palette");

  assert.ok(dataGrid.tokens.includes("chips.comp.data-grid.row.surface.selected"));
  assert.ok(tree.tokens.includes("chips.comp.tree.node.surface.selected"));
  assert.ok(dateTime.tokens.includes("chips.comp.date-time.input.border.error"));
  assert.ok(commandPalette.tokens.includes("chips.comp.command-palette.result.surface.active"));
});

test("buildComponentContract includes stage-seven workbench components", () => {
  const splitPane = buildComponentContract("split-pane");
  const dockPanel = buildComponentContract("dock-panel");
  const inspector = buildComponentContract("inspector");
  const panelHeader = buildComponentContract("panel-header");
  const cardShell = buildComponentContract("card-shell");
  const toolWindow = buildComponentContract("tool-window");

  assert.ok(splitPane.tokens.includes("chips.comp.split-pane.handle.surface.active"));
  assert.ok(dockPanel.tokens.includes("chips.comp.dock-panel.tab.surface.active"));
  assert.ok(inspector.tokens.includes("chips.comp.inspector.section.header.surface.active"));
  assert.ok(panelHeader.tokens.includes("chips.comp.panel-header.action.surface.active"));
  assert.ok(cardShell.tokens.includes("chips.comp.card-shell.border.color"));
  assert.ok(toolWindow.tokens.includes("chips.comp.tool-window.control.surface.active"));
});

test("buildComponentContract includes stage-eight system ux components", () => {
  const errorBoundary = buildComponentContract("error-boundary");
  const loadingBoundary = buildComponentContract("loading-boundary");
  const notification = buildComponentContract("notification");
  const toast = buildComponentContract("toast");
  const emptyState = buildComponentContract("empty-state");
  const skeleton = buildComponentContract("skeleton");

  assert.ok(errorBoundary.tokens.includes("chips.comp.error-boundary.root.border.error"));
  assert.ok(loadingBoundary.tokens.includes("chips.comp.loading-boundary.status.color.info"));
  assert.ok(notification.tokens.includes("chips.comp.notification.action.surface.active"));
  assert.ok(toast.tokens.includes("chips.comp.toast.close.color"));
  assert.ok(emptyState.tokens.includes("chips.comp.empty-state.description.color"));
  assert.ok(skeleton.tokens.includes("chips.comp.skeleton.item.surface.active"));
});

test("getNextEnabledIndex navigates and skips disabled options", () => {
  const items = [
    { value: "a", disabled: false },
    { value: "b", disabled: true },
    { value: "c", disabled: false }
  ];

  assert.equal(getNextEnabledIndex(items, 0, "next", true), 2);
  assert.equal(getNextEnabledIndex(items, 2, "next", true), 0);
  assert.equal(getNextEnabledIndex(items, 2, "prev", true), 0);
  assert.equal(getNextEnabledIndex(items, 0, "prev", false), -1);
});

test("computeVirtualWindow resolves visible range and paddings", () => {
  const windowed = computeVirtualWindow({
    itemCount: 100,
    itemHeight: 20,
    viewportHeight: 100,
    scrollTop: 200,
    overscan: 2
  });

  assert.equal(windowed.start, 8);
  assert.equal(windowed.end, 16);
  assert.equal(windowed.paddingStart, 160);
  assert.equal(windowed.paddingEnd, 1660);
});

test("computeVirtualWindow handles empty list", () => {
  const windowed = computeVirtualWindow({
    itemCount: 0,
    itemHeight: 20,
    viewportHeight: 100,
    scrollTop: 200,
    overscan: 2
  });

  assert.deepEqual(windowed, {
    start: 0,
    end: -1,
    paddingStart: 0,
    paddingEnd: 0
  });
});

test("P0 data-form metadata is complete", () => {
  assert.equal(P0_DATA_FORM_COMPONENTS.length, 3);
  assert.deepEqual(
    P0_DATA_FORM_COMPONENTS.map((item) => item.scope),
    ["form-field", "form-group", "virtual-list"]
  );
});

test("stage-seven advanced data metadata is complete", () => {
  assert.equal(STAGE7_DATA_ADVANCED_COMPONENTS.length, 4);
  assert.deepEqual(
    STAGE7_DATA_ADVANCED_COMPONENTS.map((item) => item.scope),
    ["data-grid", "tree", "date-time", "command-palette"]
  );
});

test("applyDataGridSort sorts by key and direction", () => {
  const rows = [
    { id: "a", order: 3 },
    { id: "b", order: 1 },
    { id: "c", order: 2 }
  ];

  const asc = applyDataGridSort(rows, { key: "order", direction: "asc" });
  const desc = applyDataGridSort(rows, { key: "order", direction: "desc" });

  assert.deepEqual(
    asc.map((item) => item.id),
    ["b", "c", "a"]
  );
  assert.deepEqual(
    desc.map((item) => item.id),
    ["a", "c", "b"]
  );
});

test("flattenTreeNodes and findTreeParentId return consistent structure", () => {
  const nodes = [
    {
      id: "root",
      label: "Root",
      children: [
        { id: "child-a", label: "Child A" },
        { id: "child-b", label: "Child B" }
      ]
    }
  ];

  const flatClosed = flattenTreeNodes(nodes, []);
  const flatOpen = flattenTreeNodes(nodes, ["root"]);

  assert.equal(flatClosed.length, 1);
  assert.equal(flatOpen.length, 3);
  assert.equal(findTreeParentId(nodes, "child-b"), "root");
  assert.equal(findTreeParentId(nodes, "root"), null);
});

test("filterCommandPaletteItems filters by label and shortcut", () => {
  const items = [
    { id: "1", label: "Open Card", shortcut: "Cmd+O", keywords: ["file"] },
    { id: "2", label: "Save Card", shortcut: "Cmd+S", keywords: ["file"] }
  ];

  const byLabel = filterCommandPaletteItems(items, "open");
  const byShortcut = filterCommandPaletteItems(items, "cmd+s");

  assert.equal(byLabel.length, 1);
  assert.equal(byLabel[0].id, "1");
  assert.equal(byShortcut.length, 1);
  assert.equal(byShortcut[0].id, "2");
});

test("clampSplitRatio returns ratio in defined range", () => {
  assert.equal(clampSplitRatio(-1), 0.1);
  assert.equal(clampSplitRatio(2), 0.9);
  assert.equal(clampSplitRatio(0.45), 0.45);
});

test("resolveDockPanelStateMap normalizes known panel states", () => {
  const map = resolveDockPanelStateMap(
    [{ id: "a" }, { id: "b" }],
    { a: "hidden", b: "x", c: "active" }
  );

  assert.deepEqual(map, {
    a: "hidden",
    b: "active"
  });
});

test("toggleInspectorSection toggles open state list", () => {
  assert.deepEqual(toggleInspectorSection(["a", "b"], "b"), ["a"]);
  assert.deepEqual(toggleInspectorSection(["a"], "c"), ["a", "c"]);
});

test("stage-seven workbench metadata is complete", () => {
  assert.equal(STAGE7_WORKBENCH_COMPONENTS.length, 6);
  assert.deepEqual(
    STAGE7_WORKBENCH_COMPONENTS.map((item) => item.scope),
    ["split-pane", "dock-panel", "inspector", "panel-header", "card-shell", "tool-window"]
  );
});

test("stage-eight system ux metadata is complete", () => {
  assert.equal(STAGE8_SYSTEM_UX_COMPONENTS.length, 6);
  assert.deepEqual(
    STAGE8_SYSTEM_UX_COMPONENTS.map((item) => item.scope),
    ["error-boundary", "loading-boundary", "notification", "toast", "empty-state", "skeleton"]
  );
});
