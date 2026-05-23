#!/usr/bin/env node

import { readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const TEMPLATES_ROOT = path.join(ROOT, "templates");

/** 简单的模板完整性检查脚本，用于在 CI 中作为质量门禁的一部分。 */

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
    "config/app-config.ts.tpl",
    "config/logging.ts.tpl",
    "i18n/zh-CN.json.tpl",
    "i18n/en-US.json.tpl",
    "src/i18n/locales.ts.tpl",
    "src/runtime/chips-client.ts.tpl",
    "src/commands/app-commands.ts.tpl",
    "src/commands/useAppCommands.ts.tpl",
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
      const manifestText = await readFile(path.join(base, "manifest.yaml.tpl"), "utf8");
      for (const permission of ["command.read", "command.write", "command.invoke"]) {
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

      const sourceFiles = [
        "src/App.tsx.tpl",
        "src/components/ExamplePanel.tsx.tpl",
        "src/commands/app-commands.ts.tpl",
        "src/commands/useAppCommands.ts.tpl",
        "src/runtime/chips-client.ts.tpl",
        "src/i18n/locales.ts.tpl",
      ];
      const sourceText = (
        await Promise.all(
          sourceFiles.map((rel) => readFile(path.join(base, rel), "utf8")),
        )
      ).join("\n");
      for (const forbiddenPattern of [
        /window\.chips\.invoke\(["']command\./,
        /\bBrowserWindow\b/,
        /\bipcRenderer\b/,
        /\bfrom\s+["'](?:node:)?fs["']/,
        /\brequire\(["'](?:node:)?fs["']\)/,
      ]) {
        if (forbiddenPattern.test(sourceText)) {
          console.error(
            `[check-templates] 模板 ${dir} 源码包含禁止的 Host/Node 直连模式：${forbiddenPattern}`,
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
