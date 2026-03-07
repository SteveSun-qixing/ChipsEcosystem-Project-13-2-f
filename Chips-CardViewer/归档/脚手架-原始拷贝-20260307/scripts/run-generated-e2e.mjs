#!/usr/bin/env node

import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

/** 在 CI 中从模板生成示例工程并执行基础命令，用作端到端质量门禁。 */

async function main() {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "chips-app-scaffold-e2e-"));
  const projectDir = path.join(tmpRoot, "app-e2e");

  // 动态 import 构建后的 API，要求外部已执行过 `npm run build`
  const { createAppProject } = await import(
    path.join(ROOT, "dist/src/cli/app-scaffold-api.js")
  );

  try {
    await createAppProject({
      projectName: "app-e2e",
      targetDir: projectDir,
      templateId: "app-standard",
      pluginId: "com.example.app-e2e",
      displayName: "E2E 应用插件",
      version: "0.1.0",
      authorName: "Scaffold E2E",
      authorEmail: "scaffold-e2e@example.com",
    });

    const commands = [
      ["npm", ["install"], { cwd: projectDir }],
      ["npm", ["run", "lint"], { cwd: projectDir }],
      ["npm", ["test"], { cwd: projectDir }],
      ["npm", ["run", "build"], { cwd: projectDir }],
      ["npm", ["run", "validate"], { cwd: projectDir }],
    ];

    for (const [cmd, args, opts] of commands) {
      const result = spawnSync(cmd, args, {
        stdio: "inherit",
        ...opts,
      });
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        return;
      }
    }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[run-generated-e2e] 执行失败", error);
  process.exitCode = 1;
});

