export function isKeyboardActivationKey(key) {
  return key === "Enter" || key === " ";
}

export function isKeyboardNavigationKey(key) {
  return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End";
}

export function getKeyboardIntent(key) {
  if (isKeyboardActivationKey(key)) {
    return "activate";
  }

  if (key === "Escape") {
    return "dismiss";
  }

  if (key === "Tab" || isKeyboardNavigationKey(key)) {
    return "navigate";
  }

  return "unknown";
}

export function createAriaStatusProps(options = {}) {
  const {
    live = "polite",
    atomic = true
  } = options;

  return {
    "aria-live": live,
    "aria-atomic": atomic ? "true" : "false",
    role: "status"
  };
}

export function buildAriaDescribedBy(ids) {
  if (!Array.isArray(ids)) {
    return "";
  }

  const filtered = [];
  const seen = new Set();

  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    filtered.push(id);
  }

  return filtered.join(" ");
}

export function validateAriaProps(props = {}, rules = {}) {
  const issues = [];

  if (rules.requireLabel === true) {
    const hasLabel = typeof props["aria-label"] === "string" && props["aria-label"].length > 0;
    const hasLabelledBy = typeof props["aria-labelledby"] === "string" && props["aria-labelledby"].length > 0;
    if (!hasLabel && !hasLabelledBy) {
      issues.push({
        code: "A11Y_LABEL_MISSING",
        message: "Either aria-label or aria-labelledby is required."
      });
    }
  }

  if (typeof rules.role === "string") {
    if (props.role !== rules.role) {
      issues.push({
        code: "A11Y_ROLE_INVALID",
        message: `Expected role ${rules.role}.`
      });
    }
  }

  if (rules.requireControlsWhenExpanded === true && props["aria-expanded"] === "true") {
    if (typeof props["aria-controls"] !== "string" || props["aria-controls"].length === 0) {
      issues.push({
        code: "A11Y_ARIA_CONTROLS_MISSING",
        message: "aria-controls is required when aria-expanded is true."
      });
    }
  }

  return issues;
}

export function assertAriaProps(props, rules) {
  const issues = validateAriaProps(props, rules);
  if (issues.length > 0) {
    const first = issues[0];
    const error = new Error(first.message);
    error.code = first.code;
    error.details = issues;
    throw error;
  }
  return true;
}

export function isFocusableElement(node) {
  if (!node || typeof node !== "object") {
    return false;
  }

  if (node.disabled === true || node.hidden === true || node.inert === true) {
    return false;
  }

  if (node["aria-disabled"] === "true") {
    return false;
  }

  if (typeof node.tabIndex === "number" && node.tabIndex < 0) {
    return false;
  }

  if (typeof node.focus !== "function") {
    return false;
  }

  return true;
}

export function getFocusableElements(root) {
  if (!root) {
    return [];
  }

  if (Array.isArray(root)) {
    return root.filter((item) => isFocusableElement(item));
  }

  if (typeof root.querySelectorAll === "function") {
    return [...root.querySelectorAll("*")].filter((item) => isFocusableElement(item));
  }

  if (Array.isArray(root.children)) {
    return root.children.filter((item) => isFocusableElement(item));
  }

  return [];
}

export function moveFocus(elements, options = {}) {
  const {
    fromIndex = -1,
    direction = "next",
    loop = true
  } = options;

  if (!Array.isArray(elements) || elements.length === 0) {
    return -1;
  }

  const total = elements.length;
  const step = direction === "prev" ? -1 : 1;
  let index = fromIndex;

  for (let count = 0; count < total; count += 1) {
    index += step;

    if (loop) {
      if (index >= total) {
        index = 0;
      }
      if (index < 0) {
        index = total - 1;
      }
    } else if (index < 0 || index >= total) {
      return -1;
    }

    const target = elements[index];
    if (isFocusableElement(target)) {
      target.focus();
      return index;
    }
  }

  return -1;
}
