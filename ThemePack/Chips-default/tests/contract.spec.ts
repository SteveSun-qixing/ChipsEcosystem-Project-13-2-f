import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildContractTokenTree, validateTheme } from "../src/validate-theme";

describe("theme contract", () => {
  it("passes the full component-library contract baseline", async () => {
    const projectRoot = path.resolve(__dirname, "..");
    const result = await validateTheme(projectRoot);

    expect(result.contract.components).toHaveLength(67);
    expect(result.view.summary.status).toBe("complete");
    expect(result.view.summary.blocking).toBe(0);
    expect(result.view.summary.coverage?.componentCount).toBe(67);
    expect(result.view.summary.coverage?.requiredCoverage).toBe(1);
    expect(result.view.components.every((component) => component.coverage.status === "complete")).toBe(true);
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
      { themeId: "chips-official.default-theme", themeVersion: "1.0.0" }
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
