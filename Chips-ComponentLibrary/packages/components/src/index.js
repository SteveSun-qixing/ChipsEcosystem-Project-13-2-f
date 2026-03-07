import React from "react";
import { createScopeAttributes } from "@chips/primitives";
import {
  assertAriaProps,
  createAriaStatusProps,
  isKeyboardActivationKey
} from "@chips/a11y";

const INTERACTIVE_STATE_PRIORITY = [
  "disabled",
  "loading",
  "error",
  "active",
  "focus",
  "hover",
  "idle"
];

const INITIAL_INTERACTION_STATE = {
  hovered: false,
  focused: false,
  active: false
};

function createGlyphIcon(pathDefinition, options = {}) {
  const {
    viewBox = "0 0 16 16",
    strokeWidth = "1.5",
    strokeLinecap = "round",
    strokeLinejoin = "round"
  } = options;
  return React.createElement(
    "svg",
    {
      width: "12",
      height: "12",
      viewBox,
      fill: "none",
      "aria-hidden": "true",
      focusable: "false"
    },
    React.createElement("path", {
      d: pathDefinition,
      stroke: "currentColor",
      strokeWidth,
      strokeLinecap,
      strokeLinejoin
    })
  );
}

function getDefaultIconContent(type) {
  if (type === "chevron-down") {
    return createGlyphIcon("M4 6L8 10L12 6");
  }

  if (type === "close") {
    return createGlyphIcon("M4 4L12 12M12 4L4 12");
  }

  if (type === "expand") {
    return createGlyphIcon("M8 4V12M4 8H12");
  }

  if (type === "collapse") {
    return createGlyphIcon("M4 8H12");
  }

  if (type === "calendar") {
    return createGlyphIcon(
      "M5 2.5V4.5M11 2.5V4.5M3.5 6H12.5M4 4.5H12C12.6 4.5 13 4.9 13 5.5V12C13 12.6 12.6 13 12 13H4C3.4 13 3 12.6 3 12V5.5C3 4.9 3.4 4.5 4 4.5",
      {
      viewBox: "0 0 16 16",
      strokeWidth: "1.4"
      }
    );
  }

  return null;
}

function resolveIconContent(content, fallbackType) {
  if (content === undefined) {
    return getDefaultIconContent(fallbackType);
  }
  return content;
}

export const InteractiveEventType = {
  POINTER_ENTER: "pointer-enter",
  POINTER_LEAVE: "pointer-leave",
  FOCUS: "focus",
  BLUR: "blur",
  PRESS_START: "press-start",
  PRESS_END: "press-end"
};

export const COMPONENT_TOKEN_MAP = {
  button: [
    "chips.comp.button.root.radius",
    "chips.comp.button.root.surface.idle",
    "chips.comp.button.root.surface.hover",
    "chips.comp.button.root.surface.active",
    "chips.comp.button.root.surface.disabled",
    "chips.comp.button.label.color.idle",
    "chips.comp.button.label.color.disabled",
    "chips.comp.button.focus.outline"
  ],
  input: [
    "chips.comp.input.root.radius",
    "chips.comp.input.root.surface.idle",
    "chips.comp.input.root.surface.focus",
    "chips.comp.input.root.border.idle",
    "chips.comp.input.root.border.error",
    "chips.comp.input.value.color",
    "chips.comp.input.placeholder.color"
  ],
  checkbox: [
    "chips.comp.checkbox.control.radius",
    "chips.comp.checkbox.control.surface.unchecked",
    "chips.comp.checkbox.control.surface.checked",
    "chips.comp.checkbox.control.surface.disabled",
    "chips.comp.checkbox.indicator.color.checked",
    "chips.comp.checkbox.label.color"
  ],
  radio: [
    "chips.comp.radio.control.radius",
    "chips.comp.radio.control.surface.unchecked",
    "chips.comp.radio.control.surface.checked",
    "chips.comp.radio.control.surface.disabled",
    "chips.comp.radio.indicator.color.checked",
    "chips.comp.radio.label.color"
  ],
  switch: [
    "chips.comp.switch.track.radius",
    "chips.comp.switch.track.surface.off",
    "chips.comp.switch.track.surface.on",
    "chips.comp.switch.track.surface.disabled",
    "chips.comp.switch.thumb.surface",
    "chips.comp.switch.label.color"
  ],
  select: [
    "chips.comp.select.trigger.radius",
    "chips.comp.select.trigger.surface.idle",
    "chips.comp.select.trigger.surface.focus",
    "chips.comp.select.trigger.border.idle",
    "chips.comp.select.option.surface.selected",
    "chips.comp.select.option.text.color"
  ],
  dialog: [
    "chips.comp.dialog.backdrop.surface",
    "chips.comp.dialog.content.radius",
    "chips.comp.dialog.content.surface",
    "chips.comp.dialog.title.color",
    "chips.comp.dialog.close.color",
    "chips.comp.dialog.focus.outline"
  ],
  popover: [
    "chips.comp.popover.trigger.surface.idle",
    "chips.comp.popover.content.radius",
    "chips.comp.popover.content.surface",
    "chips.comp.popover.content.border",
    "chips.comp.popover.arrow.surface",
    "chips.comp.popover.focus.outline"
  ],
  tabs: [
    "chips.comp.tabs.list.border",
    "chips.comp.tabs.trigger.surface.idle",
    "chips.comp.tabs.trigger.surface.active",
    "chips.comp.tabs.trigger.text.color",
    "chips.comp.tabs.panel.surface",
    "chips.comp.tabs.focus.outline"
  ],
  menu: [
    "chips.comp.menu.content.radius",
    "chips.comp.menu.content.surface",
    "chips.comp.menu.item.surface.hover",
    "chips.comp.menu.item.surface.active",
    "chips.comp.menu.item.text.color",
    "chips.comp.menu.focus.outline"
  ],
  tooltip: [
    "chips.comp.tooltip.content.radius",
    "chips.comp.tooltip.content.surface",
    "chips.comp.tooltip.content.text.color",
    "chips.comp.tooltip.arrow.surface",
    "chips.comp.tooltip.focus.outline"
  ],
  "form-field": [
    "chips.comp.form-field.label.color",
    "chips.comp.form-field.control.surface.idle",
    "chips.comp.form-field.control.border.idle",
    "chips.comp.form-field.control.border.error",
    "chips.comp.form-field.helper.color",
    "chips.comp.form-field.error.color",
    "chips.comp.form-field.focus.outline"
  ],
  "form-group": [
    "chips.comp.form-group.root.gap",
    "chips.comp.form-group.legend.color",
    "chips.comp.form-group.description.color",
    "chips.comp.form-group.divider.color",
    "chips.comp.form-group.status.color.error"
  ],
  "virtual-list": [
    "chips.comp.virtual-list.container.surface",
    "chips.comp.virtual-list.item.surface.idle",
    "chips.comp.virtual-list.item.surface.active",
    "chips.comp.virtual-list.item.text.color",
    "chips.comp.virtual-list.scrollbar.thumb",
    "chips.comp.virtual-list.focus.outline"
  ],
  "data-grid": [
    "chips.comp.data-grid.root.surface",
    "chips.comp.data-grid.header.surface",
    "chips.comp.data-grid.header.text.color",
    "chips.comp.data-grid.row.surface.idle",
    "chips.comp.data-grid.row.surface.selected",
    "chips.comp.data-grid.cell.text.color",
    "chips.comp.data-grid.border.color",
    "chips.comp.data-grid.focus.outline"
  ],
  tree: [
    "chips.comp.tree.root.surface",
    "chips.comp.tree.node.surface.idle",
    "chips.comp.tree.node.surface.selected",
    "chips.comp.tree.node.text.color",
    "chips.comp.tree.toggle.color",
    "chips.comp.tree.guide.color",
    "chips.comp.tree.focus.outline"
  ],
  "date-time": [
    "chips.comp.date-time.input.surface.idle",
    "chips.comp.date-time.input.border.idle",
    "chips.comp.date-time.input.border.error",
    "chips.comp.date-time.input.text.color",
    "chips.comp.date-time.icon.color",
    "chips.comp.date-time.focus.outline"
  ],
  "command-palette": [
    "chips.comp.command-palette.root.surface",
    "chips.comp.command-palette.search.surface.idle",
    "chips.comp.command-palette.search.border.idle",
    "chips.comp.command-palette.result.surface.active",
    "chips.comp.command-palette.result.text.color",
    "chips.comp.command-palette.shortcut.color",
    "chips.comp.command-palette.focus.outline"
  ],
  "split-pane": [
    "chips.comp.split-pane.root.surface",
    "chips.comp.split-pane.pane.surface",
    "chips.comp.split-pane.handle.surface.idle",
    "chips.comp.split-pane.handle.surface.active",
    "chips.comp.split-pane.handle.border.color",
    "chips.comp.split-pane.focus.outline"
  ],
  "dock-panel": [
    "chips.comp.dock-panel.root.surface",
    "chips.comp.dock-panel.tab.surface.idle",
    "chips.comp.dock-panel.tab.surface.active",
    "chips.comp.dock-panel.tab.text.color",
    "chips.comp.dock-panel.content.surface",
    "chips.comp.dock-panel.status.color.error",
    "chips.comp.dock-panel.focus.outline"
  ],
  inspector: [
    "chips.comp.inspector.root.surface",
    "chips.comp.inspector.section.header.surface.idle",
    "chips.comp.inspector.section.header.surface.active",
    "chips.comp.inspector.section.header.text.color",
    "chips.comp.inspector.section.body.surface",
    "chips.comp.inspector.focus.outline"
  ],
  "panel-header": [
    "chips.comp.panel-header.root.surface",
    "chips.comp.panel-header.title.color",
    "chips.comp.panel-header.subtitle.color",
    "chips.comp.panel-header.action.surface.idle",
    "chips.comp.panel-header.action.surface.active",
    "chips.comp.panel-header.focus.outline"
  ],
  "card-shell": [
    "chips.comp.card-shell.root.surface",
    "chips.comp.card-shell.header.surface",
    "chips.comp.card-shell.content.surface",
    "chips.comp.card-shell.footer.surface",
    "chips.comp.card-shell.border.color",
    "chips.comp.card-shell.focus.outline"
  ],
  "tool-window": [
    "chips.comp.tool-window.root.surface",
    "chips.comp.tool-window.header.surface",
    "chips.comp.tool-window.body.surface",
    "chips.comp.tool-window.control.surface.idle",
    "chips.comp.tool-window.control.surface.active",
    "chips.comp.tool-window.status.color.error",
    "chips.comp.tool-window.focus.outline"
  ],
  "error-boundary": [
    "chips.comp.error-boundary.root.surface",
    "chips.comp.error-boundary.root.border.error",
    "chips.comp.error-boundary.title.color",
    "chips.comp.error-boundary.description.color",
    "chips.comp.error-boundary.action.surface.idle",
    "chips.comp.error-boundary.action.surface.active",
    "chips.comp.error-boundary.status.color.error",
    "chips.comp.error-boundary.focus.outline"
  ],
  "loading-boundary": [
    "chips.comp.loading-boundary.root.surface",
    "chips.comp.loading-boundary.fallback.surface",
    "chips.comp.loading-boundary.skeleton.surface.idle",
    "chips.comp.loading-boundary.skeleton.surface.active",
    "chips.comp.loading-boundary.status.color.info",
    "chips.comp.loading-boundary.focus.outline"
  ],
  notification: [
    "chips.comp.notification.root.surface",
    "chips.comp.notification.item.surface.idle",
    "chips.comp.notification.item.surface.active",
    "chips.comp.notification.title.color",
    "chips.comp.notification.message.color",
    "chips.comp.notification.action.surface.active",
    "chips.comp.notification.close.color",
    "chips.comp.notification.focus.outline"
  ],
  toast: [
    "chips.comp.toast.root.surface",
    "chips.comp.toast.item.surface.idle",
    "chips.comp.toast.item.surface.active",
    "chips.comp.toast.message.color",
    "chips.comp.toast.action.surface.active",
    "chips.comp.toast.close.color",
    "chips.comp.toast.focus.outline"
  ],
  "empty-state": [
    "chips.comp.empty-state.root.surface",
    "chips.comp.empty-state.icon.color",
    "chips.comp.empty-state.title.color",
    "chips.comp.empty-state.description.color",
    "chips.comp.empty-state.action.surface.active",
    "chips.comp.empty-state.focus.outline"
  ],
  skeleton: [
    "chips.comp.skeleton.root.surface",
    "chips.comp.skeleton.item.surface.idle",
    "chips.comp.skeleton.item.surface.active",
    "chips.comp.skeleton.status.color.info",
    "chips.comp.skeleton.focus.outline"
  ]
};

export function createComponentMeta({ name, scope, parts, states }) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("COMPONENT_META_INVALID:name");
  }

  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("COMPONENT_META_INVALID:parts");
  }

  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("COMPONENT_META_INVALID:states");
  }

  return {
    name,
    scope,
    parts,
    states
  };
}

export function buildComponentContract(component) {
  if (typeof component !== "string" || component.length === 0) {
    throw new Error("COMPONENT_CONTRACT_INVALID:component");
  }

  if (!Object.hasOwn(COMPONENT_TOKEN_MAP, component)) {
    throw new Error(`COMPONENT_CONTRACT_TOKEN_MAP_MISSING:${component}`);
  }

  const contractMap = {
    button: {
      component: "button",
      scope: "button",
      parts: ["root", "label", "spinner", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    input: {
      component: "input",
      scope: "input",
      parts: ["root", "control", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    checkbox: {
      component: "checkbox",
      scope: "checkbox",
      parts: ["root", "control", "indicator", "label", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    radio: {
      component: "radio",
      scope: "radio",
      parts: ["root", "item", "control", "indicator", "label", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    switch: {
      component: "switch",
      scope: "switch",
      parts: ["root", "track", "thumb", "label", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    select: {
      component: "select",
      scope: "select",
      parts: ["root", "trigger", "value", "icon", "list", "option", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    dialog: {
      component: "dialog",
      scope: "dialog",
      parts: [
        "root",
        "trigger",
        "backdrop",
        "content",
        "title",
        "description",
        "close",
        "status"
      ],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    popover: {
      component: "popover",
      scope: "popover",
      parts: ["root", "trigger", "positioner", "content", "arrow", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    tabs: {
      component: "tabs",
      scope: "tabs",
      parts: ["root", "list", "trigger", "panel", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    menu: {
      component: "menu",
      scope: "menu",
      parts: ["root", "trigger", "content", "item", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    tooltip: {
      component: "tooltip",
      scope: "tooltip",
      parts: ["root", "trigger", "content", "arrow", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "form-field": {
      component: "form-field",
      scope: "form-field",
      parts: ["root", "label", "control", "helper", "error", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "form-group": {
      component: "form-group",
      scope: "form-group",
      parts: ["root", "legend", "description", "content", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "virtual-list": {
      component: "virtual-list",
      scope: "virtual-list",
      parts: ["root", "viewport", "content", "item", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "data-grid": {
      component: "data-grid",
      scope: "data-grid",
      parts: ["root", "table", "header", "row", "cell", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    tree: {
      component: "tree",
      scope: "tree",
      parts: ["root", "node", "toggle", "label", "children", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "date-time": {
      component: "date-time",
      scope: "date-time",
      parts: ["root", "input", "icon", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "command-palette": {
      component: "command-palette",
      scope: "command-palette",
      parts: ["root", "trigger", "search", "list", "item", "shortcut", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "split-pane": {
      component: "split-pane",
      scope: "split-pane",
      parts: ["root", "pane-start", "resizer", "pane-end", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "dock-panel": {
      component: "dock-panel",
      scope: "dock-panel",
      parts: ["root", "tab-list", "tab", "content", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    inspector: {
      component: "inspector",
      scope: "inspector",
      parts: ["root", "section", "header", "body", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "panel-header": {
      component: "panel-header",
      scope: "panel-header",
      parts: ["root", "title", "subtitle", "actions", "toggle", "close", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "card-shell": {
      component: "card-shell",
      scope: "card-shell",
      parts: ["root", "header", "toolbar", "content", "footer", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "tool-window": {
      component: "tool-window",
      scope: "tool-window",
      parts: ["root", "header", "controls", "body", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "error-boundary": {
      component: "error-boundary",
      scope: "error-boundary",
      parts: ["root", "title", "description", "action", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "loading-boundary": {
      component: "loading-boundary",
      scope: "loading-boundary",
      parts: ["root", "content", "fallback", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    notification: {
      component: "notification",
      scope: "notification",
      parts: ["root", "list", "item", "title", "message", "action", "close", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    toast: {
      component: "toast",
      scope: "toast",
      parts: ["root", "list", "item", "message", "action", "close", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    "empty-state": {
      component: "empty-state",
      scope: "empty-state",
      parts: ["root", "icon", "title", "description", "action", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    },
    skeleton: {
      component: "skeleton",
      scope: "skeleton",
      parts: ["root", "item", "status"],
      states: [...INTERACTIVE_STATE_PRIORITY]
    }
  };

  if (!Object.hasOwn(contractMap, component)) {
    throw new Error(`COMPONENT_CONTRACT_DEFINITION_MISSING:${component}`);
  }

  return {
    ...contractMap[component],
    tokens: COMPONENT_TOKEN_MAP[component]
  };
}

export function resolveInteractiveState(params) {
  if (params.disabled) {
    return "disabled";
  }

  if (params.loading) {
    return "loading";
  }

  if (params.error) {
    return "error";
  }

  if (params.interaction && params.interaction.active) {
    return "active";
  }

  if (params.interaction && params.interaction.focused) {
    return "focus";
  }

  if (params.interaction && params.interaction.hovered) {
    return "hover";
  }

  return "idle";
}

export function interactiveStateReducer(state, event) {
  if (!event || typeof event.type !== "string") {
    return state;
  }

  if (event.type === InteractiveEventType.POINTER_ENTER) {
    return { ...state, hovered: true };
  }

  if (event.type === InteractiveEventType.POINTER_LEAVE) {
    return { ...state, hovered: false, active: false };
  }

  if (event.type === InteractiveEventType.FOCUS) {
    return { ...state, focused: true };
  }

  if (event.type === InteractiveEventType.BLUR) {
    return { ...state, focused: false, active: false };
  }

  if (event.type === InteractiveEventType.PRESS_START) {
    return { ...state, active: true };
  }

  if (event.type === InteractiveEventType.PRESS_END) {
    return { ...state, active: false };
  }

  return state;
}

function createInteractionHandlers(dispatch, disabled) {
  const safeDispatch = (type) => {
    if (disabled) {
      return;
    }
    dispatch({ type });
  };

  return {
    onPointerEnter: () => safeDispatch(InteractiveEventType.POINTER_ENTER),
    onPointerLeave: () => safeDispatch(InteractiveEventType.POINTER_LEAVE),
    onFocus: () => safeDispatch(InteractiveEventType.FOCUS),
    onBlur: () => safeDispatch(InteractiveEventType.BLUR),
    onMouseDown: () => safeDispatch(InteractiveEventType.PRESS_START),
    onMouseUp: () => safeDispatch(InteractiveEventType.PRESS_END)
  };
}

function useInteractiveState(disabled) {
  const [interaction, dispatch] = React.useReducer(
    interactiveStateReducer,
    INITIAL_INTERACTION_STATE
  );

  React.useEffect(() => {
    if (disabled) {
      dispatch({ type: InteractiveEventType.POINTER_LEAVE });
      dispatch({ type: InteractiveEventType.BLUR });
      dispatch({ type: InteractiveEventType.PRESS_END });
    }
  }, [disabled]);

  const handlers = React.useMemo(
    () => createInteractionHandlers(dispatch, disabled),
    [disabled]
  );

  return {
    interaction,
    handlers
  };
}

function useControllableState({ value, defaultValue, onChange }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  const setValue = React.useCallback(
    (nextValue) => {
      if (!controlled) {
        setInternalValue(nextValue);
      }
      if (typeof onChange === "function") {
        onChange(nextValue);
      }
    },
    [controlled, onChange]
  );

  return [currentValue, setValue, controlled];
}

function mergeHandlers(...handlers) {
  return (event) => {
    for (const handler of handlers) {
      if (typeof handler === "function") {
        handler(event);
      }
    }
  };
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return {
      code: "COMPONENT_ERROR",
      message: error
    };
  }

  if (typeof error === "object" && typeof error.message === "string") {
    return {
      code: typeof error.code === "string" ? error.code : "COMPONENT_ERROR",
      message: error.message
    };
  }

  return {
    code: "COMPONENT_ERROR",
    message: "Unknown component error"
  };
}

export function toStandardError(error, fallbackCode = "COMPONENT_ERROR") {
  if (error && typeof error === "object") {
    const candidate = error;
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        message: candidate.message,
        details: candidate.details,
        retryable: candidate.retryable === true
      };
    }
  }

  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      details: { name: error.name },
      retryable: false
    };
  }

  if (typeof error === "string" && error.length > 0) {
    return {
      code: fallbackCode,
      message: error,
      details: null,
      retryable: false
    };
  }

  return {
    code: fallbackCode,
    message: "Unknown error",
    details: error,
    retryable: false
  };
}

function getNestedValueByPath(source, pathExpression) {
  if (!source || typeof source !== "object") {
    return undefined;
  }

  if (typeof pathExpression !== "string" || pathExpression.length === 0) {
    return undefined;
  }

  const segments = pathExpression.split(".");
  let current = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function resolveI18nTranslate(i18nAdapter, key, params) {
  if (!i18nAdapter) {
    return null;
  }

  try {
    if (typeof i18nAdapter === "function") {
      const result = i18nAdapter(key, params);
      return typeof result === "string" ? result : null;
    }

    if (typeof i18nAdapter.translate === "function") {
      const byObject = i18nAdapter.translate({ key, params });
      if (typeof byObject === "string") {
        return byObject;
      }
      const byArgs = i18nAdapter.translate(key, params);
      if (typeof byArgs === "string") {
        return byArgs;
      }
    }
  } catch (error) {
    return {
      __error: toStandardError(error, "SYSTEM_UX_I18N_ADAPTER_ERROR")
    };
  }

  return null;
}

export function resolveI18nText(params = {}) {
  const {
    i18n,
    key,
    params: i18nParams,
    fallback = "",
    onDiagnostic
  } = params;

  if (typeof key === "string" && key.length > 0) {
    const translated = resolveI18nTranslate(i18n, key, i18nParams);
    if (translated && typeof translated === "object" && translated.__error) {
      if (typeof onDiagnostic === "function") {
        onDiagnostic({
          code: "SYSTEM_UX_I18N_ADAPTER_ERROR",
          key,
          error: translated.__error
        });
      }
    } else if (typeof translated === "string" && translated.length > 0) {
      return translated;
    }

    if (typeof onDiagnostic === "function") {
      onDiagnostic({
        code: "SYSTEM_UX_I18N_KEY_FALLBACK",
        key,
        fallback
      });
    }
  }

  return typeof fallback === "string" ? fallback : "";
}

export function resolveConfigValue(params = {}) {
  const {
    configSource,
    key,
    defaultValue,
    parser,
    onDiagnostic
  } = params;

  let rawValue;

  try {
    if (configSource && typeof configSource === "function") {
      rawValue = configSource(key);
    } else if (configSource && typeof configSource.get === "function") {
      rawValue = configSource.get(key);
    } else {
      rawValue = getNestedValueByPath(configSource, key);
    }
  } catch (error) {
    if (typeof onDiagnostic === "function") {
      onDiagnostic({
        code: "SYSTEM_UX_CONFIG_SOURCE_ERROR",
        key,
        error: toStandardError(error, "SYSTEM_UX_CONFIG_SOURCE_ERROR")
      });
    }
    return defaultValue;
  }

  let parsed;
  try {
    parsed = typeof parser === "function" ? parser(rawValue) : rawValue;
  } catch (error) {
    if (typeof onDiagnostic === "function") {
      onDiagnostic({
        code: "SYSTEM_UX_CONFIG_PARSER_ERROR",
        key,
        error: toStandardError(error, "SYSTEM_UX_CONFIG_PARSER_ERROR")
      });
    }
    return defaultValue;
  }
  if (parsed !== undefined && parsed !== null) {
    return parsed;
  }

  if (typeof onDiagnostic === "function") {
    onDiagnostic({
      code: "SYSTEM_UX_CONFIG_FALLBACK",
      key,
      defaultValue
    });
  }

  return defaultValue;
}

export function createObservationRecord(params = {}) {
  const {
    traceId,
    component,
    action,
    error,
    durationMs
  } = params;

  const normalizedError = error ? toStandardError(error, "SYSTEM_UX_OBSERVE_ERROR") : null;

  return {
    traceId:
      typeof traceId === "string" && traceId.length > 0
        ? traceId
        : `trace-${Date.now()}`,
    component: typeof component === "string" && component.length > 0 ? component : "unknown-component",
    action: typeof action === "string" && action.length > 0 ? action : "unknown-action",
    errorCode: normalizedError ? normalizedError.code : null,
    durationMs: typeof durationMs === "number" && durationMs >= 0 ? durationMs : 0
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && (typeof item.value === "string" || typeof item.value === "number"))
    .map((item) => ({
      ...item,
      value: String(item.value),
      disabled: item.disabled === true
    }));
}

export function getNextEnabledIndex(items, startIndex, direction = "next", loop = true) {
  if (!Array.isArray(items) || items.length === 0) {
    return -1;
  }

  const step = direction === "prev" ? -1 : 1;
  let index = startIndex;

  for (let count = 0; count < items.length; count += 1) {
    index += step;

    if (loop) {
      if (index >= items.length) {
        index = 0;
      }
      if (index < 0) {
        index = items.length - 1;
      }
    } else if (index < 0 || index >= items.length) {
      return -1;
    }

    const candidate = items[index];
    if (candidate && candidate.disabled !== true) {
      return index;
    }
  }

  return -1;
}

function getFirstEnabledIndex(items) {
  return getNextEnabledIndex(items, -1, "next", true);
}

function normalizePositiveNumber(value, fallback) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    return fallback;
  }
  return value;
}

export function computeVirtualWindow(params) {
  const itemCount = Math.max(0, Number.isInteger(params.itemCount) ? params.itemCount : 0);
  const itemHeight = normalizePositiveNumber(params.itemHeight, 1);
  const viewportHeight = normalizePositiveNumber(params.viewportHeight, itemHeight);
  const scrollTop = Math.max(0, typeof params.scrollTop === "number" ? params.scrollTop : 0);
  const overscan = Math.max(0, Number.isInteger(params.overscan) ? params.overscan : 0);

  if (itemCount === 0) {
    return {
      start: 0,
      end: -1,
      paddingStart: 0,
      paddingEnd: 0
    };
  }

  const visibleCount = Math.max(1, Math.ceil(viewportHeight / itemHeight));
  const rawStart = Math.floor(scrollTop / itemHeight);
  const start = Math.max(0, rawStart - overscan);
  const end = Math.min(itemCount - 1, rawStart + visibleCount + overscan - 1);
  const paddingStart = start * itemHeight;
  const renderedCount = end >= start ? end - start + 1 : 0;
  const paddingEnd = Math.max(0, itemCount * itemHeight - paddingStart - renderedCount * itemHeight);

  return {
    start,
    end,
    paddingStart,
    paddingEnd
  };
}

function compareSortValues(a, b) {
  if (a === b) {
    return 0;
  }

  if (a === undefined || a === null) {
    return 1;
  }

  if (b === undefined || b === null) {
    return -1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

export function applyDataGridSort(rows, sort) {
  const normalizedRows = Array.isArray(rows) ? [...rows] : [];
  if (!sort || typeof sort.key !== "string" || sort.key.length === 0) {
    return normalizedRows;
  }

  const direction = sort.direction === "desc" ? "desc" : "asc";
  normalizedRows.sort((left, right) => {
    const result = compareSortValues(left?.[sort.key], right?.[sort.key]);
    return direction === "desc" ? result * -1 : result;
  });
  return normalizedRows;
}

export function flattenTreeNodes(nodes, expandedIds) {
  const list = [];
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const expandedSet = new Set(Array.isArray(expandedIds) ? expandedIds.map((id) => String(id)) : []);

  const walk = (source, depth, parentId) => {
    for (const item of source) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const id = String(item.id);
      const children = Array.isArray(item.children) ? item.children : [];
      const isExpanded = children.length > 0 && expandedSet.has(id);

      list.push({
        id,
        label: typeof item.label === "string" ? item.label : id,
        depth,
        parentId,
        disabled: item.disabled === true,
        hasChildren: children.length > 0,
        expanded: isExpanded,
        raw: item
      });

      if (isExpanded) {
        walk(children, depth + 1, id);
      }
    }
  };

  walk(normalizedNodes, 0, null);
  return list;
}

export function findTreeParentId(nodes, targetId) {
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const normalizedTargetId = String(targetId);

  const walk = (source, parentId) => {
    for (const item of source) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const id = String(item.id);
      if (id === normalizedTargetId) {
        return parentId;
      }

      if (Array.isArray(item.children) && item.children.length > 0) {
        const found = walk(item.children, id);
        if (found !== undefined) {
          return found;
        }
      }
    }
    return undefined;
  };

  return walk(normalizedNodes, null);
}

export function filterCommandPaletteItems(items, query) {
  const normalizedItems = Array.isArray(items) ? items : [];
  const trimmed = typeof query === "string" ? query.trim().toLowerCase() : "";

  if (trimmed.length === 0) {
    return normalizedItems;
  }

  return normalizedItems.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const label = typeof item.label === "string" ? item.label.toLowerCase() : "";
    const shortcut = typeof item.shortcut === "string" ? item.shortcut.toLowerCase() : "";
    const keywords = Array.isArray(item.keywords)
      ? item.keywords
          .filter((keyword) => typeof keyword === "string")
          .join(" ")
          .toLowerCase()
      : "";

    return label.includes(trimmed) || shortcut.includes(trimmed) || keywords.includes(trimmed);
  });
}

export function clampSplitRatio(value, minRatio = 0.1, maxRatio = 0.9) {
  const min = normalizePositiveNumber(minRatio, 0.1);
  const max = normalizePositiveNumber(maxRatio, 0.9);
  const fallback = Math.max(min, Math.min(max, 0.5));
  const source = typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  return Math.max(min, Math.min(max, source));
}

export function resolveDockPanelStateMap(panels, stateMap) {
  const map = {};
  const normalizedPanels = Array.isArray(panels) ? panels : [];
  const source = stateMap && typeof stateMap === "object" ? stateMap : {};

  for (const panel of normalizedPanels) {
    if (!panel || typeof panel.id !== "string") {
      continue;
    }

    const current = source[panel.id];
    if (current === "hidden" || current === "minimized" || current === "active") {
      map[panel.id] = current;
    } else {
      map[panel.id] = "active";
    }
  }

  return map;
}

export function toggleInspectorSection(sectionIds, targetId) {
  const current = new Set(Array.isArray(sectionIds) ? sectionIds.map((id) => String(id)) : []);
  const id = String(targetId);
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  return [...current];
}

export function normalizeSystemMessageItems(items, idPrefix = "message") {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const tone =
        item.tone === "error" || item.tone === "success" || item.tone === "warning"
          ? item.tone
          : "info";

      return {
        ...item,
        id:
          typeof item.id === "string" || typeof item.id === "number"
            ? String(item.id)
            : `${idPrefix}-${index}`,
        tone,
        durationMs:
          typeof item.durationMs === "number" && item.durationMs > 0
            ? item.durationMs
            : null
      };
    });
}

export function parsePositiveInteger(value) {
  if (!Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export function resolveSystemMessageQueue(params = {}) {
  const {
    items,
    idPrefix = "message",
    maxVisible = 3,
    defaultDurationMs = null
  } = params;

  const normalized = normalizeSystemMessageItems(items, idPrefix);
  const limit = parsePositiveInteger(maxVisible) || 3;
  const fallbackDuration = parsePositiveInteger(defaultDurationMs);

  return normalized.slice(0, limit).map((item) => ({
    ...item,
    effectiveDurationMs:
      typeof item.durationMs === "number" && item.durationMs > 0
        ? item.durationMs
        : fallbackDuration || null
  }));
}

export function dismissSystemMessage(items, targetId) {
  const normalizedTargetId = String(targetId);
  const normalizedItems = Array.isArray(items) ? items : [];
  return normalizedItems
    .filter((item) => item && String(item.id) !== normalizedTargetId)
    .map((item) => ({
      ...item
    }));
}

class ChipsErrorBoundaryKernel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidCatch(error, errorInfo) {
    if (typeof this.props.onCapturedError === "function") {
      this.props.onCapturedError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const ChipsButton = React.forwardRef((props, ref) => {
  const {
    children,
    type = "button",
    disabled = false,
    loading = false,
    error = null,
    toggleable = false,
    pressed,
    defaultPressed = false,
    onPress,
    onPressedChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [internalPressed, setInternalPressed] = React.useState(defaultPressed === true);
  const isPressed = toggleable ? (pressed !== undefined ? pressed : internalPressed) : false;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const handleClick = (event) => {
    if (disabledByState) {
      event.preventDefault();
      return;
    }

    if (toggleable) {
      const next = !isPressed;
      if (pressed === undefined) {
        setInternalPressed(next);
      }
      if (typeof onPressedChange === "function") {
        onPressedChange(next);
      }
    }

    if (typeof onPress === "function") {
      onPress(event);
    }
  };

  const handleKeyDown = (event) => {
    if (!disabledByState && isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      handleClick(event);
    }
  };

  return React.createElement(
    "button",
    {
      ...createScopeAttributes("button", "root", state),
      ...handlers,
      type,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined,
      "aria-busy": loading ? "true" : undefined,
      "aria-pressed": toggleable ? String(isPressed) : undefined,
      "data-pressed": toggleable ? String(isPressed) : undefined,
      disabled: disabledByState,
      onClick: mergeHandlers(handleClick),
      onKeyDown: mergeHandlers(handleKeyDown)
    },
    React.createElement(
      "span",
      createScopeAttributes("button", "label", state),
      children
    ),
    loading
      ? React.createElement("span", {
          ...createScopeAttributes("button", "spinner", state),
          "aria-hidden": "true"
        })
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("button", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsButton.displayName = "ChipsButton";

export const ChipsInput = React.forwardRef((props, ref) => {
  const {
    value,
    defaultValue,
    disabled = false,
    loading = false,
    error = null,
    readOnly = false,
    placeholder,
    onValueChange,
    onStateChange,
    onEnterPress
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const handleChange = (event) => {
    if (typeof onValueChange === "function") {
      onValueChange(event.target.value);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && typeof onEnterPress === "function") {
      onEnterPress(event.target.value);
    }
  };

  const inputProps = {
    ...createScopeAttributes("input", "control", state),
    ref,
    disabled: disabledByState,
    readOnly,
    placeholder,
    "aria-invalid": normalizedError ? "true" : undefined,
    "aria-disabled": disabledByState ? "true" : undefined,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onFocus: handlers.onFocus,
    onBlur: handlers.onBlur
  };

  if (value !== undefined) {
    inputProps.value = value;
  } else {
    inputProps.defaultValue = defaultValue;
  }

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("input", "root", state),
      ...handlers
    },
    React.createElement("input", inputProps),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("input", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsInput.displayName = "ChipsInput";

export const ChipsCheckbox = React.forwardRef((props, ref) => {
  const {
    checked,
    defaultChecked = false,
    disabled = false,
    loading = false,
    error = null,
    label,
    name,
    value,
    onCheckedChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const inputProps = {
    ...createScopeAttributes("checkbox", "control", state),
    ref,
    type: "checkbox",
    disabled: disabledByState,
    name,
    value,
    "aria-invalid": normalizedError ? "true" : undefined,
    onFocus: handlers.onFocus,
    onBlur: handlers.onBlur,
    onChange: (event) => {
      if (typeof onCheckedChange === "function") {
        onCheckedChange(event.target.checked);
      }
    }
  };

  if (checked !== undefined) {
    inputProps.checked = checked;
  } else {
    inputProps.defaultChecked = defaultChecked;
  }

  const currentChecked = checked !== undefined ? checked : defaultChecked;

  return React.createElement(
    "label",
    {
      ...createScopeAttributes("checkbox", "root", state),
      ...handlers,
      "data-checked": String(Boolean(currentChecked)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement("input", inputProps),
    React.createElement("span", {
      ...createScopeAttributes("checkbox", "indicator", state),
      "aria-hidden": "true"
    }),
    label
      ? React.createElement(
          "span",
          createScopeAttributes("checkbox", "label", state),
          label
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("checkbox", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsCheckbox.displayName = "ChipsCheckbox";

export const ChipsRadioGroup = React.forwardRef((props, ref) => {
  const {
    name,
    value,
    defaultValue = "",
    disabled = false,
    loading = false,
    error = null,
    options = [],
    onValueChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const handleValueChange = (nextValue) => {
    if (disabledByState) {
      return;
    }

    if (value === undefined) {
      setInternalValue(nextValue);
    }

    if (typeof onValueChange === "function") {
      onValueChange(nextValue);
    }
  };

  return React.createElement(
    "fieldset",
    {
      ...createScopeAttributes("radio", "root", state),
      ...handlers,
      ref,
      disabled: disabledByState,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    options.map((option, index) => {
      const optionValue = String(option.value);
      const optionDisabled = disabledByState || option.disabled === true;
      const optionChecked = currentValue === optionValue;

      return React.createElement(
        "label",
        {
          ...createScopeAttributes("radio", "item", state),
          key: `${optionValue}-${index}`,
          "data-checked": String(optionChecked),
          "aria-disabled": optionDisabled ? "true" : undefined
        },
        React.createElement("input", {
          ...createScopeAttributes("radio", "control", state),
          type: "radio",
          name,
          checked: optionChecked,
          disabled: optionDisabled,
          "aria-checked": String(optionChecked),
          onFocus: handlers.onFocus,
          onBlur: handlers.onBlur,
          onChange: () => handleValueChange(optionValue)
        }),
        React.createElement("span", {
          ...createScopeAttributes("radio", "indicator", state),
          "aria-hidden": "true"
        }),
        React.createElement(
          "span",
          createScopeAttributes("radio", "label", state),
          option.label
        )
      );
    }),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("radio", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsRadioGroup.displayName = "ChipsRadioGroup";

export const ChipsSwitch = React.forwardRef((props, ref) => {
  const {
    checked,
    defaultChecked = false,
    disabled = false,
    loading = false,
    error = null,
    label,
    onCheckedChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [internalChecked, setInternalChecked] = React.useState(defaultChecked === true);
  const currentChecked = checked !== undefined ? checked : internalChecked;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const toggle = (event) => {
    if (disabledByState) {
      event.preventDefault();
      return;
    }

    const next = !currentChecked;
    if (checked === undefined) {
      setInternalChecked(next);
    }

    if (typeof onCheckedChange === "function") {
      onCheckedChange(next);
    }
  };

  const handleKeyDown = (event) => {
    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      toggle(event);
    }
  };

  return React.createElement(
    "button",
    {
      ...createScopeAttributes("switch", "root", state),
      ...handlers,
      ref,
      type: "button",
      role: "switch",
      "aria-checked": String(currentChecked),
      "aria-disabled": disabledByState ? "true" : undefined,
      "aria-busy": loading ? "true" : undefined,
      "data-checked": String(currentChecked),
      disabled: disabledByState,
      onClick: toggle,
      onKeyDown: handleKeyDown
    },
    React.createElement(
      "span",
      {
        ...createScopeAttributes("switch", "track", state),
        "aria-hidden": "true"
      },
      React.createElement("span", {
        ...createScopeAttributes("switch", "thumb", state),
        "aria-hidden": "true"
      })
    ),
    label
      ? React.createElement(
          "span",
          createScopeAttributes("switch", "label", state),
          label
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("switch", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsSwitch.displayName = "ChipsSwitch";

export const ChipsSelect = React.forwardRef((props, ref) => {
  const {
    value,
    defaultValue = "",
    open,
    defaultOpen = false,
    disabled = false,
    loading = false,
    error = null,
    placeholder = "",
    iconContent,
    options = [],
    onValueChange,
    onOpenChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen === true);
  const currentValue = value !== undefined ? value : internalValue;
  const currentOpen = open !== undefined ? open : internalOpen;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const listId = React.useId();
  const selectedOption = options.find((item) => String(item.value) === String(currentValue));

  const updateOpen = (nextOpen) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    if (typeof onOpenChange === "function") {
      onOpenChange(nextOpen);
    }
  };

  const updateValue = (nextValue) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    if (typeof onValueChange === "function") {
      onValueChange(nextValue);
    }
  };

  const toggleOpen = (event) => {
    if (disabledByState) {
      event.preventDefault();
      return;
    }
    updateOpen(!currentOpen);
  };

  const handleTriggerKeyDown = (event) => {
    if (isKeyboardActivationKey(event.key) || event.key === "ArrowDown") {
      event.preventDefault();
      if (!currentOpen) {
        updateOpen(true);
      }
      return;
    }

    if (event.key === "Escape" && currentOpen) {
      event.preventDefault();
      updateOpen(false);
    }
  };

  const handleOptionSelect = (option, event) => {
    if (option.disabled || disabledByState) {
      event.preventDefault();
      return;
    }
    updateValue(option.value);
    updateOpen(false);
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("select", "root", state),
      ...handlers,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined,
      "data-open": String(currentOpen)
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("select", "trigger", state),
        type: "button",
        role: "button",
        disabled: disabledByState,
        "aria-disabled": disabledByState ? "true" : undefined,
        "aria-haspopup": "listbox",
        "aria-expanded": String(currentOpen),
        "aria-controls": listId,
        onClick: toggleOpen,
        onKeyDown: handleTriggerKeyDown
      },
      React.createElement(
        "span",
        createScopeAttributes("select", "value", state),
        selectedOption ? selectedOption.label : placeholder
      ),
      React.createElement(
        "span",
        {
          ...createScopeAttributes("select", "icon", state),
          "aria-hidden": "true"
        },
        resolveIconContent(iconContent, "chevron-down")
      )
    ),
    currentOpen
      ? React.createElement(
          "ul",
          {
            ...createScopeAttributes("select", "list", state),
            id: listId,
            role: "listbox"
          },
          options.map((option, index) => {
            const optionValue = String(option.value);
            const selected = String(currentValue) === optionValue;
            return React.createElement(
              "li",
              {
                ...createScopeAttributes("select", "option", state),
                key: `${optionValue}-${index}`,
                role: "option",
                "aria-selected": String(selected),
                "aria-disabled": option.disabled ? "true" : undefined,
                "data-selected": String(selected),
                onClick: (event) => handleOptionSelect(option, event)
              },
              option.label
            );
          })
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("select", "status", state),
            ...createAriaStatusProps({
              live: "assertive"
            })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsSelect.displayName = "ChipsSelect";

export const ChipsDialog = React.forwardRef((props, ref) => {
  const {
    open,
    defaultOpen = false,
    disabled = false,
    loading = false,
    error = null,
    title,
    description,
    children,
    triggerContent,
    closeButtonLabel,
    closeButtonContent,
    closeOnBackdrop = true,
    closeOnEscape = true,
    modal = true,
    onOpenChange,
    onStateChange,
    onCloseReason
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const contentId = React.useId();
  const titleId = title ? `${contentId}-title` : undefined;
  const descriptionId = description ? `${contentId}-description` : undefined;

  const closeDialog = (reason) => {
    if (disabledByState) {
      return;
    }
    setCurrentOpen(false);
    if (typeof onCloseReason === "function") {
      onCloseReason(reason);
    }
  };

  const openDialog = () => {
    if (disabledByState) {
      return;
    }
    setCurrentOpen(true);
  };

  const handleDialogKeyDown = (event) => {
    if (event.key === "Escape" && closeOnEscape) {
      event.preventDefault();
      closeDialog("escape-key");
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("dialog", "root", state),
      ...handlers,
      ref,
      "data-open": String(Boolean(currentOpen)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("dialog", "trigger", state),
        type: "button",
        disabled: disabledByState,
        role: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": String(Boolean(currentOpen)),
        "aria-controls": contentId,
        onClick: openDialog
      },
      triggerContent
    ),
    currentOpen
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement("div", {
            ...createScopeAttributes("dialog", "backdrop", state),
            "aria-hidden": "true",
            onClick: closeOnBackdrop ? () => closeDialog("backdrop") : undefined
          }),
          React.createElement(
            "div",
            {
              ...createScopeAttributes("dialog", "content", state),
              id: contentId,
              role: "dialog",
              "aria-modal": modal ? "true" : "false",
              "aria-labelledby": titleId,
              "aria-describedby": descriptionId,
              tabIndex: -1,
              onKeyDown: handleDialogKeyDown
            },
            title
              ? React.createElement(
                  "h2",
                  {
                    ...createScopeAttributes("dialog", "title", state),
                    id: titleId
                  },
                  title
                )
              : null,
            description
              ? React.createElement(
                  "p",
                  {
                    ...createScopeAttributes("dialog", "description", state),
                    id: descriptionId
                  },
                  description
                )
              : null,
            children,
            React.createElement(
              "button",
              {
                ...createScopeAttributes("dialog", "close", state),
                type: "button",
                "aria-label": closeButtonLabel,
                onClick: () => closeDialog("close-button")
              },
              resolveIconContent(closeButtonContent, "close")
            )
          )
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("dialog", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsDialog.displayName = "ChipsDialog";

export const ChipsPopover = React.forwardRef((props, ref) => {
  const {
    open,
    defaultOpen = false,
    disabled = false,
    loading = false,
    error = null,
    triggerContent,
    children,
    closeOnEscape = true,
    onOpenChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const contentId = React.useId();

  const toggle = (event) => {
    if (disabledByState) {
      event.preventDefault();
      return;
    }
    setCurrentOpen(!currentOpen);
  };

  const handleContentKeyDown = (event) => {
    if (event.key === "Escape" && closeOnEscape) {
      event.preventDefault();
      setCurrentOpen(false);
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("popover", "root", state),
      ...handlers,
      ref,
      "data-open": String(Boolean(currentOpen)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("popover", "trigger", state),
        type: "button",
        role: "button",
        disabled: disabledByState,
        "aria-haspopup": "dialog",
        "aria-expanded": String(Boolean(currentOpen)),
        "aria-controls": contentId,
        onClick: toggle
      },
      triggerContent
    ),
    currentOpen
      ? React.createElement(
          "div",
          createScopeAttributes("popover", "positioner", state),
          React.createElement(
            "div",
            {
              ...createScopeAttributes("popover", "content", state),
              id: contentId,
              role: "dialog",
              "aria-modal": "false",
              tabIndex: -1,
              onKeyDown: handleContentKeyDown
            },
            React.createElement("span", {
              ...createScopeAttributes("popover", "arrow", state),
              "aria-hidden": "true"
            }),
            children
          )
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("popover", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsPopover.displayName = "ChipsPopover";

export const ChipsTabs = React.forwardRef((props, ref) => {
  const {
    value,
    defaultValue,
    disabled = false,
    loading = false,
    error = null,
    items = [],
    orientation = "horizontal",
    onValueChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const normalizedItems = normalizeItems(items);

  const initialTabValue = defaultValue !== undefined
    ? String(defaultValue)
    : normalizedItems[getFirstEnabledIndex(normalizedItems)]?.value;

  const [currentValue, setCurrentValue, isControlled] = useControllableState({
    value: value !== undefined ? String(value) : undefined,
    defaultValue: initialTabValue,
    onChange: onValueChange
  });

  React.useEffect(() => {
    if (isControlled) {
      return;
    }
    if (normalizedItems.length === 0) {
      return;
    }
    const activeExists = normalizedItems.some(
      (item) => item.value === currentValue && item.disabled !== true
    );
    if (!activeExists) {
      const fallbackIndex = getFirstEnabledIndex(normalizedItems);
      if (fallbackIndex >= 0) {
        setCurrentValue(normalizedItems[fallbackIndex].value);
      }
    }
  }, [currentValue, isControlled, normalizedItems, setCurrentValue]);

  const selectedIndex = normalizedItems.findIndex((item) => item.value === currentValue);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const baseId = React.useId();

  const selectIndex = (index) => {
    const item = normalizedItems[index];
    if (!item || item.disabled || disabledByState) {
      return;
    }
    setCurrentValue(item.value);
  };

  const handleListKeyDown = (event) => {
    if (disabledByState || normalizedItems.length === 0) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      selectIndex(getFirstEnabledIndex(normalizedItems));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = getNextEnabledIndex(normalizedItems, 0, "prev", true);
      selectIndex(last);
      return;
    }

    const isHorizontal = orientation !== "vertical";
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

    if (event.key === nextKey) {
      event.preventDefault();
      const nextIndex = getNextEnabledIndex(normalizedItems, selectedIndex, "next", true);
      selectIndex(nextIndex);
      return;
    }

    if (event.key === prevKey) {
      event.preventDefault();
      const prevIndex = getNextEnabledIndex(normalizedItems, selectedIndex, "prev", true);
      selectIndex(prevIndex);
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("tabs", "root", state),
      ...handlers,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "div",
      {
        ...createScopeAttributes("tabs", "list", state),
        role: "tablist",
        "aria-orientation": orientation,
        onKeyDown: handleListKeyDown
      },
      normalizedItems.map((item, index) => {
        const selected = index === selectedIndex;
        const tabId = `${baseId}-tab-${index}`;
        const panelId = `${baseId}-panel-${index}`;

        return React.createElement(
          "button",
          {
            ...createScopeAttributes("tabs", "trigger", state),
            key: `${item.value}-${index}`,
            id: tabId,
            role: "tab",
            type: "button",
            tabIndex: selected ? 0 : -1,
            "aria-selected": String(selected),
            "aria-controls": panelId,
            "aria-disabled": item.disabled ? "true" : undefined,
            disabled: disabledByState || item.disabled,
            onClick: () => selectIndex(index),
            onKeyDown: (event) => {
              if (isKeyboardActivationKey(event.key)) {
                event.preventDefault();
                selectIndex(index);
              }
            }
          },
          item.label
        );
      })
    ),
    normalizedItems.map((item, index) => {
      const selected = index === selectedIndex;
      const tabId = `${baseId}-tab-${index}`;
      const panelId = `${baseId}-panel-${index}`;

      return React.createElement(
        "div",
        {
          ...createScopeAttributes("tabs", "panel", state),
          key: panelId,
          id: panelId,
          role: "tabpanel",
          "aria-labelledby": tabId,
          hidden: !selected
        },
        selected ? item.content : null
      );
    }),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("tabs", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsTabs.displayName = "ChipsTabs";

export const ChipsMenu = React.forwardRef((props, ref) => {
  const {
    open,
    defaultOpen = false,
    disabled = false,
    loading = false,
    error = null,
    triggerContent,
    items = [],
    closeOnSelect = true,
    onOpenChange,
    onSelect,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const normalizedItems = normalizeItems(items);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });
  const [highlightedIndex, setHighlightedIndex] = React.useState(
    getFirstEnabledIndex(normalizedItems)
  );

  React.useEffect(() => {
    if (!currentOpen) {
      return;
    }
    if (highlightedIndex >= 0 && normalizedItems[highlightedIndex]) {
      return;
    }
    setHighlightedIndex(getFirstEnabledIndex(normalizedItems));
  }, [currentOpen, highlightedIndex, normalizedItems]);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const contentId = React.useId();

  const openMenu = () => {
    if (disabledByState) {
      return;
    }
    setCurrentOpen(true);
  };

  const closeMenu = () => {
    setCurrentOpen(false);
  };

  const selectIndex = (index) => {
    const item = normalizedItems[index];
    if (!item || item.disabled || disabledByState) {
      return;
    }
    if (typeof onSelect === "function") {
      onSelect(item.value);
    }
    if (closeOnSelect) {
      closeMenu();
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenu();
      setHighlightedIndex(getFirstEnabledIndex(normalizedItems));
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      setCurrentOpen(!currentOpen);
    }
  };

  const handleMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = getNextEnabledIndex(normalizedItems, highlightedIndex, "next", true);
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = getNextEnabledIndex(normalizedItems, highlightedIndex, "prev", true);
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(getFirstEnabledIndex(normalizedItems));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = getNextEnabledIndex(normalizedItems, 0, "prev", true);
      setHighlightedIndex(last);
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      selectIndex(highlightedIndex);
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("menu", "root", state),
      ...handlers,
      ref,
      "data-open": String(Boolean(currentOpen)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("menu", "trigger", state),
        type: "button",
        role: "button",
        disabled: disabledByState,
        "aria-haspopup": "menu",
        "aria-expanded": String(Boolean(currentOpen)),
        "aria-controls": contentId,
        onClick: () => setCurrentOpen(!currentOpen),
        onKeyDown: handleTriggerKeyDown
      },
      triggerContent
    ),
    currentOpen
      ? React.createElement(
          "ul",
          {
            ...createScopeAttributes("menu", "content", state),
            id: contentId,
            role: "menu",
            onKeyDown: handleMenuKeyDown
          },
          normalizedItems.map((item, index) => {
            const highlighted = index === highlightedIndex;
            return React.createElement(
              "li",
              {
                key: `${item.value}-${index}`,
                role: "none"
              },
              React.createElement(
                "button",
                {
                  ...createScopeAttributes("menu", "item", state),
                  type: "button",
                  role: "menuitem",
                  tabIndex: highlighted ? 0 : -1,
                  disabled: disabledByState || item.disabled,
                  "aria-disabled": item.disabled ? "true" : undefined,
                  "data-highlighted": String(highlighted),
                  onMouseEnter: () => setHighlightedIndex(index),
                  onClick: () => selectIndex(index)
                },
                item.label
              )
            );
          })
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("menu", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsMenu.displayName = "ChipsMenu";

export const ChipsTooltip = React.forwardRef((props, ref) => {
  const {
    open,
    defaultOpen = false,
    disabled = false,
    loading = false,
    error = null,
    triggerContent,
    content,
    onOpenChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const contentId = React.useId();

  const show = () => {
    if (!disabledByState) {
      setCurrentOpen(true);
    }
  };

  const hide = () => {
    setCurrentOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      hide();
    }

    if (isKeyboardActivationKey(event.key)) {
      show();
    }
  };

  return React.createElement(
    "span",
    {
      ...createScopeAttributes("tooltip", "root", state),
      ...handlers,
      ref,
      "data-open": String(Boolean(currentOpen)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("tooltip", "trigger", state),
        type: "button",
        disabled: disabledByState,
        "aria-describedby": currentOpen ? contentId : undefined,
        onPointerEnter: show,
        onPointerLeave: hide,
        onFocus: show,
        onBlur: hide,
        onKeyDown: handleKeyDown
      },
      triggerContent
    ),
    currentOpen && content
      ? React.createElement(
          "div",
          {
            ...createScopeAttributes("tooltip", "content", state),
            id: contentId,
            role: "tooltip"
          },
          React.createElement("span", {
            ...createScopeAttributes("tooltip", "arrow", state),
            "aria-hidden": "true"
          }),
          content
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("tooltip", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsTooltip.displayName = "ChipsTooltip";

export const ChipsFormField = React.forwardRef((props, ref) => {
  const {
    id,
    label,
    description,
    required = false,
    disabled = false,
    loading = false,
    error = null,
    readOnly = false,
    value,
    defaultValue = "",
    placeholder = "",
    controlProps = {},
    onValueChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentValue, setCurrentValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const inputId = id || React.useId();
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = normalizedError ? `${inputId}-error` : undefined;
  const describedByIds = [descriptionId, errorId].filter(Boolean);

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("form-field", "root", state),
      ...handlers,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    label
      ? React.createElement(
          "label",
          {
            ...createScopeAttributes("form-field", "label", state),
            htmlFor: inputId
          },
          label,
          required ? " *" : ""
        )
      : null,
    React.createElement("input", {
      ...createScopeAttributes("form-field", "control", state),
      ...controlProps,
      id: inputId,
      value: currentValue,
      placeholder,
      disabled: disabledByState,
      readOnly,
      "aria-required": required ? "true" : undefined,
      "aria-invalid": normalizedError ? "true" : undefined,
      "aria-describedby": describedByIds.length > 0 ? describedByIds.join(" ") : undefined,
      onFocus: mergeHandlers(handlers.onFocus, controlProps.onFocus),
      onBlur: mergeHandlers(handlers.onBlur, controlProps.onBlur),
      onChange: (event) => {
        if (typeof controlProps.onChange === "function") {
          controlProps.onChange(event);
        }
        setCurrentValue(event.target.value);
      }
    }),
    description
      ? React.createElement(
          "p",
          {
            ...createScopeAttributes("form-field", "helper", state),
            id: descriptionId
          },
          description
        )
      : null,
    normalizedError
      ? React.createElement(
          "p",
          {
            ...createScopeAttributes("form-field", "error", state),
            id: errorId
          },
          normalizedError.message
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("form-field", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsFormField.displayName = "ChipsFormField";

export const ChipsFormGroup = React.forwardRef((props, ref) => {
  const {
    legend,
    description,
    disabled = false,
    loading = false,
    error = null,
    children,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const groupId = React.useId();
  const descriptionId = description ? `${groupId}-description` : undefined;
  const statusId = normalizedError ? `${groupId}-status` : undefined;
  const describedByIds = [descriptionId, statusId].filter(Boolean);

  return React.createElement(
    "fieldset",
    {
      ...createScopeAttributes("form-group", "root", state),
      ...handlers,
      ref,
      role: "group",
      disabled: disabledByState,
      "aria-describedby": describedByIds.length > 0 ? describedByIds.join(" ") : undefined,
      "aria-invalid": normalizedError ? "true" : undefined
    },
    legend
      ? React.createElement(
          "legend",
          createScopeAttributes("form-group", "legend", state),
          legend
        )
      : null,
    description
      ? React.createElement(
          "p",
          {
            ...createScopeAttributes("form-group", "description", state),
            id: descriptionId
          },
          description
        )
      : null,
    React.createElement(
      "div",
      createScopeAttributes("form-group", "content", state),
      children
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("form-group", "status", state),
            id: statusId,
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsFormGroup.displayName = "ChipsFormGroup";

export const ChipsVirtualList = React.forwardRef((props, ref) => {
  const {
    items = [],
    itemHeight = 44,
    height = 320,
    overscan = 3,
    ariaLabel,
    disabled = false,
    loading = false,
    error = null,
    activeIndex,
    defaultActiveIndex = -1,
    renderItem,
    onActiveIndexChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const normalizedItems = React.useMemo(
    () =>
      (Array.isArray(items) ? items : []).map((item, index) => {
        const source =
          item && typeof item === "object"
            ? item
            : {
                value: String(index),
                label: item === undefined || item === null ? "" : String(item)
              };

        return {
          ...source,
          value:
            typeof source.value === "string" || typeof source.value === "number"
              ? String(source.value)
              : String(index),
          disabled: source.disabled === true
        };
      }),
    [items]
  );

  const [scrollTop, setScrollTop] = React.useState(0);
  const [currentActiveIndex, setCurrentActiveIndex] = useControllableState({
    value: activeIndex,
    defaultValue: defaultActiveIndex,
    onChange: onActiveIndexChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const viewportHeight = normalizePositiveNumber(height, 320);
  const normalizedItemHeight = normalizePositiveNumber(itemHeight, 44);

  const windowed = React.useMemo(
    () =>
      computeVirtualWindow({
        itemCount: normalizedItems.length,
        itemHeight: normalizedItemHeight,
        viewportHeight,
        scrollTop,
        overscan
      }),
    [normalizedItems.length, normalizedItemHeight, overscan, scrollTop, viewportHeight]
  );

  const visibleItems = React.useMemo(
    () =>
      normalizedItems
        .slice(windowed.start, windowed.end + 1)
        .map((item, offset) => ({ item, index: windowed.start + offset })),
    [normalizedItems, windowed.end, windowed.start]
  );

  const totalHeight = normalizedItems.length * normalizedItemHeight;

  const setActive = (index) => {
    if (disabledByState || index < 0 || index >= normalizedItems.length) {
      return;
    }
    if (normalizedItems[index].disabled) {
      return;
    }
    setCurrentActiveIndex(index);
  };

  const handleKeyDown = (event) => {
    if (disabledByState || normalizedItems.length === 0) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActive(getFirstEnabledIndex(normalizedItems));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActive(getNextEnabledIndex(normalizedItems, 0, "prev", true));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(getNextEnabledIndex(normalizedItems, currentActiveIndex, "next", true));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(getNextEnabledIndex(normalizedItems, currentActiveIndex, "prev", true));
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("virtual-list", "root", state),
      ...handlers,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "div",
      {
        ...createScopeAttributes("virtual-list", "viewport", state),
        role: "list",
        "aria-label": ariaLabel,
        tabIndex: 0,
        style: {
          maxHeight: `${viewportHeight}px`,
          overflowY: "auto"
        },
        onScroll: (event) => {
          setScrollTop(event.target.scrollTop);
        },
        onKeyDown: handleKeyDown
      },
      React.createElement(
        "div",
        {
          ...createScopeAttributes("virtual-list", "content", state),
          style: {
            height: `${totalHeight}px`,
            paddingTop: `${windowed.paddingStart}px`,
            paddingBottom: `${windowed.paddingEnd}px`,
            boxSizing: "border-box"
          }
        },
        visibleItems.map(({ item, index }) =>
          React.createElement(
            "div",
            {
              ...createScopeAttributes("virtual-list", "item", state),
              key: `${item.value}-${index}`,
              role: "listitem",
              "aria-disabled": item.disabled ? "true" : undefined,
              "data-active": String(index === currentActiveIndex),
              "data-index": String(index),
              style: {
                minHeight: `${normalizedItemHeight}px`
              },
              onMouseDown: () => setActive(index)
            },
            typeof renderItem === "function" ? renderItem(item, index) : item.label || item.value
          )
        )
      )
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("virtual-list", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsVirtualList.displayName = "ChipsVirtualList";

export const ChipsDataGrid = React.forwardRef((props, ref) => {
  const {
    columns = [],
    rows = [],
    sort,
    defaultSort = null,
    selectedRowIds,
    defaultSelectedRowIds = [],
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    onSortChange,
    onSelectedRowIdsChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentSort, setCurrentSort] = useControllableState({
    value: sort,
    defaultValue: defaultSort,
    onChange: onSortChange
  });
  const [currentSelectedRowIds, setCurrentSelectedRowIds] = useControllableState({
    value: selectedRowIds,
    defaultValue: defaultSelectedRowIds,
    onChange: onSelectedRowIdsChange
  });
  const [activeRowIndex, setActiveRowIndex] = React.useState(0);

  const normalizedColumns = React.useMemo(
    () =>
      (Array.isArray(columns) ? columns : [])
        .filter((column) => column && typeof column.key === "string")
        .map((column) => ({
          key: column.key,
          label: typeof column.label === "string" ? column.label : column.key,
          sortable: column.sortable !== false
        })),
    [columns]
  );

  const normalizedRows = React.useMemo(
    () =>
      (Array.isArray(rows) ? rows : []).map((row, index) => ({
        ...(row && typeof row === "object" ? row : {}),
        __rowId:
          row && (typeof row.id === "string" || typeof row.id === "number")
            ? String(row.id)
            : String(index)
      })),
    [rows]
  );

  const sortedRows = React.useMemo(
    () => applyDataGridSort(normalizedRows, currentSort),
    [normalizedRows, currentSort]
  );

  React.useEffect(() => {
    if (activeRowIndex >= sortedRows.length) {
      setActiveRowIndex(Math.max(0, sortedRows.length - 1));
    }
  }, [activeRowIndex, sortedRows.length]);

  const selectedSet = React.useMemo(
    () => new Set((Array.isArray(currentSelectedRowIds) ? currentSelectedRowIds : []).map((id) => String(id))),
    [currentSelectedRowIds]
  );

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const toggleSort = (columnKey) => {
    if (disabledByState) {
      return;
    }

    if (!currentSort || currentSort.key !== columnKey) {
      setCurrentSort({ key: columnKey, direction: "asc" });
      return;
    }

    setCurrentSort({
      key: columnKey,
      direction: currentSort.direction === "asc" ? "desc" : "asc"
    });
  };

  const toggleRowSelection = (rowId) => {
    if (disabledByState) {
      return;
    }

    const normalizedId = String(rowId);
    const next = new Set(selectedSet);
    if (next.has(normalizedId)) {
      next.delete(normalizedId);
    } else {
      next.add(normalizedId);
    }
    setCurrentSelectedRowIds([...next]);
  };

  const handleGridKeyDown = (event) => {
    if (disabledByState || sortedRows.length === 0) {
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveRowIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveRowIndex(sortedRows.length - 1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveRowIndex((index) => Math.min(sortedRows.length - 1, index + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveRowIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      const activeRow = sortedRows[activeRowIndex];
      if (activeRow) {
        toggleRowSelection(activeRow.__rowId);
      }
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("data-grid", "root", state),
      ...handlers,
      ref,
      role: "grid",
      tabIndex: 0,
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined,
      onKeyDown: handleGridKeyDown
    },
    React.createElement(
      "table",
      createScopeAttributes("data-grid", "table", state),
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          normalizedColumns.map((column) =>
            React.createElement(
              "th",
              {
                ...createScopeAttributes("data-grid", "header", state),
                key: column.key,
                role: "columnheader",
                "aria-sort":
                  currentSort && currentSort.key === column.key
                    ? currentSort.direction === "desc"
                      ? "descending"
                      : "ascending"
                    : "none",
                onClick: column.sortable ? () => toggleSort(column.key) : undefined
              },
              column.label
            )
          )
        )
      ),
      React.createElement(
        "tbody",
        null,
        sortedRows.map((row, index) => {
          const selected = selectedSet.has(row.__rowId);
          const active = index === activeRowIndex;
          return React.createElement(
            "tr",
            {
              ...createScopeAttributes("data-grid", "row", state),
              key: row.__rowId,
              role: "row",
              "aria-selected": String(selected),
              "data-selected": String(selected),
              "data-active": String(active),
              onMouseDown: () => setActiveRowIndex(index),
              onClick: () => toggleRowSelection(row.__rowId)
            },
            normalizedColumns.map((column) =>
              React.createElement(
                "td",
                {
                  ...createScopeAttributes("data-grid", "cell", state),
                  key: `${row.__rowId}-${column.key}`,
                  role: "gridcell"
                },
                row[column.key]
              )
            )
          );
        })
      )
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("data-grid", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsDataGrid.displayName = "ChipsDataGrid";

export const ChipsTree = React.forwardRef((props, ref) => {
  const {
    nodes = [],
    expandedIds,
    defaultExpandedIds = [],
    selectedId,
    defaultSelectedId = null,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    expandIconContent,
    collapseIconContent,
    onExpandedIdsChange,
    onSelectedIdChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentExpandedIds, setCurrentExpandedIds] = useControllableState({
    value: expandedIds,
    defaultValue: defaultExpandedIds,
    onChange: onExpandedIdsChange
  });
  const [currentSelectedId, setCurrentSelectedId] = useControllableState({
    value: selectedId,
    defaultValue: defaultSelectedId,
    onChange: onSelectedIdChange
  });

  const visibleNodes = React.useMemo(
    () => flattenTreeNodes(nodes, currentExpandedIds),
    [nodes, currentExpandedIds]
  );

  const [activeNodeId, setActiveNodeId] = React.useState(
    () => currentSelectedId || visibleNodes[0]?.id || null
  );

  React.useEffect(() => {
    if (visibleNodes.length === 0) {
      setActiveNodeId(null);
      return;
    }

    const targetId = activeNodeId || currentSelectedId;
    const exists = visibleNodes.some((node) => node.id === targetId);
    if (!exists) {
      setActiveNodeId(visibleNodes[0].id);
    }
  }, [activeNodeId, currentSelectedId, visibleNodes]);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const expandedSet = React.useMemo(
    () => new Set((Array.isArray(currentExpandedIds) ? currentExpandedIds : []).map((id) => String(id))),
    [currentExpandedIds]
  );

  const updateExpanded = (nodeId, shouldExpand) => {
    const id = String(nodeId);
    const next = new Set(expandedSet);
    if (shouldExpand) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setCurrentExpandedIds([...next]);
  };

  const selectNode = (nodeId) => {
    const candidate = visibleNodes.find((item) => item.id === String(nodeId));
    if (!candidate || candidate.disabled || disabledByState) {
      return;
    }
    setCurrentSelectedId(candidate.id);
    setActiveNodeId(candidate.id);
  };

  const moveActiveBy = (direction) => {
    const focusable = visibleNodes.map((node) => ({ disabled: node.disabled }));
    const activeIndex = visibleNodes.findIndex((node) => node.id === activeNodeId);
    const nextIndex = getNextEnabledIndex(focusable, activeIndex, direction, true);
    if (nextIndex >= 0 && visibleNodes[nextIndex]) {
      setActiveNodeId(visibleNodes[nextIndex].id);
    }
  };

  const handleKeyDown = (event) => {
    if (disabledByState || visibleNodes.length === 0) {
      return;
    }

    const currentIndex = visibleNodes.findIndex((node) => node.id === activeNodeId);
    const currentNode = currentIndex >= 0 ? visibleNodes[currentIndex] : null;
    if (!currentNode) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveBy("next");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveBy("prev");
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstIndex = getFirstEnabledIndex(visibleNodes.map((node) => ({ disabled: node.disabled })));
      if (firstIndex >= 0) {
        setActiveNodeId(visibleNodes[firstIndex].id);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = getNextEnabledIndex(
        visibleNodes.map((node) => ({ disabled: node.disabled })),
        0,
        "prev",
        true
      );
      if (lastIndex >= 0) {
        setActiveNodeId(visibleNodes[lastIndex].id);
      }
      return;
    }

    if (event.key === "ArrowRight" && currentNode.hasChildren) {
      event.preventDefault();
      updateExpanded(currentNode.id, true);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (currentNode.hasChildren && currentNode.expanded) {
        updateExpanded(currentNode.id, false);
        return;
      }
      if (currentNode.parentId) {
        setActiveNodeId(currentNode.parentId);
      }
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      selectNode(currentNode.id);
    }
  };

  return React.createElement(
    "ul",
    {
      ...createScopeAttributes("tree", "root", state),
      ...handlers,
      ref,
      role: "tree",
      tabIndex: 0,
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined,
      onKeyDown: handleKeyDown
    },
    visibleNodes.map((node) =>
      React.createElement(
        "li",
        {
          ...createScopeAttributes("tree", "node", state),
          key: node.id,
          role: "treeitem",
          tabIndex: node.id === activeNodeId ? 0 : -1,
          "aria-level": node.depth + 1,
          "aria-expanded": node.hasChildren ? String(node.expanded) : undefined,
          "aria-selected": String(node.id === currentSelectedId),
          "aria-disabled": node.disabled ? "true" : undefined,
          "data-active": String(node.id === activeNodeId),
          "data-selected": String(node.id === currentSelectedId),
          style: { paddingLeft: `${node.depth * 16}px` },
          onMouseDown: () => setActiveNodeId(node.id),
          onClick: () => selectNode(node.id)
        },
        node.hasChildren
          ? React.createElement(
              "button",
              {
                ...createScopeAttributes("tree", "toggle", state),
                type: "button",
                tabIndex: -1,
                "aria-label": node.label,
                onClick: (event) => {
                  event.stopPropagation();
                  updateExpanded(node.id, !node.expanded);
                }
              },
              node.expanded
                ? resolveIconContent(collapseIconContent, "collapse")
                : resolveIconContent(expandIconContent, "expand")
            )
          : null,
        React.createElement(
          "span",
          createScopeAttributes("tree", "label", state),
          node.label
        ),
        React.createElement("span", {
          ...createScopeAttributes("tree", "children", state),
          "aria-hidden": "true",
          hidden: !node.hasChildren
        })
      )
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("tree", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsTree.displayName = "ChipsTree";

export const ChipsDateTime = React.forwardRef((props, ref) => {
  const {
    id,
    label,
    ariaLabel,
    value,
    defaultValue = "",
    min,
    max,
    step,
    disabled = false,
    loading = false,
    error = null,
    readOnly = false,
    iconContent,
    onValueChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentValue, setCurrentValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const inputId = id || React.useId();

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("date-time", "root", state),
      ...handlers,
      ref,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    label
      ? React.createElement(
          "label",
          {
            ...createScopeAttributes("date-time", "icon", state),
            htmlFor: inputId
          },
          label
        )
      : null,
    React.createElement("input", {
      ...createScopeAttributes("date-time", "input", state),
      id: inputId,
      type: "datetime-local",
      value: currentValue,
      min,
      max,
      step,
      disabled: disabledByState,
      readOnly,
      "aria-label": ariaLabel,
      "aria-invalid": normalizedError ? "true" : undefined,
      onFocus: handlers.onFocus,
      onBlur: handlers.onBlur,
      onChange: (event) => setCurrentValue(event.target.value)
    }),
    React.createElement(
      "span",
      {
        ...createScopeAttributes("date-time", "icon", state),
        "aria-hidden": "true"
      },
      resolveIconContent(iconContent, "calendar")
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("date-time", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsDateTime.displayName = "ChipsDateTime";

export const ChipsCommandPalette = React.forwardRef((props, ref) => {
  const {
    open,
    defaultOpen = false,
    query,
    defaultQuery = "",
    items = [],
    disabled = false,
    loading = false,
    error = null,
    triggerLabel,
    searchPlaceholder = "",
    ariaLabel,
    onOpenChange,
    onQueryChange,
    onSelect,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });
  const [currentQuery, setCurrentQuery] = useControllableState({
    value: query,
    defaultValue: defaultQuery,
    onChange: onQueryChange
  });

  const filteredItems = React.useMemo(
    () =>
      filterCommandPaletteItems(items, currentQuery).map((item, index) => ({
        ...item,
        id:
          typeof item.id === "string" || typeof item.id === "number"
            ? String(item.id)
            : String(index),
        disabled: item && item.disabled === true
      })),
    [items, currentQuery]
  );

  const [highlightedIndex, setHighlightedIndex] = React.useState(
    getFirstEnabledIndex(filteredItems)
  );

  React.useEffect(() => {
    setHighlightedIndex(getFirstEnabledIndex(filteredItems));
  }, [filteredItems]);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const listId = React.useId();

  const selectIndex = (index) => {
    const item = filteredItems[index];
    if (!item || item.disabled || disabledByState) {
      return;
    }
    if (typeof onSelect === "function") {
      onSelect(item);
    }
    setCurrentOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (!currentOpen || filteredItems.length === 0) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setCurrentOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = getNextEnabledIndex(filteredItems, highlightedIndex, "next", true);
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = getNextEnabledIndex(filteredItems, highlightedIndex, "prev", true);
      setHighlightedIndex(next);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(getFirstEnabledIndex(filteredItems));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const last = getNextEnabledIndex(filteredItems, 0, "prev", true);
      setHighlightedIndex(last);
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      selectIndex(highlightedIndex);
    }
  };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("command-palette", "root", state),
      ...handlers,
      ref,
      "data-open": String(Boolean(currentOpen)),
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "button",
      {
        ...createScopeAttributes("command-palette", "trigger", state),
        type: "button",
        role: "button",
        disabled: disabledByState,
        "aria-expanded": String(Boolean(currentOpen)),
        "aria-controls": listId,
        onClick: () => setCurrentOpen(!currentOpen)
      },
      triggerLabel
    ),
    currentOpen
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement("input", {
            ...createScopeAttributes("command-palette", "search", state),
            role: "combobox",
            value: currentQuery,
            placeholder: searchPlaceholder,
            "aria-label": ariaLabel,
            "aria-controls": listId,
            "aria-expanded": "true",
            onChange: (event) => setCurrentQuery(event.target.value),
            onKeyDown: handleSearchKeyDown
          }),
          React.createElement(
            "ul",
            {
              ...createScopeAttributes("command-palette", "list", state),
              id: listId,
              role: "listbox"
            },
            filteredItems.map((item, index) =>
              React.createElement(
                "li",
                {
                  ...createScopeAttributes("command-palette", "item", state),
                  key: item.id,
                  role: "option",
                  "aria-selected": String(index === highlightedIndex),
                  "aria-disabled": item.disabled ? "true" : undefined,
                  "data-highlighted": String(index === highlightedIndex),
                  onMouseEnter: () => setHighlightedIndex(index),
                  onMouseDown: (event) => {
                    event.preventDefault();
                    selectIndex(index);
                  }
                },
                item.label,
                item.shortcut
                  ? React.createElement(
                      "span",
                      createScopeAttributes("command-palette", "shortcut", state),
                      item.shortcut
                    )
                  : null
              )
            )
          )
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("command-palette", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsCommandPalette.displayName = "ChipsCommandPalette";

export const ChipsSplitPane = React.forwardRef((props, ref) => {
  const {
    orientation = "horizontal",
    ratio,
    defaultRatio = 0.5,
    minRatio = 0.1,
    maxRatio = 0.9,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    start,
    end,
    onRatioChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentRatio, setCurrentRatio] = useControllableState({
    value: ratio,
    defaultValue: defaultRatio,
    onChange: onRatioChange
  });

  const resolvedRatio = clampSplitRatio(currentRatio, minRatio, maxRatio);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const updateRatio = (nextRatio) => {
    if (disabledByState) {
      return;
    }
    setCurrentRatio(clampSplitRatio(nextRatio, minRatio, maxRatio));
  };

  const handleResizerMouseDown = (event) => {
    if (disabledByState) {
      return;
    }

    const container = event.currentTarget.parentElement;
    if (!container || typeof container.getBoundingClientRect !== "function") {
      return;
    }

    const rect = container.getBoundingClientRect();
    const horizontal = orientation !== "vertical";

    const move = (moveEvent) => {
      const nextRatio = horizontal
        ? (moveEvent.clientX - rect.left) / Math.max(rect.width, 1)
        : (moveEvent.clientY - rect.top) / Math.max(rect.height, 1);
      updateRatio(nextRatio);
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const handleResizerKeyDown = (event) => {
    if (disabledByState) {
      return;
    }

    const horizontal = orientation !== "vertical";
    const decreaseKey = horizontal ? "ArrowLeft" : "ArrowUp";
    const increaseKey = horizontal ? "ArrowRight" : "ArrowDown";

    if (event.key === decreaseKey) {
      event.preventDefault();
      updateRatio(resolvedRatio - 0.05);
      return;
    }

    if (event.key === increaseKey) {
      event.preventDefault();
      updateRatio(resolvedRatio + 0.05);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      updateRatio(minRatio);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      updateRatio(maxRatio);
    }
  };

  const horizontal = orientation !== "vertical";
  const startStyle = horizontal
    ? { width: `${resolvedRatio * 100}%` }
    : { height: `${resolvedRatio * 100}%` };
  const endStyle = horizontal
    ? { width: `${(1 - resolvedRatio) * 100}%` }
    : { height: `${(1 - resolvedRatio) * 100}%` };

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("split-pane", "root", state),
      ...handlers,
      ref,
      role: "group",
      "aria-label": ariaLabel,
      "aria-orientation": orientation,
      "aria-disabled": disabledByState ? "true" : undefined,
      style: {
        display: "flex",
        flexDirection: horizontal ? "row" : "column"
      }
    },
    React.createElement(
      "div",
      {
        ...createScopeAttributes("split-pane", "pane-start", state),
        style: {
          ...startStyle,
          minWidth: horizontal ? 0 : undefined,
          minHeight: horizontal ? undefined : 0
        }
      },
      start
    ),
    React.createElement("button", {
      ...createScopeAttributes("split-pane", "resizer", state),
      type: "button",
      role: "separator",
      tabIndex: 0,
      "aria-label": ariaLabel,
      "aria-valuemin": String(Math.round(minRatio * 100)),
      "aria-valuemax": String(Math.round(maxRatio * 100)),
      "aria-valuenow": String(Math.round(resolvedRatio * 100)),
      "aria-orientation": orientation,
      onMouseDown: handleResizerMouseDown,
      onKeyDown: handleResizerKeyDown
    }),
    React.createElement(
      "div",
      {
        ...createScopeAttributes("split-pane", "pane-end", state),
        style: {
          ...endStyle,
          minWidth: horizontal ? 0 : undefined,
          minHeight: horizontal ? undefined : 0
        }
      },
      end
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("split-pane", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsSplitPane.displayName = "ChipsSplitPane";

export const ChipsDockPanel = React.forwardRef((props, ref) => {
  const {
    panels = [],
    panelStates,
    defaultPanelStates = {},
    activePanelId,
    defaultActivePanelId,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    onPanelStatesChange,
    onActivePanelIdChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentPanelStates, setCurrentPanelStates] = useControllableState({
    value: panelStates,
    defaultValue: defaultPanelStates,
    onChange: onPanelStatesChange
  });
  const [currentActivePanelId, setCurrentActivePanelId] = useControllableState({
    value: activePanelId,
    defaultValue: defaultActivePanelId,
    onChange: onActivePanelIdChange
  });

  const normalizedPanels = React.useMemo(
    () =>
      (Array.isArray(panels) ? panels : [])
        .filter((panel) => panel && typeof panel.id === "string")
        .map((panel) => ({
          ...panel,
          title: typeof panel.title === "string" ? panel.title : panel.id
        })),
    [panels]
  );

  const normalizedStateMap = React.useMemo(
    () => resolveDockPanelStateMap(normalizedPanels, currentPanelStates),
    [normalizedPanels, currentPanelStates]
  );

  React.useEffect(() => {
    if (normalizedPanels.length === 0) {
      return;
    }

    if (
      !currentActivePanelId ||
      !normalizedPanels.some((panel) => panel.id === currentActivePanelId)
    ) {
      const firstActive = normalizedPanels.find(
        (panel) => normalizedStateMap[panel.id] !== "hidden"
      );
      if (firstActive) {
        setCurrentActivePanelId(firstActive.id);
      }
    }
  }, [currentActivePanelId, normalizedPanels, normalizedStateMap, setCurrentActivePanelId]);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const updatePanelState = (panelId, panelState) => {
    if (disabledByState) {
      return;
    }
    const next = { ...normalizedStateMap, [panelId]: panelState };
    setCurrentPanelStates(next);
    if (panelState === "active") {
      setCurrentActivePanelId(panelId);
    }
  };

  const visiblePanels = normalizedPanels.filter(
    (panel) => normalizedStateMap[panel.id] !== "hidden"
  );
  const activePanel =
    visiblePanels.find((panel) => panel.id === currentActivePanelId) || visiblePanels[0];

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("dock-panel", "root", state),
      ...handlers,
      ref,
      role: "group",
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "div",
      {
        ...createScopeAttributes("dock-panel", "tab-list", state),
        role: "tablist",
        "aria-label": ariaLabel
      },
      normalizedPanels.map((panel) => {
        const panelState = normalizedStateMap[panel.id];
        const selected = activePanel && activePanel.id === panel.id && panelState !== "hidden";
        const panelId = `dock-panel-${panel.id}`;

        return React.createElement(
          "button",
          {
            ...createScopeAttributes("dock-panel", "tab", state),
            key: panel.id,
            id: `${panelId}-tab`,
            type: "button",
            role: "tab",
            tabIndex: selected ? 0 : -1,
            "aria-selected": String(Boolean(selected)),
            "aria-controls": panelId,
            "data-panel-state": panelState,
            disabled: disabledByState,
            onClick: () => updatePanelState(panel.id, "active")
          },
          panel.title
        );
      })
    ),
    activePanel
      ? React.createElement(
          "section",
          {
            ...createScopeAttributes("dock-panel", "content", state),
            id: `dock-panel-${activePanel.id}`,
            role: "tabpanel",
            "aria-labelledby": `dock-panel-${activePanel.id}-tab`
          },
          activePanel.content
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("dock-panel", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsDockPanel.displayName = "ChipsDockPanel";

export const ChipsInspector = React.forwardRef((props, ref) => {
  const {
    sections = [],
    openSectionIds,
    defaultOpenSectionIds = [],
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    onOpenSectionIdsChange,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpenSectionIds, setCurrentOpenSectionIds] = useControllableState({
    value: openSectionIds,
    defaultValue: defaultOpenSectionIds,
    onChange: onOpenSectionIdsChange
  });
  const [activeIndex, setActiveIndex] = React.useState(0);

  const normalizedSections = React.useMemo(
    () =>
      (Array.isArray(sections) ? sections : [])
        .filter((section) => section && typeof section.id === "string")
        .map((section) => ({
          ...section,
          title: typeof section.title === "string" ? section.title : section.id
        })),
    [sections]
  );

  React.useEffect(() => {
    if (activeIndex >= normalizedSections.length) {
      setActiveIndex(Math.max(0, normalizedSections.length - 1));
    }
  }, [activeIndex, normalizedSections.length]);

  const openSet = React.useMemo(
    () => new Set((Array.isArray(currentOpenSectionIds) ? currentOpenSectionIds : []).map((id) => String(id))),
    [currentOpenSectionIds]
  );

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const toggleSection = (sectionId) => {
    if (disabledByState) {
      return;
    }
    setCurrentOpenSectionIds(toggleInspectorSection(currentOpenSectionIds, sectionId));
  };

  const handleRootKeyDown = (event) => {
    if (disabledByState || normalizedSections.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(normalizedSections.length - 1, index + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(normalizedSections.length - 1);
      return;
    }

    if (isKeyboardActivationKey(event.key)) {
      event.preventDefault();
      const section = normalizedSections[activeIndex];
      if (section) {
        toggleSection(section.id);
      }
    }
  };

  return React.createElement(
    "aside",
    {
      ...createScopeAttributes("inspector", "root", state),
      ...handlers,
      ref,
      role: "complementary",
      tabIndex: 0,
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined,
      onKeyDown: handleRootKeyDown
    },
    normalizedSections.map((section, index) => {
      const opened = openSet.has(section.id);
      const sectionId = `inspector-section-${section.id}`;
      const headerId = `${sectionId}-header`;
      return React.createElement(
        "section",
        {
          ...createScopeAttributes("inspector", "section", state),
          key: section.id,
          id: sectionId
        },
        React.createElement(
          "button",
          {
            ...createScopeAttributes("inspector", "header", state),
            id: headerId,
            type: "button",
            tabIndex: index === activeIndex ? 0 : -1,
            "aria-expanded": String(opened),
            "aria-controls": `${sectionId}-body`,
            onClick: () => toggleSection(section.id)
          },
          section.title
        ),
        opened
          ? React.createElement(
              "div",
              {
                ...createScopeAttributes("inspector", "body", state),
                id: `${sectionId}-body`,
                role: "region",
                "aria-labelledby": headerId
              },
              section.content
            )
          : null
      );
    }),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("inspector", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsInspector.displayName = "ChipsInspector";

export const ChipsPanelHeader = React.forwardRef((props, ref) => {
  const {
    title,
    subtitle,
    actions,
    collapsed,
    defaultCollapsed = false,
    collapsible = false,
    closable = false,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    expandIconContent,
    collapseIconContent,
    closeIconContent,
    onCollapsedChange,
    onClose,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentCollapsed, setCurrentCollapsed] = useControllableState({
    value: collapsed,
    defaultValue: defaultCollapsed === true,
    onChange: onCollapsedChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  return React.createElement(
    "header",
    {
      ...createScopeAttributes("panel-header", "root", state),
      ...handlers,
      ref,
      role: "group",
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "div",
      createScopeAttributes("panel-header", "title", state),
      title
    ),
    subtitle
      ? React.createElement(
          "div",
          createScopeAttributes("panel-header", "subtitle", state),
          subtitle
        )
      : null,
    React.createElement(
      "div",
      createScopeAttributes("panel-header", "actions", state),
      actions,
      collapsible
        ? React.createElement(
            "button",
            {
              ...createScopeAttributes("panel-header", "toggle", state),
              type: "button",
              "aria-label": ariaLabel,
              "aria-pressed": String(currentCollapsed),
              disabled: disabledByState,
              onClick: () => setCurrentCollapsed(!currentCollapsed)
            },
            currentCollapsed
              ? resolveIconContent(expandIconContent, "expand")
              : resolveIconContent(collapseIconContent, "collapse")
          )
        : null,
      closable
        ? React.createElement(
            "button",
            {
              ...createScopeAttributes("panel-header", "close", state),
              type: "button",
              "aria-label": ariaLabel,
              disabled: disabledByState,
              onClick: onClose
            },
            resolveIconContent(closeIconContent, "close")
          )
        : null
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("panel-header", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsPanelHeader.displayName = "ChipsPanelHeader";

export const ChipsCardShell = React.forwardRef((props, ref) => {
  const {
    title,
    toolbar,
    footer,
    children,
    active = false,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction: {
      ...interaction,
      active: interaction.active || active
    }
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  return React.createElement(
    "article",
    {
      ...createScopeAttributes("card-shell", "root", state),
      ...handlers,
      ref,
      role: "article",
      "aria-label": ariaLabel,
      "aria-disabled": disabledByState ? "true" : undefined,
      "data-active": String(active)
    },
    React.createElement(
      "header",
      createScopeAttributes("card-shell", "header", state),
      title
    ),
    React.createElement(
      "div",
      createScopeAttributes("card-shell", "toolbar", state),
      toolbar
    ),
    React.createElement(
      "section",
      createScopeAttributes("card-shell", "content", state),
      children
    ),
    React.createElement(
      "footer",
      createScopeAttributes("card-shell", "footer", state),
      footer
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("card-shell", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsCardShell.displayName = "ChipsCardShell";

export const ChipsToolWindow = React.forwardRef((props, ref) => {
  const {
    title,
    open,
    defaultOpen = true,
    minimized,
    defaultMinimized = false,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    expandIconContent,
    collapseIconContent,
    closeIconContent,
    children,
    onOpenChange,
    onMinimizedChange,
    onFocus,
    onStateChange
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentOpen, setCurrentOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen === true,
    onChange: onOpenChange
  });
  const [currentMinimized, setCurrentMinimized] = useControllableState({
    value: minimized,
    defaultValue: defaultMinimized === true,
    onChange: onMinimizedChange
  });

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  if (!currentOpen) {
    return null;
  }

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("tool-window", "root", state),
      ...handlers,
      ref,
      role: "dialog",
      "aria-label": ariaLabel,
      "aria-modal": "false",
      "aria-disabled": disabledByState ? "true" : undefined,
      "data-minimized": String(Boolean(currentMinimized)),
      onFocus: onFocus
    },
    React.createElement(
      "header",
      createScopeAttributes("tool-window", "header", state),
      title
    ),
    React.createElement(
      "div",
      createScopeAttributes("tool-window", "controls", state),
      React.createElement(
        "button",
        {
          ...createScopeAttributes("tool-window", "controls", state),
          type: "button",
          disabled: disabledByState,
          "aria-label": ariaLabel,
          onClick: () => setCurrentMinimized(!currentMinimized)
        },
        currentMinimized
          ? resolveIconContent(expandIconContent, "expand")
          : resolveIconContent(collapseIconContent, "collapse")
      ),
      React.createElement(
        "button",
        {
          ...createScopeAttributes("tool-window", "controls", state),
          type: "button",
          disabled: disabledByState,
          "aria-label": ariaLabel,
          onClick: () => setCurrentOpen(false)
        },
        resolveIconContent(closeIconContent, "close")
      )
    ),
    !currentMinimized
      ? React.createElement(
          "div",
          createScopeAttributes("tool-window", "body", state),
          children
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("tool-window", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsToolWindow.displayName = "ChipsToolWindow";

export const ChipsErrorBoundary = React.forwardRef((props, ref) => {
  const {
    children,
    fallback,
    resetKeys = [],
    error = null,
    disabled = false,
    loading = false,
    title,
    titleKey = "systemUx.errorBoundary.title",
    description,
    descriptionKey = "systemUx.errorBoundary.description",
    retryLabel,
    retryLabelKey = "systemUx.errorBoundary.retry",
    showErrorMessage = true,
    ariaLabel,
    i18n,
    traceId,
    onError,
    onRetry,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedInputError = normalizeError(error);
  const controlledError = normalizedInputError
    ? toStandardError(normalizedInputError, "SYSTEM_UX_ERROR_BOUNDARY_INPUT_ERROR")
    : null;
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [capturedError, setCapturedError] = React.useState(null);
  const [boundaryVersion, setBoundaryVersion] = React.useState(0);
  const effectiveError = capturedError || controlledError;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: effectiveError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resetSignature = React.useMemo(
    () => JSON.stringify(Array.isArray(resetKeys) ? resetKeys : []),
    [resetKeys]
  );
  const previousResetSignatureRef = React.useRef(resetSignature);

  React.useEffect(() => {
    if (previousResetSignatureRef.current === resetSignature) {
      return;
    }
    previousResetSignatureRef.current = resetSignature;

    if (!capturedError) {
      return;
    }
    setCapturedError(null);
    setBoundaryVersion((prev) => prev + 1);
  }, [capturedError, resetSignature]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: "systemUx.errorBoundary.ariaLabel",
    fallback: ariaLabel || "[[systemUx.errorBoundary.ariaLabel]]",
    onDiagnostic
  });
  const resolvedTitle = resolveI18nText({
    i18n,
    key: titleKey,
    fallback: title || "[[systemUx.errorBoundary.title]]",
    onDiagnostic
  });
  const resolvedDescription = resolveI18nText({
    i18n,
    key: descriptionKey,
    fallback: description || "[[systemUx.errorBoundary.description]]",
    onDiagnostic
  });
  const resolvedRetryLabel = resolveI18nText({
    i18n,
    key: retryLabelKey,
    fallback: retryLabel || "[[systemUx.errorBoundary.retry]]",
    onDiagnostic
  });

  const handleRetry = () => {
    if (disabledByState) {
      return;
    }

    setCapturedError(null);
    setBoundaryVersion((prev) => prev + 1);

    if (typeof onRetry === "function") {
      onRetry(effectiveError);
    }

    if (typeof onDiagnostic === "function") {
      onDiagnostic(
        createObservationRecord({
          traceId,
          component: "error-boundary",
          action: "retry",
          error: effectiveError,
          durationMs: 0
        })
      );
    }
  };

  const handleCapturedError = (rawError, errorInfo) => {
    const startedAt = Date.now();
    const normalized = toStandardError(rawError, "SYSTEM_UX_ERROR_BOUNDARY_CAUGHT");
    setCapturedError(normalized);

    if (typeof onError === "function") {
      onError(normalized, errorInfo);
    }

    if (typeof onDiagnostic === "function") {
      onDiagnostic(
        createObservationRecord({
          traceId,
          component: "error-boundary",
          action: "capture",
          error: normalized,
          durationMs: Date.now() - startedAt
        })
      );
    }
  };

  const fallbackContent =
    typeof fallback === "function"
      ? fallback({
          error: effectiveError,
          retry: handleRetry,
          state,
          title: resolvedTitle,
          description: resolvedDescription,
          retryLabel: resolvedRetryLabel
        })
      : fallback;

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("error-boundary", "root", state),
      ...handlers,
      ref,
      role: effectiveError ? "alert" : "region",
      "aria-label": resolvedAriaLabel,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    effectiveError
      ? fallbackContent ||
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "h2",
              createScopeAttributes("error-boundary", "title", state),
              resolvedTitle
            ),
            React.createElement(
              "p",
              createScopeAttributes("error-boundary", "description", state),
              resolvedDescription
            ),
            showErrorMessage
              ? React.createElement(
                  "p",
                  createScopeAttributes("error-boundary", "description", state),
                  effectiveError.message
                )
              : null,
            React.createElement(
              "button",
              {
                ...createScopeAttributes("error-boundary", "action", state),
                type: "button",
                disabled: disabledByState,
                onClick: handleRetry
              },
              resolvedRetryLabel
            )
          )
      : React.createElement(
          ChipsErrorBoundaryKernel,
          {
            key: String(boundaryVersion),
            onCapturedError: handleCapturedError
          },
          children
        ),
    effectiveError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("error-boundary", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          effectiveError.message
        )
      : null
  );
});

ChipsErrorBoundary.displayName = "ChipsErrorBoundary";

export const ChipsSkeleton = React.forwardRef((props, ref) => {
  const {
    lines = 3,
    animated = true,
    shape = "line",
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    ariaLabelKey = "systemUx.skeleton.ariaLabel",
    i18n,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const count = Number.isInteger(lines) && lines > 0 ? lines : 3;

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: ariaLabelKey,
    fallback: ariaLabel || "[[systemUx.skeleton.ariaLabel]]",
    onDiagnostic
  });

  return React.createElement(
    "div",
    {
      ...createScopeAttributes("skeleton", "root", state),
      ...handlers,
      ref,
      role: "status",
      "aria-label": resolvedAriaLabel,
      "aria-busy": "true",
      "aria-disabled": disabledByState ? "true" : undefined,
      "data-shape": shape,
      "data-animated": String(animated === true)
    },
    Array.from({ length: count }).map((_, index) =>
      React.createElement("span", {
        ...createScopeAttributes("skeleton", "item", state),
        key: `skeleton-item-${index}`,
        "aria-hidden": "true",
        "data-shape": shape
      })
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("skeleton", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsSkeleton.displayName = "ChipsSkeleton";

export const ChipsLoadingBoundary = React.forwardRef((props, ref) => {
  const {
    children,
    loading = false,
    delayMs,
    skeletonLines,
    fallback,
    disabled = false,
    error = null,
    ariaLabel,
    ariaLabelKey = "systemUx.loadingBoundary.ariaLabel",
    loadingText,
    loadingTextKey = "systemUx.loadingBoundary.status",
    i18n,
    configSource,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [visibleLoading, setVisibleLoading] = React.useState(false);

  const resolvedDelay = resolveConfigValue({
    configSource,
    key: "systemUx.loadingBoundary.delayMs",
    defaultValue: parsePositiveInteger(delayMs) || 120,
    parser: parsePositiveInteger,
    onDiagnostic
  });
  const resolvedSkeletonLines = resolveConfigValue({
    configSource,
    key: "systemUx.loadingBoundary.skeletonLines",
    defaultValue: parsePositiveInteger(skeletonLines) || 3,
    parser: parsePositiveInteger,
    onDiagnostic
  });

  React.useEffect(() => {
    if (!loading) {
      setVisibleLoading(false);
      return undefined;
    }

    if (resolvedDelay <= 0) {
      setVisibleLoading(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setVisibleLoading(true);
    }, resolvedDelay);

    return () => clearTimeout(timer);
  }, [loading, resolvedDelay]);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading: loading && visibleLoading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: ariaLabelKey,
    fallback: ariaLabel || "[[systemUx.loadingBoundary.ariaLabel]]",
    onDiagnostic
  });
  const resolvedLoadingText = resolveI18nText({
    i18n,
    key: loadingTextKey,
    fallback: loadingText || "[[systemUx.loadingBoundary.status]]",
    onDiagnostic
  });

  const fallbackContent =
    typeof fallback === "function"
      ? fallback({ state, loading: loading && visibleLoading })
      : fallback;

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("loading-boundary", "root", state),
      ...handlers,
      ref,
      role: "region",
      "aria-label": resolvedAriaLabel,
      "aria-busy": loading ? "true" : "false",
      "aria-disabled": disabledByState ? "true" : undefined
    },
    loading && visibleLoading
      ? React.createElement(
          "div",
          createScopeAttributes("loading-boundary", "fallback", state),
          fallbackContent ||
            React.createElement(ChipsSkeleton, {
              lines: resolvedSkeletonLines,
              loading: true,
              i18n,
              onDiagnostic
            })
        )
      : React.createElement(
          "div",
          createScopeAttributes("loading-boundary", "content", state),
          children
        ),
    loading
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("loading-boundary", "status", state),
            ...createAriaStatusProps({ live: "polite" })
          },
          resolvedLoadingText
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("loading-boundary", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsLoadingBoundary.displayName = "ChipsLoadingBoundary";

export const ChipsEmptyState = React.forwardRef((props, ref) => {
  const {
    icon,
    title,
    titleKey = "systemUx.emptyState.title",
    description,
    descriptionKey = "systemUx.emptyState.description",
    actionLabel,
    actionLabelKey = "systemUx.emptyState.action",
    children,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    i18n,
    onAction,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: "systemUx.emptyState.ariaLabel",
    fallback: ariaLabel || "[[systemUx.emptyState.ariaLabel]]",
    onDiagnostic
  });
  const resolvedTitle = resolveI18nText({
    i18n,
    key: titleKey,
    fallback: title || "[[systemUx.emptyState.title]]",
    onDiagnostic
  });
  const resolvedDescription = resolveI18nText({
    i18n,
    key: descriptionKey,
    fallback: description || "[[systemUx.emptyState.description]]",
    onDiagnostic
  });
  const resolvedActionLabel = resolveI18nText({
    i18n,
    key: actionLabelKey,
    fallback: actionLabel || "[[systemUx.emptyState.action]]",
    onDiagnostic
  });

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("empty-state", "root", state),
      ...handlers,
      ref,
      role: "region",
      "aria-label": resolvedAriaLabel,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    icon
      ? React.createElement(
          "div",
          createScopeAttributes("empty-state", "icon", state),
          icon
        )
      : null,
    React.createElement(
      "h2",
      createScopeAttributes("empty-state", "title", state),
      resolvedTitle
    ),
    React.createElement(
      "p",
      createScopeAttributes("empty-state", "description", state),
      resolvedDescription
    ),
    children
      ? React.createElement(
          "div",
          createScopeAttributes("empty-state", "description", state),
          children
        )
      : null,
    typeof onAction === "function"
      ? React.createElement(
          "button",
          {
            ...createScopeAttributes("empty-state", "action", state),
            type: "button",
            disabled: disabledByState,
            onClick: onAction
          },
          resolvedActionLabel
        )
      : null,
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("empty-state", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsEmptyState.displayName = "ChipsEmptyState";

export const ChipsNotification = React.forwardRef((props, ref) => {
  const {
    items,
    defaultItems = [],
    maxVisible,
    defaultDurationMs,
    closeButtonLabel,
    closeButtonLabelKey = "systemUx.notification.close",
    closeIconContent,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    i18n,
    configSource,
    traceId,
    onItemsChange,
    onDismiss,
    onAction,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentItems, setCurrentItems] = useControllableState({
    value: items,
    defaultValue: defaultItems,
    onChange: onItemsChange
  });

  const resolvedMaxVisible = resolveConfigValue({
    configSource,
    key: "systemUx.notification.maxVisible",
    defaultValue: parsePositiveInteger(maxVisible) || 3,
    parser: parsePositiveInteger,
    onDiagnostic
  });
  const resolvedDefaultDuration = resolveConfigValue({
    configSource,
    key: "systemUx.notification.defaultDurationMs",
    defaultValue: parsePositiveInteger(defaultDurationMs) || 5000,
    parser: parsePositiveInteger,
    onDiagnostic
  });
  const normalizedItems = React.useMemo(
    () => normalizeSystemMessageItems(currentItems, "notification"),
    [currentItems]
  );
  const visibleItems = React.useMemo(
    () =>
      resolveSystemMessageQueue({
        items: normalizedItems,
        idPrefix: "notification",
        maxVisible: resolvedMaxVisible,
        defaultDurationMs: resolvedDefaultDuration
      }),
    [normalizedItems, resolvedDefaultDuration, resolvedMaxVisible]
  );

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: "systemUx.notification.ariaLabel",
    fallback: ariaLabel || "[[systemUx.notification.ariaLabel]]",
    onDiagnostic
  });
  const resolvedCloseLabel = resolveI18nText({
    i18n,
    key: closeButtonLabelKey,
    fallback: closeButtonLabel || "[[systemUx.notification.close]]",
    onDiagnostic
  });

  const dismissItem = React.useCallback(
    (targetId, reason) => {
      const target = normalizedItems.find((item) => item.id === targetId);
      if (!target) {
        return;
      }

      const nextItems = dismissSystemMessage(normalizedItems, targetId);
      setCurrentItems(nextItems);

      if (typeof onDismiss === "function") {
        onDismiss(target, reason);
      }

      if (typeof onDiagnostic === "function") {
        onDiagnostic(
          createObservationRecord({
            traceId,
            component: "notification",
            action: reason || "dismiss",
            error: null,
            durationMs: 0
          })
        );
      }
    },
    [normalizedItems, onDiagnostic, onDismiss, setCurrentItems, traceId]
  );

  React.useEffect(() => {
    if (disabledByState || visibleItems.length === 0) {
      return undefined;
    }

    const timers = [];
    for (const item of visibleItems) {
      const durationMs = item.effectiveDurationMs;
      if (!durationMs || durationMs <= 0) {
        continue;
      }

      const timer = setTimeout(() => {
        dismissItem(item.id, "timeout");
      }, durationMs);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [disabledByState, dismissItem, visibleItems]);

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("notification", "root", state),
      ...handlers,
      ref,
      role: "region",
      "aria-label": resolvedAriaLabel,
      "aria-disabled": disabledByState ? "true" : undefined
    },
    React.createElement(
      "ul",
      createScopeAttributes("notification", "list", state),
      visibleItems.map((item) =>
        React.createElement(
          "li",
          {
            ...createScopeAttributes("notification", "item", state),
            key: item.id,
            role: item.tone === "error" ? "alert" : "status",
            "data-tone": item.tone
          },
          item.title
            ? React.createElement(
                "div",
                createScopeAttributes("notification", "title", state),
                item.title
              )
            : null,
          item.message
            ? React.createElement(
                "div",
                createScopeAttributes("notification", "message", state),
                item.message
              )
            : null,
          React.createElement(
            "div",
            createScopeAttributes("notification", "action", state),
            item.actionLabel || item.actionKey
              ? React.createElement(
                  "button",
                  {
                    ...createScopeAttributes("notification", "action", state),
                    type: "button",
                    disabled: disabledByState,
                    onClick: () => {
                      if (typeof onAction === "function") {
                        onAction(item);
                      }
                    }
                  },
                  resolveI18nText({
                    i18n,
                    key: item.actionKey,
                    fallback: item.actionLabel || "[[systemUx.notification.action]]",
                    onDiagnostic
                  })
                )
              : null,
            React.createElement(
              "button",
              {
                ...createScopeAttributes("notification", "close", state),
                type: "button",
                "aria-label": resolvedCloseLabel,
                disabled: disabledByState,
                onClick: () => dismissItem(item.id, "manual")
              },
              resolveIconContent(closeIconContent, "close")
            )
          )
        )
      )
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("notification", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsNotification.displayName = "ChipsNotification";

export const ChipsToast = React.forwardRef((props, ref) => {
  const {
    entries,
    defaultEntries = [],
    maxStack,
    defaultDurationMs,
    placement = "bottom-right",
    closeButtonLabel,
    closeButtonLabelKey = "systemUx.toast.close",
    closeIconContent,
    disabled = false,
    loading = false,
    error = null,
    ariaLabel,
    i18n,
    configSource,
    traceId,
    onEntriesChange,
    onDismiss,
    onAction,
    onStateChange,
    onDiagnostic
  } = props;

  const normalizedError = normalizeError(error);
  const disabledByState = disabled || loading;
  const { interaction, handlers } = useInteractiveState(disabledByState);
  const [currentEntries, setCurrentEntries] = useControllableState({
    value: entries,
    defaultValue: defaultEntries,
    onChange: onEntriesChange
  });

  const resolvedMaxStack = resolveConfigValue({
    configSource,
    key: "systemUx.toast.maxStack",
    defaultValue: parsePositiveInteger(maxStack) || 3,
    parser: parsePositiveInteger,
    onDiagnostic
  });
  const resolvedDefaultDuration = resolveConfigValue({
    configSource,
    key: "systemUx.toast.defaultDurationMs",
    defaultValue: parsePositiveInteger(defaultDurationMs) || 3500,
    parser: parsePositiveInteger,
    onDiagnostic
  });
  const normalizedEntries = React.useMemo(
    () => normalizeSystemMessageItems(currentEntries, "toast"),
    [currentEntries]
  );
  const visibleEntries = React.useMemo(
    () =>
      resolveSystemMessageQueue({
        items: normalizedEntries,
        idPrefix: "toast",
        maxVisible: resolvedMaxStack,
        defaultDurationMs: resolvedDefaultDuration
      }),
    [normalizedEntries, resolvedDefaultDuration, resolvedMaxStack]
  );

  const state = resolveInteractiveState({
    disabled: disabledByState,
    loading,
    error: normalizedError,
    interaction
  });

  React.useEffect(() => {
    if (typeof onStateChange === "function") {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  const resolvedAriaLabel = resolveI18nText({
    i18n,
    key: "systemUx.toast.ariaLabel",
    fallback: ariaLabel || "[[systemUx.toast.ariaLabel]]",
    onDiagnostic
  });
  const resolvedCloseLabel = resolveI18nText({
    i18n,
    key: closeButtonLabelKey,
    fallback: closeButtonLabel || "[[systemUx.toast.close]]",
    onDiagnostic
  });

  const dismissEntry = React.useCallback(
    (targetId, reason) => {
      const target = normalizedEntries.find((item) => item.id === targetId);
      if (!target) {
        return;
      }

      const nextEntries = dismissSystemMessage(normalizedEntries, targetId);
      setCurrentEntries(nextEntries);

      if (typeof onDismiss === "function") {
        onDismiss(target, reason);
      }

      if (typeof onDiagnostic === "function") {
        onDiagnostic(
          createObservationRecord({
            traceId,
            component: "toast",
            action: reason || "dismiss",
            durationMs: 0
          })
        );
      }
    },
    [normalizedEntries, onDiagnostic, onDismiss, setCurrentEntries, traceId]
  );

  React.useEffect(() => {
    if (disabledByState || visibleEntries.length === 0) {
      return undefined;
    }

    const timers = [];
    for (const entry of visibleEntries) {
      const durationMs = entry.effectiveDurationMs;
      if (!durationMs || durationMs <= 0) {
        continue;
      }
      const timer = setTimeout(() => {
        dismissEntry(entry.id, "timeout");
      }, durationMs);
      timers.push(timer);
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [disabledByState, dismissEntry, visibleEntries]);

  return React.createElement(
    "section",
    {
      ...createScopeAttributes("toast", "root", state),
      ...handlers,
      ref,
      role: "status",
      "aria-label": resolvedAriaLabel,
      "aria-disabled": disabledByState ? "true" : undefined,
      "data-placement": placement
    },
    React.createElement(
      "ul",
      createScopeAttributes("toast", "list", state),
      visibleEntries.map((entry) =>
        React.createElement(
          "li",
          {
            ...createScopeAttributes("toast", "item", state),
            key: entry.id,
            role: entry.tone === "error" ? "alert" : "status",
            "data-tone": entry.tone
          },
          React.createElement(
            "span",
            createScopeAttributes("toast", "message", state),
            entry.message || entry.title || ""
          ),
          React.createElement(
            "div",
            createScopeAttributes("toast", "action", state),
            entry.actionLabel || entry.actionKey
              ? React.createElement(
                  "button",
                  {
                    ...createScopeAttributes("toast", "action", state),
                    type: "button",
                    disabled: disabledByState,
                    onClick: () => {
                      if (typeof onAction === "function") {
                        onAction(entry);
                      }
                    }
                  },
                  resolveI18nText({
                    i18n,
                    key: entry.actionKey,
                    fallback: entry.actionLabel || "[[systemUx.toast.action]]",
                    onDiagnostic
                  })
                )
              : null,
            React.createElement(
              "button",
              {
                ...createScopeAttributes("toast", "close", state),
                type: "button",
                "aria-label": resolvedCloseLabel,
                disabled: disabledByState,
                onClick: () => dismissEntry(entry.id, "manual")
              },
              resolveIconContent(closeIconContent, "close")
            )
          )
        )
      )
    ),
    normalizedError
      ? React.createElement(
          "span",
          {
            ...createScopeAttributes("toast", "status", state),
            ...createAriaStatusProps({ live: "assertive" })
          },
          normalizedError.message
        )
      : null
  );
});

ChipsToast.displayName = "ChipsToast";

export function validateComponentA11y(component, props) {
  if (component === "button") {
    assertAriaProps(props, {
      role: "button",
      requireLabel: true
    });
    return true;
  }

  if (component === "checkbox") {
    assertAriaProps(props, {
      role: "checkbox",
      requireLabel: true
    });
    return true;
  }

  if (component === "input") {
    assertAriaProps(props, {
      requireLabel: true
    });
    return true;
  }

  if (component === "radio") {
    assertAriaProps(props, {
      role: "radio",
      requireLabel: true
    });
    return true;
  }

  if (component === "switch") {
    assertAriaProps(props, {
      role: "switch",
      requireLabel: true
    });
    return true;
  }

  if (component === "select") {
    assertAriaProps(props, {
      role: "button",
      requireLabel: true,
      requireControlsWhenExpanded: true
    });
    return true;
  }

  if (component === "dialog") {
    assertAriaProps(props, {
      role: "button",
      requireLabel: true,
      requireControlsWhenExpanded: true
    });
    return true;
  }

  if (component === "popover") {
    assertAriaProps(props, {
      role: "button",
      requireLabel: true,
      requireControlsWhenExpanded: true
    });
    return true;
  }

  if (component === "tabs") {
    assertAriaProps(props, {
      role: "tab",
      requireLabel: true
    });
    return true;
  }

  if (component === "menu") {
    assertAriaProps(props, {
      role: "button",
      requireLabel: true,
      requireControlsWhenExpanded: true
    });
    return true;
  }

  if (component === "tooltip") {
    assertAriaProps(props, {
      role: "tooltip"
    });
    return true;
  }

  if (component === "form-field") {
    assertAriaProps(props, {
      requireLabel: true
    });
    return true;
  }

  if (component === "form-group") {
    assertAriaProps(props, {
      role: "group",
      requireLabel: true
    });
    return true;
  }

  if (component === "virtual-list") {
    assertAriaProps(props, {
      role: "list",
      requireLabel: true
    });
    return true;
  }

  if (component === "data-grid") {
    assertAriaProps(props, {
      role: "grid",
      requireLabel: true
    });
    return true;
  }

  if (component === "tree") {
    assertAriaProps(props, {
      role: "tree",
      requireLabel: true
    });
    return true;
  }

  if (component === "date-time") {
    assertAriaProps(props, {
      requireLabel: true
    });
    return true;
  }

  if (component === "command-palette") {
    assertAriaProps(props, {
      role: "combobox",
      requireLabel: true,
      requireControlsWhenExpanded: true
    });
    return true;
  }

  if (component === "split-pane") {
    assertAriaProps(props, {
      role: "group",
      requireLabel: true
    });
    return true;
  }

  if (component === "dock-panel") {
    assertAriaProps(props, {
      role: "tablist",
      requireLabel: true
    });
    return true;
  }

  if (component === "inspector") {
    assertAriaProps(props, {
      role: "complementary",
      requireLabel: true
    });
    return true;
  }

  if (component === "panel-header") {
    assertAriaProps(props, {
      role: "group",
      requireLabel: true
    });
    return true;
  }

  if (component === "card-shell") {
    assertAriaProps(props, {
      role: "article",
      requireLabel: true
    });
    return true;
  }

  if (component === "tool-window") {
    assertAriaProps(props, {
      role: "dialog",
      requireLabel: true
    });
    return true;
  }

  if (component === "error-boundary") {
    assertAriaProps(props, {
      requireLabel: true
    });
    return true;
  }

  if (component === "loading-boundary") {
    assertAriaProps(props, {
      role: "region",
      requireLabel: true
    });
    return true;
  }

  if (component === "notification") {
    assertAriaProps(props, {
      role: "region",
      requireLabel: true
    });
    return true;
  }

  if (component === "toast") {
    assertAriaProps(props, {
      role: "status",
      requireLabel: true
    });
    return true;
  }

  if (component === "empty-state") {
    assertAriaProps(props, {
      role: "region",
      requireLabel: true
    });
    return true;
  }

  if (component === "skeleton") {
    assertAriaProps(props, {
      role: "status",
      requireLabel: true
    });
    return true;
  }

  throw new Error(`COMPONENT_A11Y_RULE_MISSING:${component}`);
}

export const P0_BASE_INTERACTIVE_COMPONENTS = [
  createComponentMeta({
    name: "ChipsButton",
    scope: "button",
    parts: ["root", "label", "spinner", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsInput",
    scope: "input",
    parts: ["root", "control", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsCheckbox",
    scope: "checkbox",
    parts: ["root", "control", "indicator", "label", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsRadioGroup",
    scope: "radio",
    parts: ["root", "item", "control", "indicator", "label", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsSwitch",
    scope: "switch",
    parts: ["root", "track", "thumb", "label", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsSelect",
    scope: "select",
    parts: ["root", "trigger", "value", "icon", "list", "option", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsDialog",
    scope: "dialog",
    parts: [
      "root",
      "trigger",
      "backdrop",
      "content",
      "title",
      "description",
      "close",
      "status"
    ],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsPopover",
    scope: "popover",
    parts: ["root", "trigger", "positioner", "content", "arrow", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsTabs",
    scope: "tabs",
    parts: ["root", "list", "trigger", "panel", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsMenu",
    scope: "menu",
    parts: ["root", "trigger", "content", "item", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsTooltip",
    scope: "tooltip",
    parts: ["root", "trigger", "content", "arrow", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  })
];

export const P0_DATA_FORM_COMPONENTS = [
  createComponentMeta({
    name: "ChipsFormField",
    scope: "form-field",
    parts: ["root", "label", "control", "helper", "error", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsFormGroup",
    scope: "form-group",
    parts: ["root", "legend", "description", "content", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsVirtualList",
    scope: "virtual-list",
    parts: ["root", "viewport", "content", "item", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  })
];

export const STAGE7_DATA_ADVANCED_COMPONENTS = [
  createComponentMeta({
    name: "ChipsDataGrid",
    scope: "data-grid",
    parts: ["root", "table", "header", "row", "cell", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsTree",
    scope: "tree",
    parts: ["root", "node", "toggle", "label", "children", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsDateTime",
    scope: "date-time",
    parts: ["root", "input", "icon", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsCommandPalette",
    scope: "command-palette",
    parts: ["root", "trigger", "search", "list", "item", "shortcut", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  })
];

export const STAGE7_WORKBENCH_COMPONENTS = [
  createComponentMeta({
    name: "ChipsSplitPane",
    scope: "split-pane",
    parts: ["root", "pane-start", "resizer", "pane-end", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsDockPanel",
    scope: "dock-panel",
    parts: ["root", "tab-list", "tab", "content", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsInspector",
    scope: "inspector",
    parts: ["root", "section", "header", "body", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsPanelHeader",
    scope: "panel-header",
    parts: ["root", "title", "subtitle", "actions", "toggle", "close", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsCardShell",
    scope: "card-shell",
    parts: ["root", "header", "toolbar", "content", "footer", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsToolWindow",
    scope: "tool-window",
    parts: ["root", "header", "controls", "body", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  })
];

export const STAGE8_SYSTEM_UX_COMPONENTS = [
  createComponentMeta({
    name: "ChipsErrorBoundary",
    scope: "error-boundary",
    parts: ["root", "title", "description", "action", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsLoadingBoundary",
    scope: "loading-boundary",
    parts: ["root", "content", "fallback", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsNotification",
    scope: "notification",
    parts: ["root", "list", "item", "title", "message", "action", "close", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsToast",
    scope: "toast",
    parts: ["root", "list", "item", "message", "action", "close", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsEmptyState",
    scope: "empty-state",
    parts: ["root", "icon", "title", "description", "action", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  }),
  createComponentMeta({
    name: "ChipsSkeleton",
    scope: "skeleton",
    parts: ["root", "item", "status"],
    states: [...INTERACTIVE_STATE_PRIORITY]
  })
];
