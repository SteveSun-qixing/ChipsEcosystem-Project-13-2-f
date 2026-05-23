import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

interface RouteDescriptorMeta {
  action: string;
  schemaIn?: string;
  schemaOut?: string;
  permission?: string[];
  idempotent?: boolean;
  timeoutMs?: number;
  retries?: 0 | 1 | 2 | 3;
}

interface RouteManifest {
  routes: Record<string, RouteDescriptorMeta>;
}

const ACTION_NAME_PATTERN = /^[a-z][A-Za-z0-9-]*(?:\.[a-z][A-Za-z0-9-]*)+$/;

const INTERNAL_RUNTIME_ACTIONS = new Set([
  "plugin.init",
  "plugin.handshake.complete",
]);

function loadRouteManifest(): RouteManifest {
  const manifestPath = path.resolve(__dirname, "..", "..", "src", "contracts", "route-manifest.json");
  const raw = fs.readFileSync(manifestPath, "utf-8");
  return JSON.parse(raw) as RouteManifest;
}

function listSourceFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resolveNearestStringConstant(source: string, identifier: string, beforeIndex: number): string | undefined {
  const prefix = source.slice(0, beforeIndex);
  const pattern = new RegExp(
    `\\b(?:const|let)\\s+${escapeRegExp(identifier)}\\s*(?::[^=;]+)?=\\s*["']([^"']+)["']`,
    "g",
  );
  let resolved: string | undefined;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = pattern.exec(prefix)) !== null) {
    const value = match[1];
    if (value && ACTION_NAME_PATTERN.test(value)) {
      resolved = value;
    }
  }
  return resolved;
}

function collectInvokedActions(srcRoot: string): Set<string> {
  const files = listSourceFiles(srcRoot);
  const actions = new Set<string>();

  const pattern =
    /client\.invoke\s*(?:<[\s\S]*?>)?\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(source)) !== null) {
      const action = match[1] ?? match[2] ?? (
        match[3]
          ? resolveNearestStringConstant(source, match[3], match.index)
          : undefined
      );
      if (action) {
        actions.add(action);
      }
    }
  }

  return actions;
}

describe("route-manifest contract drift", () => {
  it("keeps descriptor actions aligned with route keys", () => {
    const manifest = loadRouteManifest();
    const mismatched = Object.entries(manifest.routes)
      .filter(([routeKey, descriptor]) => descriptor.action !== routeKey)
      .map(([routeKey, descriptor]) => ({ routeKey, action: descriptor.action }));

    expect(mismatched).toEqual([]);
  });

  it("keeps descriptor metadata complete for every route", () => {
    const manifest = loadRouteManifest();
    const invalid = Object.entries(manifest.routes)
      .filter(([routeKey, descriptor]) => (
        descriptor.schemaIn !== `schemas/${routeKey}.request.json`
        || descriptor.schemaOut !== `schemas/${routeKey}.response.json`
        || !Array.isArray(descriptor.permission)
        || descriptor.permission.some((permission) => typeof permission !== "string" || permission.trim().length === 0)
        || typeof descriptor.timeoutMs !== "number"
        || !Number.isFinite(descriptor.timeoutMs)
        || descriptor.timeoutMs <= 0
        || typeof descriptor.idempotent !== "boolean"
        || ![0, 1, 2, 3].includes(descriptor.retries ?? -1)
      ))
      .map(([routeKey, descriptor]) => ({ routeKey, descriptor }));

    expect(invalid).toEqual([]);
  });

  it("contains all actions used by SDK client wrappers", () => {
    const manifest = loadRouteManifest();
    const manifestActions = new Set(Object.keys(manifest.routes));

    const srcRoot = path.resolve(__dirname, "..", "..", "src");
    const usedActions = collectInvokedActions(srcRoot);

    const missing: string[] = [];
    for (const action of usedActions) {
      if (!manifestActions.has(action)) {
        missing.push(action);
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps every public manifest action covered by an SDK wrapper or explicit internal classification", () => {
    const manifest = loadRouteManifest();
    const manifestActions = Object.keys(manifest.routes).sort();

    const srcRoot = path.resolve(__dirname, "..", "..", "src");
    const usedActions = collectInvokedActions(srcRoot);

    const uncovered = manifestActions.filter((action) => (
      !usedActions.has(action) && !INTERNAL_RUNTIME_ACTIONS.has(action)
    ));

    expect(uncovered).toEqual([]);
  });

  it("keeps internal runtime handshake actions explicit and out of public SDK wrappers", () => {
    const manifest = loadRouteManifest();
    const manifestActions = new Set(Object.keys(manifest.routes));

    for (const action of INTERNAL_RUNTIME_ACTIONS) {
      expect(manifestActions.has(action)).toBe(true);
    }

    const srcRoot = path.resolve(__dirname, "..", "..", "src");
    const usedActions = collectInvokedActions(srcRoot);
    const leakedInternalActions = [...INTERNAL_RUNTIME_ACTIONS].filter((action) => usedActions.has(action));

    expect(leakedInternalActions).toEqual([]);
  });
});
