import type { SdkEnvironment } from "../types/client";

export function detectEnvironment(): SdkEnvironment {
  if (typeof window !== "undefined") {
    if (typeof (window as any).chips === "object" && (window as any).chips !== null) {
      return "plugin";
    }
    return "browser";
  }
  return "node";
}

