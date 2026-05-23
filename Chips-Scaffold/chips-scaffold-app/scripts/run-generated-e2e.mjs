#!/usr/bin/env node

import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const ECOSYSTEM_ROOT = path.resolve(ROOT, "..", "..");

async function symlinkDir(sourceDir, targetDir) {
  const linkType = process.platform === "win32" ? "junction" : "dir";
  await symlink(sourceDir, targetDir, linkType);
}

async function createWorkspaceSandbox(sandboxRoot) {
  await writeFile(
    path.join(sandboxRoot, "package.json"),
    JSON.stringify(
      {
        name: "chips-ecosystem-workspace",
        private: true,
        packageManager: "npm@10.9.3",
        volta: {
          node: process.versions.node,
          npm: "10.9.3",
        },
        workspaces: [
          "Chips-*",
          "Chips-BaseCardPlugin/*",
          "Chips-ComponentLibrary/packages/*",
          "Chips-ComponentLibrary/packages/adapters/*",
          "Chips-Scaffold/*",
          "ThemePack/*",
        ],
        overrides: {
          "tldts": "7.0.30",
          "tldts-core": "7.0.30",
        },
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const entry of [
    "Chips-SDK",
    "Chips-Scaffold",
    "Chips-ComponentLibrary",
  ]) {
    await symlinkDir(
      path.join(ECOSYSTEM_ROOT, entry),
      path.join(sandboxRoot, entry),
    );
  }
}

/** 在 CI 中从模板生成示例工程并执行基础命令，用作端到端质量门禁。 */

async function main() {
  const sandboxRoot = await mkdtemp(
    path.join(os.tmpdir(), "chips-app-scaffold-e2e-"),
  );
  const projectRelativePath = path.join("validation-projects", "app-e2e");
  const projectDir = path.join(sandboxRoot, projectRelativePath);
  const sdkCliPath = path.join(sandboxRoot, "Chips-SDK", "cli", "index.js");
  const npmCacheDir = path.join(sandboxRoot, ".npm-cache");
  const env = {
    ...process.env,
    CHIPS_ECOSYSTEM_ROOT: sandboxRoot,
    NPM_CONFIG_CACHE: process.env.NPM_CONFIG_CACHE ?? npmCacheDir,
    npm_config_cache: process.env.npm_config_cache ?? npmCacheDir,
  };

  try {
    await createWorkspaceSandbox(sandboxRoot);

    const commands = [
      ["node", [sdkCliPath, "create", "app", projectRelativePath], { cwd: sandboxRoot, env }],
      ["npm", ["install", "--cache", npmCacheDir], { cwd: sandboxRoot, env }],
      ["npm", ["run", "lint"], { cwd: projectDir, env }],
      ["npm", ["test"], { cwd: projectDir, env }],
      ["npm", ["run", "build"], { cwd: projectDir, env }],
      ["npm", ["run", "validate"], { cwd: projectDir, env }],
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

    const generatedPackage = JSON.parse(
      await readFile(path.join(projectDir, "package.json"), "utf8"),
    );
    if (
      generatedPackage.dependencies?.["@chips/component-library"] !== "^0.1.0"
    ) {
      throw new Error("E2E: 应用模板必须保留正式 semver 组件库依赖");
    }
    if (generatedPackage.devDependencies?.["chips-sdk"] !== "^0.1.0") {
      throw new Error("E2E: 应用模板必须保留正式 semver SDK 依赖");
    }
    if (generatedPackage.volta?.extends !== "../../package.json") {
      throw new Error("E2E: chipsdev create 应为新工程写入根工作区 volta.extends");
    }

    const manifestText = await readFile(path.join(projectDir, "manifest.yaml"), "utf8");
    for (const permission of ["i18n.read", "i18n.write", "command.read", "command.write", "command.invoke"]) {
      if (!manifestText.includes(`  - ${permission}`)) {
        throw new Error(`E2E: 应用模板 manifest 缺少 ${permission}`);
      }
    }
    if (/^commands\s*:/m.test(manifestText)) {
      throw new Error("E2E: 应用模板不应生成未冻结的 manifest.commands 字段");
    }

    const commandSource = await readFile(
      path.join(projectDir, "src", "commands", "app-commands.ts"),
      "utf8",
    );
    const appSource = await readFile(
      path.join(projectDir, "src", "App.tsx"),
      "utf8",
    );
    const commandRuntimeSource = await readFile(
      path.join(projectDir, "src", "commands", "useAppCommands.ts"),
      "utf8",
    );
    const localeSource = await readFile(
      path.join(projectDir, "src", "i18n", "locales.ts"),
      "utf8",
    );
    const appTestSource = await readFile(
      path.join(projectDir, "tests", "unit", "app.test.tsx"),
      "utf8",
    );
    const commandTestSource = await readFile(
      path.join(projectDir, "tests", "unit", "commands.test.ts"),
      "utf8",
    );
    for (const requiredText of [
      "titleKey",
      "descriptionKey",
      "ariaLabelKey",
      "handlerId",
      "menuPlacement",
      "toolbarPlacement",
      "paletteKeywords",
    ]) {
      if (!commandSource.includes(requiredText)) {
        throw new Error(`E2E: command schema 缺少 ${requiredText}`);
      }
    }
    for (const requiredText of [
      "client.command.register",
      "client.command.invoke",
      "client.command.onInvoked",
      "createCommandAdapter",
      "useChipsClient",
    ]) {
      if (!commandRuntimeSource.includes(requiredText)) {
        throw new Error(`E2E: command runtime 缺少 ${requiredText}`);
      }
    }
    for (const requiredText of [
      "ChipsEnvironmentProvider",
      "useChipsTheme",
      "useChipsI18n",
      "useChipsI18nText",
      "useChipsSurface",
      "useChipsPermission",
      "useChipsDiagnostics",
      "setLocale",
      "supportedLocales",
    ]) {
      if (!appSource.includes(requiredText)) {
        throw new Error(`E2E: App 环境入口缺少 ${requiredText}`);
      }
    }
    for (const requiredText of ["export const localeBundles", "export const supportedLocales"]) {
      if (!localeSource.includes(requiredText)) {
        throw new Error(`E2E: 本地 i18n adapter 缺少 ${requiredText}`);
      }
    }
    for (const requiredText of ["createChipsI18nText", "localeBundles", "supportedLocales", "app-standard.language.switchTo"]) {
      if (!appTestSource.includes(requiredText)) {
        throw new Error(`E2E: app 单元测试缺少同步 i18n adapter 覆盖 ${requiredText}`);
      }
    }
    for (const requiredText of ["chips-sdk/testing", "createMockChipsClient", "client.calls", "command.onInvoked"]) {
      if (!commandTestSource.includes(requiredText)) {
        throw new Error(`E2E: command 单元测试缺少 SDK testing mock 覆盖 ${requiredText}`);
      }
    }
    if (/window\.chips\.invoke\(["']command\./.test(commandRuntimeSource)) {
      throw new Error("E2E: command runtime 不得绕过 SDK 直连 Bridge action");
    }
    if (/\buseChipsBridge\b/.test(`${appSource}\n${commandRuntimeSource}`)) {
      throw new Error("E2E: 应用模板不得生成旧的 useChipsBridge 私有入口");
    }

    const zhCnText = await readFile(path.join(projectDir, "i18n", "zh-CN.json"), "utf8");
    const enUsText = await readFile(path.join(projectDir, "i18n", "en-US.json"), "utf8");
    for (const key of ["showWelcome", "refreshTheme", "lastInvoked", "palette", "switchTo"]) {
      if (!zhCnText.includes(key) || !enUsText.includes(key)) {
        throw new Error(`E2E: i18n 文件缺少 key：${key}`);
      }
    }
  } finally {
    await rm(sandboxRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[run-generated-e2e] 执行失败", error);
  process.exitCode = 1;
});
