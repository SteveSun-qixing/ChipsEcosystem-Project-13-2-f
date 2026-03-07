export function assertHasContractAttrs(nodeAttrs) {
  const required = ["data-scope", "data-part", "data-state"];
  for (const key of required) {
    if (!Object.hasOwn(nodeAttrs, key)) {
      throw new Error(`TEST_CONTRACT_ATTR_MISSING:${key}`);
    }
  }
  return true;
}

export function createComponentFixture(options = {}) {
  const {
    scope = "component",
    part = "root",
    state = "idle",
    role = "region",
    ariaLabel = "fixture"
  } = options;

  return {
    "data-scope": scope,
    "data-part": part,
    "data-state": state,
    role,
    "aria-label": ariaLabel
  };
}

export function assertAriaRole(nodeAttrs, expectedRole) {
  if (!nodeAttrs || typeof nodeAttrs !== "object") {
    throw new Error("TEST_ARIA_NODE_INVALID");
  }

  if (nodeAttrs.role !== expectedRole) {
    throw new Error(`TEST_ARIA_ROLE_MISMATCH:${expectedRole}`);
  }

  return true;
}

export function assertStatePriority(state, priorityList) {
  if (typeof state !== "string" || state.length === 0) {
    throw new Error("TEST_STATE_INVALID");
  }

  if (!Array.isArray(priorityList) || priorityList.length === 0) {
    throw new Error("TEST_PRIORITY_LIST_INVALID");
  }

  if (!priorityList.includes(state)) {
    throw new Error(`TEST_STATE_NOT_IN_PRIORITY:${state}`);
  }

  return true;
}

export function createThemeFallbackFixture(overrides = {}) {
  return {
    global: {},
    app: {},
    box: {},
    "composite-card": {},
    "base-card": {},
    component: {},
    ...overrides
  };
}

export function resolveFallbackScopeValue(fixture, key) {
  const chain = ["component", "base-card", "composite-card", "box", "app", "global"];
  const source = fixture && typeof fixture === "object" ? fixture : {};
  for (const scope of chain) {
    const tokenMap = source[scope];
    if (tokenMap && Object.hasOwn(tokenMap, key)) {
      return {
        scope,
        value: tokenMap[key]
      };
    }
  }
  return null;
}

export function injectFault(type, payload = {}) {
  return {
    type,
    payload
  };
}
