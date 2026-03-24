#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

function run(cmd, options) {
  execSync(cmd, { stdio: "inherit", ...options });
}

function main() {
  const tmpRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "chips-boxlayout-scaffold-e2e-")
  );
  const targetDir = path.join(tmpRoot, "boxlayout-standard-project");
  const commandEnv = {
    ...process.env,
    NPM_CONFIG_CACHE:
      process.env.NPM_CONFIG_CACHE || path.join(tmpRoot, ".npm-cache"),
    npm_config_cache:
      process.env.npm_config_cache || path.join(tmpRoot, ".npm-cache"),
  };

  const { renderTemplateToTarget } = require("../dist/src/core/template-engine");
  const options = {
    projectName: "boxlayout-standard-project",
    targetDir,
    templateId: "boxlayout-standard",
    pluginId: "chips.layout.boxlayout-standard",
    layoutType: "chips.layout.grid",
    displayName: "Standard Box Layout Plugin",
    description: "标准布局插件模板生成工程。",
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
        path.join("src", "index.ts"),
        path.join("src", "view", "page.tsx"),
        path.join("src", "editor", "panel.tsx"),
        path.join("tests", "unit", "schema.test.ts"),
      ];

      for (const relativePath of requiredFiles) {
        if (!fs.existsSync(path.join(targetDir, relativePath))) {
          throw new Error(`E2E: 生成工程缺少 ${relativePath}`);
        }
      }

      const pkgPath = path.join(targetDir, "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.devDependencies && pkg.devDependencies["chips-sdk"]) {
        delete pkg.devDependencies["chips-sdk"];
        fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
      }

      run("npm install", {
        cwd: targetDir,
        env: commandEnv,
      });

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
      console.error("E2E: 生成工程失败", error);
      process.exitCode = 1;
    })
    .finally(() => {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    });
}

main();
