import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDir = path.join(root, "reports", "quality-gate");
fs.mkdirSync(reportsDir, { recursive: true });

const steps = [
  { name: "lint", command: process.execPath, args: ["scripts/run-lint.mjs"] },
  { name: "typecheck", command: process.execPath, args: ["scripts/run-typecheck.mjs"] },
  { name: "test", command: "npm", args: ["run", "test"] },
  { name: "test:contracts", command: "npm", args: ["run", "test:contracts"] },
  { name: "test:a11y", command: process.execPath, args: ["scripts/run-a11y-tests.mjs"] },
  { name: "test:perf", command: process.execPath, args: ["scripts/run-perf-tests.mjs"] },
  { name: "build", command: "npm", args: ["run", "build"] }
];

function runStep(step) {
  const startedAt = Date.now();
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    encoding: "utf8"
  });

  return {
    name: step.name,
    command: [step.command, ...step.args].join(" "),
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

const startedAt = Date.now();
const results = [];
let failed = false;

for (const step of steps) {
  if (failed) {
    results.push({
      name: step.name,
      command: [step.command, ...step.args].join(" "),
      status: "skipped",
      exitCode: null,
      durationMs: 0,
      stdout: "",
      stderr: ""
    });
    continue;
  }

  const stepResult = runStep(step);
  results.push(stepResult);
  process.stdout.write(stepResult.stdout);
  process.stderr.write(stepResult.stderr);

  if (stepResult.status !== "passed") {
    failed = true;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalDurationMs: Date.now() - startedAt,
  status: failed ? "failed" : "passed",
  steps: results.map((item) => ({
    name: item.name,
    command: item.command,
    status: item.status,
    exitCode: item.exitCode,
    durationMs: item.durationMs
  }))
};

const stamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "");
const reportPath = path.join(reportsDir, `quality-gate-${stamp}.json`);
const latestPath = path.join(reportsDir, "quality-gate-latest.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

console.log(`[quality-gate] report written: ${path.relative(root, reportPath)}`);
console.log(`[quality-gate] final status: ${report.status}`);

if (failed) {
  process.exit(1);
}
