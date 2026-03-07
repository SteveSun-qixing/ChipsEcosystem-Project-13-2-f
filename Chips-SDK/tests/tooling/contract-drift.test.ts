import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

interface RouteDescriptorMeta {
  action: string;
  schemaIn?: string;
  schemaOut?: string;
  idempotent?: boolean;
  timeoutMs?: number;
}

interface RouteManifest {
  routes: Record<string, RouteDescriptorMeta>;
}

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

function collectInvokedActions(srcRoot: string): Set<string> {
  const files = listSourceFiles(srcRoot);
  const actions = new Set<string>();

  const pattern =
    /client\.invoke\s*(?:<[^>]+>)?\s*\(\s*["']([^"']+)["']/g;

  for (const file of files) {
    const source = fs.readFileSync(file, "utf-8");
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(source)) !== null) {
      const action = match[1];
      if (action) {
        actions.add(action);
      }
    }
  }

  return actions;
}

describe("route-manifest contract drift", () => {
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
});
