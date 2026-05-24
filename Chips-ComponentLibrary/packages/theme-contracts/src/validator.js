import fs from "node:fs";
import path from "node:path";

export const THEME_CONTRACT_SCHEMA_VERSION = "1.0.0";
const IFRAME_CONTRACT_COMPONENTS = new Set(["card-cover-frame", "composite-card-window"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "归档") {
        continue;
      }
      files.push(...walkJsonFiles(target));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(target);
    }
  }
  return files.sort();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function flattenTokens(tokenTree) {
  const out = {};

  const walk = (value, keys) => {
    if (isObject(value)) {
      for (const [key, next] of Object.entries(value)) {
        walk(next, keys.concat(key));
      }
      return;
    }

    out[keys.join(".")] = value;
  };

  walk(tokenTree, []);
  return out;
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).filter((item) => typeof item === "string" && item.length > 0))];
}

function normalizeTokenKey(component, token) {
  return token.startsWith("chips.") ? token : `chips.comp.${component}.${token}`;
}

function getComponentName(contract) {
  return contract.component ?? contract.name;
}

function getRequiredTokens(contract) {
  const component = getComponentName(contract);
  return uniqueStrings((contract.requiredTokens ?? contract.tokens ?? []).map((token) => normalizeTokenKey(component, token)));
}

function getOptionalTokens(contract) {
  const component = getComponentName(contract);
  return uniqueStrings((contract.optionalTokens ?? []).map((token) => normalizeTokenKey(component, token)));
}

function inferLayer(tokenKey) {
  if (tokenKey.startsWith("chips.comp.")) return "comp";
  if (tokenKey.startsWith("chips.motion.")) return "motion";
  if (tokenKey.startsWith("chips.layout.")) return "layout";
  if (tokenKey.startsWith("chips.sys.")) return "sys";
  if (tokenKey.startsWith("chips.ref.")) return "ref";
  return undefined;
}

function inferLocation(tokenKey, states = []) {
  const layer = inferLayer(tokenKey);
  if (!tokenKey.startsWith("chips.comp.")) {
    return { layer };
  }
  const [component, part, ...rest] = tokenKey.slice("chips.comp.".length).split(".");
  const state = [...rest].reverse().find((segment) => states.includes(segment));
  return { component, part, state, layer };
}

function createMissingTokenDiagnostic({ themeId, sourceThemeId, component, states, tokenKey, blocking }) {
  const location = inferLocation(tokenKey, states);
  return {
    severity: blocking ? "error" : "warning",
    code: blocking ? "THEME_REQUIRED_TOKEN_MISSING" : "THEME_OPTIONAL_TOKEN_MISSING",
    messageKey: blocking
      ? "theme.diagnostics.requiredTokenMissing"
      : "theme.diagnostics.optionalTokenMissing",
    themeId,
    sourceThemeId: sourceThemeId ?? themeId,
    component,
    part: location.part,
    state: location.state,
    tokenKey,
    layer: location.layer,
    scope: "component",
    suggestionKey: blocking
      ? "theme.suggestions.addRequiredToken"
      : "theme.suggestions.addOptionalToken",
    details: { tokenKey },
    blocking
  };
}

function coverage(covered, total) {
  return total === 0 ? 1 : Number((covered / total).toFixed(4));
}

export function buildThemeDiagnosticSummary(diagnostics, coverageSummary) {
  const bySeverity = { info: 0, warning: 0, error: 0 };
  const byCode = {};

  for (const diagnostic of diagnostics) {
    bySeverity[diagnostic.severity] = (bySeverity[diagnostic.severity] ?? 0) + 1;
    byCode[diagnostic.code] = (byCode[diagnostic.code] ?? 0) + 1;
  }

  const blocking = diagnostics.filter((diagnostic) => diagnostic.blocking).length;
  return {
    total: diagnostics.length,
    blocking,
    bySeverity,
    byCode,
    status: blocking > 0 ? "blocked" : bySeverity.warning > 0 ? "warning" : "complete",
    coverage: coverageSummary
  };
}

export function buildComponentContractView(contract, flatTokenMap, options = {}) {
  if (!isObject(contract)) {
    throw new Error("THEME_CONTRACT_INVALID:object");
  }

  const component = getComponentName(contract);
  const parts = uniqueStrings(contract.parts);
  const states = uniqueStrings(contract.states);
  const requiredTokens = getRequiredTokens(contract);
  const optionalTokens = getOptionalTokens(contract);
  const missingRequired = requiredTokens.filter((tokenKey) => !Object.hasOwn(flatTokenMap, tokenKey));
  const missingOptional = optionalTokens.filter((tokenKey) => !Object.hasOwn(flatTokenMap, tokenKey));
  const diagnostics = [
    ...missingRequired.map((tokenKey) =>
      createMissingTokenDiagnostic({
        themeId: options.themeId,
        sourceThemeId: options.sourceThemeId,
        component,
        states,
        tokenKey,
        blocking: true
      })
    ),
    ...missingOptional.map((tokenKey) =>
      createMissingTokenDiagnostic({
        themeId: options.themeId,
        sourceThemeId: options.sourceThemeId,
        component,
        states,
        tokenKey,
        blocking: false
      })
    )
  ];

  const coveredRequiredTokenCount = requiredTokens.length - missingRequired.length;
  const coveredOptionalTokenCount = optionalTokens.length - missingOptional.length;

  return {
    component,
    scope: contract.scope,
    parts,
    states,
    requiredTokens,
    optionalTokens,
    a11yConstraints: Array.isArray(contract.a11yConstraints) ? contract.a11yConstraints : [],
    motionConstraints: Array.isArray(contract.motionConstraints) ? contract.motionConstraints : [],
    coverage: {
      requiredTokenCount: requiredTokens.length,
      coveredRequiredTokenCount,
      missingRequiredTokenCount: missingRequired.length,
      optionalTokenCount: optionalTokens.length,
      coveredOptionalTokenCount,
      missingOptionalTokenCount: missingOptional.length,
      requiredCoverage: coverage(coveredRequiredTokenCount, requiredTokens.length),
      optionalCoverage: coverage(coveredOptionalTokenCount, optionalTokens.length),
      status: missingRequired.length > 0 ? "blocked" : missingOptional.length > 0 ? "warning" : "complete"
    },
    diagnostics
  };
}

export function buildThemeContractView(contract, tokenTree, options = {}) {
  if (!isObject(contract) || !Array.isArray(contract.components)) {
    throw new Error("THEME_CONTRACT_INVALID:components");
  }

  const flatTokenMap = flattenTokens(tokenTree);
  const components = contract.components
    .filter((component) => !options.component || getComponentName(component) === options.component)
    .map((component) => buildComponentContractView(component, flatTokenMap, options));
  const diagnostics = components.flatMap((component) => component.diagnostics);
  const coverageSummary = {
    componentCount: components.length,
    coveredComponentCount: components.filter((component) => component.coverage.status !== "blocked").length,
    requiredTokenCount: components.reduce((sum, component) => sum + component.coverage.requiredTokenCount, 0),
    coveredRequiredTokenCount: components.reduce((sum, component) => sum + component.coverage.coveredRequiredTokenCount, 0),
    missingRequiredTokenCount: components.reduce((sum, component) => sum + component.coverage.missingRequiredTokenCount, 0),
    optionalTokenCount: components.reduce((sum, component) => sum + component.coverage.optionalTokenCount, 0),
    coveredOptionalTokenCount: components.reduce((sum, component) => sum + component.coverage.coveredOptionalTokenCount, 0),
    missingOptionalTokenCount: components.reduce((sum, component) => sum + component.coverage.missingOptionalTokenCount, 0),
    requiredCoverage: 1,
    optionalCoverage: 1
  };
  coverageSummary.requiredCoverage = coverage(
    coverageSummary.coveredRequiredTokenCount,
    coverageSummary.requiredTokenCount
  );
  coverageSummary.optionalCoverage = coverage(
    coverageSummary.coveredOptionalTokenCount,
    coverageSummary.optionalTokenCount
  );

  return {
    schemaVersion: THEME_CONTRACT_SCHEMA_VERSION,
    themeId: options.themeId ?? "unknown",
    themeVersion: options.themeVersion ?? "0",
    contractVersion: contract.contractVersion ?? contract.version ?? "0",
    components,
    summary: buildThemeDiagnosticSummary(diagnostics, coverageSummary)
  };
}

export function validateComponentContract(contract, flatTokenMap) {
  if (!isObject(contract)) {
    throw new Error("THEME_CONTRACT_INVALID:object");
  }

  const component = getComponentName(contract);
  if (typeof component !== "string" || component.length === 0) {
    throw new Error("THEME_CONTRACT_INVALID:component");
  }
  if (typeof contract.scope !== "string" || contract.scope.length === 0) {
    throw new Error("THEME_CONTRACT_INVALID:scope");
  }

  const requiredArrayFields = ["parts", "states"];
  for (const field of requiredArrayFields) {
    if (!Array.isArray(contract[field]) || contract[field].length === 0) {
      throw new Error(`THEME_CONTRACT_INVALID:${field}`);
    }
  }

  const requiredTokens = getRequiredTokens(contract);
  if (requiredTokens.length === 0) {
    throw new Error("THEME_CONTRACT_INVALID:requiredTokens");
  }

  if (isObject(contract.iframe)) {
    if (!IFRAME_CONTRACT_COMPONENTS.has(component)) {
      throw new Error("THEME_CONTRACT_INVALID:iframe.disallowed");
    }
    if (contract.iframe.requiredSandbox !== true) {
      throw new Error("THEME_CONTRACT_INVALID:iframe.requiredSandbox");
    }
  } else if (IFRAME_CONTRACT_COMPONENTS.has(component)) {
    throw new Error("THEME_CONTRACT_INVALID:iframe.requiredSandbox");
  }

  for (const tokenKey of requiredTokens) {
    if (!Object.hasOwn(flatTokenMap, tokenKey)) {
      throw new Error(`THEME_CONTRACT_TOKEN_MISSING:${tokenKey}`);
    }
  }

  return true;
}

export function validateContractDirectory(contractDir, tokenTree) {
  const files = walkJsonFiles(contractDir);
  const flatTokenMap = flattenTokens(tokenTree);

  for (const filePath of files) {
    const contract = readJson(filePath);
    validateComponentContract(contract, flatTokenMap);
  }

  return files;
}
