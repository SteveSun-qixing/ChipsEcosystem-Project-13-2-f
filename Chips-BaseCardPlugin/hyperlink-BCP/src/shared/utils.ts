export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type HyperlinkUrlSecurityLevel = "secure" | "warning" | "blocked" | "empty";

export type HyperlinkUrlSecurityReason =
  | "secure"
  | "insecure-http"
  | "empty"
  | "invalid"
  | "unsupported-protocol"
  | "missing-host"
  | "credentials-blocked";

export interface HyperlinkUrlAnalysis {
  input: string;
  normalizedUrl: string;
  protocol: string;
  hostname: string;
  openable: boolean;
  level: HyperlinkUrlSecurityLevel;
  reason: HyperlinkUrlSecurityReason;
}

export function analyzeHyperlinkUrl(value: string): HyperlinkUrlAnalysis {
  const input = typeof value === "string" ? value.trim() : "";
  if (!input) {
    return {
      input,
      normalizedUrl: "",
      protocol: "",
      hostname: "",
      openable: false,
      level: "empty",
      reason: "empty",
    };
  }

  if (!isNonEmptyString(value)) {
    return {
      input,
      normalizedUrl: "",
      protocol: "",
      hostname: "",
      openable: false,
      level: "empty",
      reason: "empty",
    };
  }

  try {
    const url = new URL(input);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.trim();

    if (protocol !== "http:" && protocol !== "https:") {
      return {
        input,
        normalizedUrl: "",
        protocol,
        hostname,
        openable: false,
        level: "blocked",
        reason: "unsupported-protocol",
      };
    }

    if (!hostname) {
      return {
        input,
        normalizedUrl: "",
        protocol,
        hostname,
        openable: false,
        level: "blocked",
        reason: "missing-host",
      };
    }

    if (url.username || url.password) {
      return {
        input,
        normalizedUrl: "",
        protocol,
        hostname,
        openable: false,
        level: "blocked",
        reason: "credentials-blocked",
      };
    }

    const normalizedUrl = url.toString();
    if (protocol === "http:") {
      return {
        input,
        normalizedUrl,
        protocol,
        hostname,
        openable: true,
        level: "warning",
        reason: "insecure-http",
      };
    }

    return {
      input,
      normalizedUrl,
      protocol,
      hostname,
      openable: true,
      level: "secure",
      reason: "secure",
    };
  } catch {
    return {
      input,
      normalizedUrl: "",
      protocol: "",
      hostname: "",
      openable: false,
      level: "blocked",
      reason: "invalid",
    };
  }
}

export function normalizeHyperlinkUrl(value: string): string {
  const analysis = analyzeHyperlinkUrl(value);
  return analysis.openable ? analysis.normalizedUrl : analysis.input;
}

export function validateHyperlinkUrl(value: string): boolean {
  return analyzeHyperlinkUrl(value).openable;
}
