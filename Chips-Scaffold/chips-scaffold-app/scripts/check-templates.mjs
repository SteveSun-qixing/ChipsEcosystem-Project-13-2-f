#!/usr/bin/env node

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_ROOT = path.join(ROOT, "templates");

/** 简单的模板完整性检查脚本，用于在 CI 中作为质量门禁的一部分。 */

async function collectTemplateSourceFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTemplateSourceFiles(entryPath));
      continue;
    }
    if (entry.isFile() && /\.(?:ts|tsx|js|jsx|mjs|cjs)\.tpl$/.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

async function collectTextTemplateFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTextTemplateFiles(entryPath));
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".tpl") || entry.name === "template.json")) {
      files.push(entryPath);
    }
  }
  return files;
}

async function main() {
  const entries = await readdir(TEMPLATES_ROOT, { withFileTypes: true });
  const templateDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (templateDirs.length === 0) {
    console.error("[check-templates] 未找到任何模板目录");
    process.exitCode = 1;
    return;
  }

  const requiredFiles = [
    "template.json",
    "manifest.yaml.tpl",
    "package.json.tpl",
    ".eslintrc.cjs.tpl",
    "tsconfig.json.tpl",
    "chips.config.mjs.tpl",
    "README.md.tpl",
    "index.html.tpl",
    "src/main.tsx.tpl",
    "src/App.tsx.tpl",
    "src/app/AppRoot.tsx.tpl",
    "src/app/AppProviders.tsx.tpl",
    "src/app/AppShell.tsx.tpl",
    "src/app/app-shell.css.tpl",
    "src/app/scene-registry.ts.tpl",
    "config/app-config.ts.tpl",
    "config/logging.ts.tpl",
    "i18n/zh-CN.json.tpl",
    "i18n/en-US.json.tpl",
    "src/i18n/locales.ts.tpl",
    "src/i18n/useAppText.ts.tpl",
    "src/runtime/chips-client.ts.tpl",
    "src/runtime/launch-context.ts.tpl",
    "src/theme/theme-runtime.ts.tpl",
    "src/scenes/MainScene.tsx.tpl",
    "src/scenes/SettingsScene.tsx.tpl",
    "src/views/WorkspaceOverviewView.tsx.tpl",
    "src/views/StateBindingView.tsx.tpl",
    "src/views/SceneListView.tsx.tpl",
    "src/views/EnvironmentStatusView.tsx.tpl",
    "src/commands/app-commands.ts.tpl",
    "src/commands/useAppCommands.ts.tpl",
    "src/testing/mock-environment.ts.tpl",
    "src/testing/render-with-chips.tsx.tpl",
    "src/preview/preview-smoke.js.tpl",
    "tests/unit/app.test.tsx.tpl",
    "tests/unit/commands.test.ts.tpl",
    "tests/e2e/basic-flow.test.ts.tpl"
  ];

  let hasError = false;

  for (const dir of templateDirs) {
    const base = path.join(TEMPLATES_ROOT, dir);
    try {
      const metaPath = path.join(base, "template.json");
      const raw = await readFile(metaPath, "utf8");
      const meta = JSON.parse(raw);
      if (!meta.id || meta.id !== dir) {
        console.error(
          `[check-templates] 模板 ${dir} 的 template.json.id 不匹配目录名`,
        );
        hasError = true;
      }
    } catch (error) {
      console.error(
        `[check-templates] 模板 ${dir} 的 template.json 无法读取或解析`,
        error,
      );
      hasError = true;
    }

    for (const rel of requiredFiles) {
      const p = path.join(base, rel);
      try {
        const s = await stat(p);
        if (!s.isFile()) {
          console.error(
            `[check-templates] 模板 ${dir} 缺少关键文件（非文件）：${rel}`,
          );
          hasError = true;
        }
      } catch {
        console.error(
          `[check-templates] 模板 ${dir} 缺少关键文件：${rel}`,
        );
        hasError = true;
      }
    }

    try {
      const packageText = await readFile(path.join(base, "package.json.tpl"), "utf8");
      const packageJson = JSON.parse(packageText);
      for (const scriptName of ["typecheck", "preview:smoke", "quality:gate", "verify"]) {
        if (typeof packageJson.scripts?.[scriptName] !== "string") {
          console.error(
            `[check-templates] 模板 ${dir} package.json.tpl 缺少脚本：${scriptName}`,
          );
          hasError = true;
        }
      }
      if (!packageJson.scripts?.verify?.includes("npm run preview:smoke")) {
        console.error(
          `[check-templates] 模板 ${dir} verify 脚本必须串联 preview:smoke`,
        );
        hasError = true;
      }
      if (!packageJson.scripts?.verify?.includes("npm run quality:gate")) {
        console.error(
          `[check-templates] 模板 ${dir} verify 脚本必须串联 quality:gate`,
        );
        hasError = true;
      }

      const manifestText = await readFile(path.join(base, "manifest.yaml.tpl"), "utf8");
      for (const permission of ["i18n.read", "i18n.write", "command.read", "command.write", "command.invoke"]) {
        if (!manifestText.includes(`  - ${permission}`)) {
          console.error(
            `[check-templates] 模板 ${dir} manifest.yaml.tpl 缺少权限：${permission}`,
          );
          hasError = true;
        }
      }
      if (/^commands\s*:/m.test(manifestText)) {
        console.error(
          `[check-templates] 模板 ${dir} 不应声明未冻结的 manifest.commands 字段`,
        );
        hasError = true;
      }

      const commandText = await readFile(
        path.join(base, "src/commands/app-commands.ts.tpl"),
        "utf8",
      );
      for (const field of ["title", "description", "ariaLabel", "label"]) {
        const rawFieldPattern = new RegExp(`(^|[,{]\\s*)${field}\\s*:`, "m");
        if (rawFieldPattern.test(commandText)) {
          console.error(
            `[check-templates] 模板 ${dir} command definition 不应包含原始文案字段：${field}`,
          );
          hasError = true;
        }
      }
      for (const requiredText of [
        "titleKey",
        "descriptionKey",
        "ariaLabelKey",
        "handlerId",
        "menuPlacement",
        "toolbarPlacement",
        "paletteKeywords",
      ]) {
        if (!commandText.includes(requiredText)) {
          console.error(
            `[check-templates] 模板 ${dir} command definition 缺少字段：${requiredText}`,
          );
          hasError = true;
        }
      }

      const sourceFiles = await collectTemplateSourceFiles(path.join(base, "src"));
      const runtimeSourceFiles = sourceFiles.filter(
        (sourcePath) => !sourcePath.includes(`${path.sep}src${path.sep}preview${path.sep}`),
      );
      const sourceText = (
        await Promise.all(
          runtimeSourceFiles.map((sourcePath) => readFile(sourcePath, "utf8")),
        )
      ).join("\n");
      for (const requiredText of [
        "ChipsEnvironmentProvider",
        "useChipsClient",
        "useChipsTheme",
        "useChipsI18n",
        "useChipsI18nText",
        "useChipsSurface",
        "useChipsPermission",
        "useChipsDiagnostics",
        "setLocale",
        "supportedLocales",
      ]) {
        if (!sourceText.includes(requiredText)) {
          console.error(
            `[check-templates] 模板 ${dir} React 环境入口缺少：${requiredText}`,
          );
          hasError = true;
        }
      }
      for (const forbiddenPattern of [
        /\buseChipsBridge\b/,
        /window\.chips\.invoke\(["']command\./,
        /\bBrowserWindow\b/,
        /\bipcRenderer\b/,
        /\bfrom\s+["'](?:node:)?fs["']/,
        /\brequire\(["'](?:node:)?fs["']\)/,
        /style=\{\{/,
        /\bExamplePanel\b/,
      ]) {
        if (forbiddenPattern.test(sourceText)) {
          console.error(
            `[check-templates] 模板 ${dir} 源码包含禁止的 Host/Node 直连模式：${forbiddenPattern}`,
          );
          hasError = true;
        }
      }

      const generatedFacingFiles = await collectTextTemplateFiles(base);
      const generatedFacingText = (
        await Promise.all(
          generatedFacingFiles
            .filter((filePath) => path.basename(filePath) !== "template.json")
            .map((filePath) => readFile(filePath, "utf8")),
        )
      ).join("\n");
      for (const forbiddenPattern of [/\bapp-standard\b/, /\bchips-scaffold-app\b/, /\bExamplePanel\b/]) {
        if (forbiddenPattern.test(generatedFacingText)) {
          console.error(
            `[check-templates] 模板 ${dir} 生成面文本包含模板身份泄漏：${forbiddenPattern}`,
          );
          hasError = true;
        }
      }

      const localesText = await readFile(path.join(base, "src/i18n/locales.ts.tpl"), "utf8");
      for (const requiredText of ["localeBundles", "supportedLocales"]) {
        if (!localesText.includes(`export const ${requiredText}`)) {
          console.error(
            `[check-templates] 模板 ${dir} 本地 i18n adapter 缺少导出：${requiredText}`,
          );
          hasError = true;
        }
      }

      const appTestText = await readFile(path.join(base, "tests/unit/app.test.tsx.tpl"), "utf8");
      for (const requiredText of ["createChipsI18nText", "localeBundles", "supportedLocales", "app.shell.languageSwitch"]) {
        if (!appTestText.includes(requiredText)) {
          console.error(
            `[check-templates] 模板 ${dir} app 单元测试缺少同步 i18n adapter 覆盖：${requiredText}`,
          );
          hasError = true;
        }
      }

      const commandTestText = await readFile(path.join(base, "tests/unit/commands.test.ts.tpl"), "utf8");
      for (const requiredText of ["chips-sdk/testing", "createMockChipsClient", "client.calls", "command.onInvoked"]) {
        if (!commandTestText.includes(requiredText)) {
          console.error(
            `[check-templates] 模板 ${dir} command 单元测试缺少 SDK testing mock 覆盖：${requiredText}`,
          );
          hasError = true;
        }
      }

      const zhCnText = await readFile(path.join(base, "i18n/zh-CN.json.tpl"), "utf8");
      const enUsText = await readFile(path.join(base, "i18n/en-US.json.tpl"), "utf8");
      for (const key of ["languageSwitch", "openWorkspace", "refreshTheme"]) {
        if (!zhCnText.includes(key) || !enUsText.includes(key)) {
          console.error(
            `[check-templates] 模板 ${dir} i18n 资源缺少关键 key：${key}`,
          );
          hasError = true;
        }
      }
    } catch (error) {
      console.error(
        `[check-templates] 模板 ${dir} command 契约扫描失败`,
        error,
      );
      hasError = true;
    }
  }

  if (hasError) {
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("[check-templates] 模板结构检查通过");
  }
}

main().catch((error) => {
  console.error("[check-templates] 执行失败", error);
  process.exitCode = 1;
});
