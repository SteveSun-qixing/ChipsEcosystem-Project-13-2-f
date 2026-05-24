import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(root, "..");
const componentContractDir = path.join(root, "packages", "theme-contracts", "contracts", "components");
const officialThemeContracts = [
  path.join(workspaceRoot, "ThemePack", "Chips-default", "contracts", "theme-interface.contract.json"),
  path.join(workspaceRoot, "ThemePack", "Chips-theme-default-dark", "contracts", "theme-interface.contract.json")
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortedUnique(values = []) {
  return [...new Set(values)].sort();
}

function compareSets(label, expected, actual) {
  const expectedSet = sortedUnique(expected);
  const actualSet = sortedUnique(actual);
  const missing = expectedSet.filter((item) => !actualSet.includes(item));
  const extra = actualSet.filter((item) => !expectedSet.includes(item));
  if (missing.length === 0 && extra.length === 0) {
    return [];
  }
  return [{ label, missing, extra }];
}

function loadComponentContracts() {
  const contracts = new Map();
  for (const fileName of fs.readdirSync(componentContractDir).sort()) {
    if (!fileName.endsWith(".contract.json")) {
      continue;
    }
    const contract = readJson(path.join(componentContractDir, fileName));
    contracts.set(contract.component, {
      component: contract.component,
      scope: contract.scope,
      parts: sortedUnique(contract.parts),
      states: sortedUnique(contract.states),
      requiredTokens: sortedUnique(contract.tokens || contract.requiredTokens || []),
      optionalTokens: sortedUnique(contract.optionalTokens || [])
    });
  }
  return contracts;
}

function validateThemeContract(themePath, expectedContracts) {
  const theme = readJson(themePath);
  const themeByComponent = new Map(
    (theme.components || []).map((component) => [
      component.component || component.scope,
      {
        component: component.component || component.scope,
        scope: component.scope,
        parts: sortedUnique(component.parts),
        states: sortedUnique(component.states),
        requiredTokens: sortedUnique(component.requiredTokens || component.tokens || []),
        optionalTokens: sortedUnique(component.optionalTokens || [])
      }
    ])
  );
  const failures = [];
  const expectedNames = [...expectedContracts.keys()].sort();
  const actualNames = [...themeByComponent.keys()].sort();

  failures.push(...compareSets("components", expectedNames, actualNames));

  for (const componentName of expectedNames) {
    const expected = expectedContracts.get(componentName);
    const actual = themeByComponent.get(componentName);
    if (!actual) {
      continue;
    }
    if (actual.scope !== expected.scope) {
      failures.push({
        label: `${componentName}.scope`,
        expected: expected.scope,
        actual: actual.scope
      });
    }
    failures.push(...compareSets(`${componentName}.parts`, expected.parts, actual.parts));
    failures.push(...compareSets(`${componentName}.states`, expected.states, actual.states));
    failures.push(...compareSets(`${componentName}.requiredTokens`, expected.requiredTokens, actual.requiredTokens));
    failures.push(...compareSets(`${componentName}.optionalTokens`, expected.optionalTokens, actual.optionalTokens));
  }

  return failures;
}

const expectedContracts = loadComponentContracts();
const allFailures = [];

for (const themePath of officialThemeContracts) {
  const failures = validateThemeContract(themePath, expectedContracts);
  if (failures.length > 0) {
    allFailures.push({
      theme: path.relative(workspaceRoot, themePath),
      failures
    });
  }
}

if (allFailures.length > 0) {
  console.error(
    JSON.stringify(
      {
        message: "Official ThemePack contracts drifted from Chips-ComponentLibrary component contracts.",
        failures: allFailures
      },
      null,
      2
    )
  );
  process.exit(1);
}

console.log(`[theme-contracts] official ThemePack contracts match ${expectedContracts.size} component contracts`);
