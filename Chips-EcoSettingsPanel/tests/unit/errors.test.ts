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

  it("preserves SDK permission denied diagnostics", () => {
    expect(
      normalizeSettingsError(
        {
          code: "PERMISSION_DENIED",
          message: "Caller lacks permission: theme.write",
          messageKey: "chips.error.permissionDenied",
          requestId: "request-1",
          traceId: "trace-1",
          retryable: false,
          details: {
            action: "theme.apply",
          },
          permission: {
            action: "theme.apply",
            required: ["theme.write"],
            granted: ["theme.read"],
            messageKey: "chips.error.permissionDenied",
            pluginId: "com.chips.eco-settings-panel",
          },
        },
        "fallback",
      ),
    ).toEqual({
      code: "PERMISSION_DENIED",
      message: "Caller lacks permission: theme.write",
      messageKey: "chips.error.permissionDenied",
      retryable: false,
      requestId: "request-1",
      traceId: "trace-1",
      details: {
        action: "theme.apply",
      },
      permission: {
        action: "theme.apply",
        required: ["theme.write"],
        granted: ["theme.read"],
        messageKey: "chips.error.permissionDenied",
        pluginId: "com.chips.eco-settings-panel",
      },
    });
  });
});
