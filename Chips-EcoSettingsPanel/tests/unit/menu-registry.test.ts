import { describe, expect, it } from "vitest";
import { APP_ID } from "../../src/app/App";
import { MENU_REGISTRY } from "../../src/app/menu-registry";
import { appConfig } from "../../config/app-config";

describe("menu registry", () => {
  it("keeps menu entries sorted by order and registered exactly once", () => {
    expect(MENU_REGISTRY.map((entry) => entry.id)).toEqual([
      "themes",
      "languages",
      "app-plugins",
      "card-plugins",
      "layout-plugins",
      "module-plugins",
      "component-gallery",
    ]);
    expect(new Set(MENU_REGISTRY.map((entry) => entry.id)).size).toBe(MENU_REGISTRY.length);
  });

  it("keeps the exported app identifier aligned with app config", () => {
    expect(APP_ID).toBe(appConfig.appId);
  });
});
