import { describe, expect, it } from "vitest";
import { normalizeSettingsError } from "../../src/shared/runtime/errors";

describe("normalizeSettingsError", () => {
  it("preserves standard error-like objects", () => {
    expect(
      normalizeSettingsError(
        {
          code: "PLUGIN_INSTALL_FAILED",
          message: "install failed",
          retryable: true,
          details: { pluginId: "demo" },
        },
        "fallback",
      ),
    ).toEqual({
      code: "PLUGIN_INSTALL_FAILED",
      message: "install failed",
      retryable: true,
      details: { pluginId: "demo" },
    });
  });

  it("normalizes Error instances", () => {
    expect(normalizeSettingsError(new Error("boom"), "fallback")).toEqual({
      code: "UNKNOWN_ERROR",
      message: "boom",
      retryable: false,
    });
  });
});
