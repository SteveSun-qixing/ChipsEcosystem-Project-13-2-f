import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { buildContractTokenTree, validateTheme } from "../src/validate-theme";

interface ComponentContract {
  component: string;
  scope: string;
  parts: string[];
  states: string[];
  tokens?: string[];
  requiredTokens?: string[];
  optionalTokens?: string[];
}

const sortedUnique = (values: string[] = []): string[] => [...new Set(values)].sort();

const readJson = <T>(filePath: string): T => JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;

const loadComponentLibraryContracts = (projectRoot: string): Map<string, ComponentContract> => {
  const contractDir = path.resolve(
    projectRoot,
    "..",
    "..",
    "Chips-ComponentLibrary",
    "packages",
    "theme-contracts",
    "contracts",
    "components"
  );
  const contracts = new Map<string, ComponentContract>();

  for (const fileName of fs.readdirSync(contractDir).filter((name) => name.endsWith(".contract.json")).sort()) {
    const contract = readJson<ComponentContract>(path.join(contractDir, fileName));
    contracts.set(contract.component, contract);
  }

  return contracts;
};

const normalizeRequiredTokens = (contract: ComponentContract): string[] =>
  sortedUnique(contract.requiredTokens ?? contract.tokens ?? []);

describe("theme contract", () => {
  it("passes the full component-library contract baseline", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const result = await validateTheme(projectRoot);

    expect(result.contract.components).toHaveLength(70);
    expect(result.view.summary.status).toBe("complete");
    expect(result.view.summary.blocking).toBe(0);
    expect(result.view.summary.coverage?.componentCount).toBe(70);
    expect(result.view.summary.coverage?.requiredCoverage).toBe(1);
    expect(result.contract.components.some((component) => component.component === "image")).toBe(true);
    expect(result.contract.components.some((component) => component.component === "media")).toBe(true);
    expect(result.contract.components.some((component) => component.component === "error-state")).toBe(true);
    expect(result.contract.components.some((component) => component.component === "form")).toBe(true);
    expect(result.contract.components.some((component) => component.component === "navigation-split-view")).toBe(true);
    expect(result.contract.components.some((component) => component.component === "form-field")).toBe(false);
    expect(result.contract.components.some((component) => component.component === "form-group")).toBe(false);
    expect(result.view.components.every((component) => component.coverage.status === "complete")).toBe(true);
  });

  it("keeps official ThemePack contract equal to component-library contracts", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const result = await validateTheme(projectRoot);
    const expectedContracts = loadComponentLibraryContracts(projectRoot);

    expect(result.contract.components.map((component) => component.component).sort()).toEqual(
      [...expectedContracts.keys()].sort()
    );

    for (const themeComponent of result.contract.components) {
      const expected = expectedContracts.get(themeComponent.component ?? themeComponent.scope);
      expect(expected, `missing component-library contract for ${themeComponent.component}`).toBeTruthy();
      expect(themeComponent.scope).toBe(expected?.scope);
      expect(sortedUnique(themeComponent.parts)).toEqual(sortedUnique(expected?.parts));
      expect(sortedUnique(themeComponent.states)).toEqual(sortedUnique(expected?.states));
      expect(normalizeRequiredTokens(themeComponent)).toEqual(normalizeRequiredTokens(expected as ComponentContract));
      expect(sortedUnique(themeComponent.optionalTokens)).toEqual(sortedUnique(expected?.optionalTokens));
    }
  });

  it("emits the frozen diagnostic schema for missing required tokens", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const result = await validateTheme(projectRoot);
    const button = result.contract.components.find((component) => component.component === "button");
    expect(button).toBeTruthy();

    const tokenTree = buildContractTokenTree({
      ref: {},
      sys: {},
      comp: {},
      motion: {},
      layout: {}
    });
    const { buildThemeContractView } = await import(
      "../../../Chips-ComponentLibrary/packages/theme-contracts/src/validator.js"
    );
    const view = buildThemeContractView(
      { schemaVersion: "1.0.0", contractVersion: "1.0.0", components: [button] },
      tokenTree,
      { themeId: "chips-official.default-dark-theme", themeVersion: "1.0.0" }
    );
    const diagnostic = view.components[0]?.diagnostics[0];

    expect(view.summary.status).toBe("blocked");
    expect(diagnostic).toMatchObject({
      severity: "error",
      code: "THEME_REQUIRED_TOKEN_MISSING",
      messageKey: "theme.diagnostics.requiredTokenMissing",
      component: "button",
      tokenKey: "chips.comp.button.root.radius",
      layer: "comp",
      scope: "component",
      blocking: true
    });
  });
});
