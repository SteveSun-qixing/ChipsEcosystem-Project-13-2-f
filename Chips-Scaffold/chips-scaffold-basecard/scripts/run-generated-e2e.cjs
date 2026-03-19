#!/usr/bin/env node

/**
 * 生成标准基础卡片插件工程并做最小自检。
 * 完整集成到 chips dev 的端到端链路在 chips dev 仓库中执行。
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

function run(cmd, options) {
  execSync(cmd, { stdio: "inherit", ...options });
}

function main() {
  const workspaceRoot = path.join(__dirname, "..");
  const tmpRoot = fs.mkdtempSync(
    path.join(workspaceRoot, "node_modules", "chips-basecard-scaffold-e2e-")
  );
  const targetDir = path.join(tmpRoot, "card-standard-project");
  const commandEnv = {
    ...process.env,
    NPM_CONFIG_CACHE:
      process.env.NPM_CONFIG_CACHE || path.join(tmpRoot, ".npm-cache"),
    npm_config_cache:
      process.env.npm_config_cache || path.join(tmpRoot, ".npm-cache"),
  };

  // 直接调用本地构建函数生成工程，由于 chips dev 尚未实现 create 集成，这里只验证脚手架自身行为。
  const { renderTemplateToTarget } = require("../dist/src/core/template-engine");

  const options = {
    projectName: "card-standard-project",
    targetDir,
    templateId: "card-standard",
    pluginId: "com.example.card-standard",
    cardType: "base.text",
    displayName: "Standard Basecard Plugin",
    version: "0.1.0",
    authorName: "Scaffold",
    authorEmail: "dev@example.com",
  };

  renderTemplateToTarget(options)
    .then(() => {
      const requiredFiles = [
        "manifest.yaml",
        "README.md",
        ".eslintrc.cjs",
        path.join("src", "shared", "i18n.ts"),
        path.join("tests", "unit", "schema.test.ts"),
      ];
      for (const relativePath of requiredFiles) {
        if (!fs.existsSync(path.join(targetDir, relativePath))) {
          throw new Error(`E2E: 生成工程缺少 ${relativePath}`);
        }
      }

      run("npx tsc -p tsconfig.json --noEmit", {
        cwd: targetDir,
        env: commandEnv,
      });

      run("npx vitest run", {
        cwd: targetDir,
        env: commandEnv,
      });

      console.log("E2E: 生成工程自检通过。");
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("E2E: 生成工程失败", error);
      process.exitCode = 1;
    })
    .finally(() => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });
}

main();
