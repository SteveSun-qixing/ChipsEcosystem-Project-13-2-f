#!/usr/bin/env node

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execSync } = require("node:child_process");

function run(cmd, options) {
  execSync(cmd, { stdio: "inherit", ...options });
}

function shouldCopyWorkspacePath(sourceRoot, entryPath) {
  const relativePath = path.relative(sourceRoot, entryPath);
  if (relativePath.length === 0) {
    return true;
  }
  const segments = relativePath.split(path.sep);
  return !segments.includes("node_modules") && !segments.includes(".git");
}

async function copyWorkspaceDir(source, target) {
  await fsp.cp(source, target, {
    recursive: true,
    dereference: true,
    filter: (entryPath) => shouldCopyWorkspacePath(source, entryPath),
  });
}

async function main() {
  const ecosystemRoot = path.resolve(__dirname, "../../..");
  const tmpRoot = await fsp.mkdtemp(
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

  try {
    await copyWorkspaceDir(
      path.join(ecosystemRoot, "Chips-SDK"),
      path.join(tmpRoot, "Chips-SDK")
    );
    await copyWorkspaceDir(
      path.join(ecosystemRoot, "Chips-ComponentLibrary"),
      path.join(tmpRoot, "Chips-ComponentLibrary")
    );

    await fsp.writeFile(
      path.join(tmpRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "chips-boxlayout-scaffold-e2e-workspace",
          private: true,
          workspaces: [
            "Chips-SDK",
            "Chips-ComponentLibrary/packages/*",
            "Chips-ComponentLibrary/packages/adapters/*",
            "boxlayout-standard-project",
          ],
        },
        null,
        2
      )}\n`,
      "utf-8"
    );

    await renderTemplateToTarget(options);

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

    run("npm install", {
      cwd: tmpRoot,
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
  } catch (error) {
    console.error("E2E: 生成工程失败", error);
    process.exitCode = 1;
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

void main();
