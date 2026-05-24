import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  listTemplateMetas,
  createAppProjectInternal,
} from "../src/core/template-engine.js";
import type { CreateAppProjectOptions } from "../src/core/types.js";

const FORBIDDEN_PROJECT_DIRS = [
  "需求文档",
  "技术文档",
  "技术手册",
  "开发计划",
];

test("listTemplateMetas 应返回至少一个模板（app-standard）", async () => {
  const metas = await listTemplateMetas();
  assert.ok(Array.isArray(metas));
  const standard = metas.find((m) => m.id === "app-standard");
  assert.ok(standard, "应包含 id 为 app-standard 的模板");
});

test("createAppProjectInternal 可在临时目录生成完整工程骨架", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "chips-app-scaffold-"));
  const targetDir = path.join(tmpRoot, "my-app");

  const options: CreateAppProjectOptions = {
    projectName: "my-app",
    targetDir,
    templateId: "app-standard",
    pluginId: "com.example.my-app",
    displayName: "示例应用插件",
    version: "0.1.0",
    authorName: "Scaffold Tester",
    authorEmail: "tester@example.com",
  };

  try {
    const result = await createAppProjectInternal(options);
    assert.equal(result.projectDir, targetDir);
    assert.equal(result.templateId, "app-standard");
    assert.ok(result.filesCreated > 0);

    const manifestPath = path.join(targetDir, "manifest.yaml");
    const pkgPath = path.join(targetDir, "package.json");
    const indexHtmlPath = path.join(targetDir, "index.html");
    const eslintConfigPath = path.join(targetDir, ".eslintrc.cjs");
    const appCommandsPath = path.join(targetDir, "src/commands/app-commands.ts");
    const useAppCommandsPath = path.join(targetDir, "src/commands/useAppCommands.ts");
    const appSourcePath = path.join(targetDir, "src/App.tsx");
    const appRootPath = path.join(targetDir, "src/app/AppRoot.tsx");
    const appProvidersPath = path.join(targetDir, "src/app/AppProviders.tsx");
    const appRuntimeProviderPath = path.join(targetDir, "src/app/AppRuntimeProvider.tsx");
    const appShellPath = path.join(targetDir, "src/app/AppShell.tsx");
    const appShellCssPath = path.join(targetDir, "src/app/app-shell.css");
    const sceneRegistryPath = path.join(targetDir, "src/app/scene-registry.ts");
    const localesPath = path.join(targetDir, "src/i18n/locales.ts");
    const appTextPath = path.join(targetDir, "src/i18n/useAppText.ts");
    const runtimeClientPath = path.join(targetDir, "src/runtime/chips-client.ts");
    const launchContextPath = path.join(targetDir, "src/runtime/launch-context.ts");
    const themeRuntimePath = path.join(targetDir, "src/theme/theme-runtime.ts");
    const previewSmokePath = path.join(targetDir, "src/preview/preview-smoke.js");
    const mockEnvironmentPath = path.join(targetDir, "src/testing/mock-environment.ts");
    const renderWithChipsPath = path.join(targetDir, "src/testing/render-with-chips.tsx");
    const commandTestPath = path.join(targetDir, "tests/unit/commands.test.ts");
    const appTestPath = path.join(targetDir, "tests/unit/app.test.tsx");

    await stat(manifestPath);
    await stat(pkgPath);
    await stat(indexHtmlPath);
    await stat(eslintConfigPath);
    await stat(appSourcePath);
    await stat(appRootPath);
    await stat(appProvidersPath);
    await stat(appRuntimeProviderPath);
    await stat(appShellPath);
    await stat(appShellCssPath);
    await stat(sceneRegistryPath);
    await stat(appCommandsPath);
    await stat(useAppCommandsPath);
    await stat(localesPath);
    await stat(appTextPath);
    await stat(runtimeClientPath);
    await stat(launchContextPath);
    await stat(themeRuntimePath);
    await stat(previewSmokePath);
    await stat(mockEnvironmentPath);
    await stat(renderWithChipsPath);
    await stat(commandTestPath);
    await stat(appTestPath);

    const manifestContent = await readFile(manifestPath, "utf8");
    const packageContent = JSON.parse(await readFile(pkgPath, "utf8"));
    const appSourceContent = await readFile(appSourcePath, "utf8");
    const appRuntimeContent = (
      await Promise.all(
        [
          appSourcePath,
          appRootPath,
          appProvidersPath,
          appRuntimeProviderPath,
          appShellPath,
          sceneRegistryPath,
          useAppCommandsPath,
          path.join(targetDir, "src/scenes/MainScene.tsx"),
          path.join(targetDir, "src/scenes/SettingsScene.tsx"),
          path.join(targetDir, "src/views/WorkspaceOverviewView.tsx"),
          path.join(targetDir, "src/views/StateBindingView.tsx"),
          path.join(targetDir, "src/views/SceneListView.tsx"),
          path.join(targetDir, "src/views/EnvironmentStatusView.tsx"),
          appTextPath,
          launchContextPath,
          themeRuntimePath,
          mockEnvironmentPath,
          renderWithChipsPath,
        ].map((filePath) => readFile(filePath, "utf8")),
      )
    ).join("\n");
    const appCommandsContent = await readFile(appCommandsPath, "utf8");
    const useAppCommandsContent = await readFile(useAppCommandsPath, "utf8");
    const appTestContent = await readFile(appTestPath, "utf8");
    const commandTestContent = await readFile(commandTestPath, "utf8");
    const zhCnContent = await readFile(path.join(targetDir, "i18n/zh-CN.json"), "utf8");
    const enUsContent = await readFile(path.join(targetDir, "i18n/en-US.json"), "utf8");
    assert.ok(
      manifestContent.includes("type: app"),
      "manifest.yaml 应声明 type: app",
    );
    assert.ok(
      manifestContent.includes("frame: true"),
      "manifest.yaml 应显式保留标准应用的原生窗口标题栏",
    );
    assert.ok(
      !manifestContent.includes("titleBarStyle: hidden"),
      "manifest.yaml 不应再默认生成隐藏式标题栏配置",
    );
    assert.ok(
      manifestContent.includes("runtime:\n  targets:"),
      "manifest.yaml 应包含 runtime.targets",
    );
    assert.ok(
      manifestContent.includes("surface:\n    defaultKind: window"),
      "manifest.yaml 应包含 ui.surface 默认容器配置",
    );
    for (const permission of ["i18n.read", "i18n.write", "command.read", "command.write", "command.invoke"]) {
      assert.ok(
        manifestContent.includes(`  - ${permission}`),
        `manifest.yaml 应声明 ${permission}`,
      );
    }
    assert.ok(
      !/^commands\s*:/m.test(manifestContent),
      "manifest.yaml 不应声明未冻结的 commands 字段",
    );
    assert.equal(
      packageContent.dependencies["@chips/component-library"],
      "^0.1.0",
      "模板必须保持组件库正式 semver 依赖，由生态根工作区解析本地包",
    );
    assert.equal(
      packageContent.devDependencies.eslint,
      "^8.57.1",
      "模板必须预置 ESLint，保证 chipsdev lint 可直接运行",
    );
    assert.equal(
      packageContent.devDependencies["@typescript-eslint/parser"],
      "^7.18.0",
      "模板必须预置 TypeScript ESLint parser，保证 TS/TSX 文件可被解析",
    );
    assert.equal(
      packageContent.devDependencies["chips-sdk"],
      "^0.1.0",
      "模板必须保持 SDK 正式 semver 依赖，由生态根工作区解析本地包",
    );
    for (const scriptName of ["typecheck", "preview:smoke", "quality:gate", "verify"]) {
      assert.equal(
        typeof packageContent.scripts[scriptName],
        "string",
        `模板 package.json 应包含 ${scriptName} 脚本`,
      );
    }
    assert.ok(
      packageContent.scripts.verify.includes("npm run preview:smoke") &&
        packageContent.scripts.verify.includes("npm run quality:gate"),
      "verify 脚本应串联预览 smoke 与质量门禁",
    );
    assert.ok(
      appCommandsContent.includes("titleKey") &&
        appCommandsContent.includes("descriptionKey") &&
        appCommandsContent.includes("ariaLabelKey") &&
        appCommandsContent.includes("handlerId"),
      "命令模板应集中声明 i18n key 与 handlerId",
    );
    for (const field of ["title", "description", "ariaLabel", "label"]) {
      assert.ok(
        !new RegExp(`(^|[,{]\\s*)${field}\\s*:`, "m").test(appCommandsContent),
        `命令模板不应包含原始文案字段 ${field}`,
      );
    }
    assert.ok(
      useAppCommandsContent.includes("client.command.register") &&
        useAppCommandsContent.includes("client.command.invoke") &&
        useAppCommandsContent.includes("client.command.onInvoked"),
      "命令运行时应通过 SDK command API 注册、调用并监听 handlerId",
    );
    for (const requiredText of [
      "ChipsEnvironmentProvider",
      "ChipsThemeProvider",
      "useChipsClient",
      "useChipsTheme",
      "useChipsI18n",
      "useChipsI18nText",
      "useChipsSurface",
      "useChipsPermission",
      "useChipsDiagnostics",
      "useAppRuntime",
      "AppRuntimeProvider",
      "setLocale",
      "supportedLocales",
    ]) {
      assert.ok(
        appRuntimeContent.includes(requiredText),
        `根组件应通过 React Environment 正式入口消费 ${requiredText}`,
      );
    }
    assert.ok(
      appSourceContent.includes('export { AppRoot as App } from "./app/AppRoot";'),
      "src/App.tsx 应保持轻量 re-export，由 src/app/AppRoot.tsx 承载真实根组件",
    );
    assert.ok(
      useAppCommandsContent.includes("useChipsClient") &&
        !useAppCommandsContent.includes("../runtime/chips-client"),
      "命令运行时应从 Environment 注入的 SDK client 获取 command API",
    );
    assert.ok(
      !useAppCommandsContent.includes('window.chips.invoke("command.') &&
        !useAppCommandsContent.includes("BrowserWindow") &&
        !useAppCommandsContent.includes("ipcRenderer"),
      "命令运行时不得绕过 SDK 直连 Host/Electron",
    );
    const localesContent = await readFile(localesPath, "utf8");
    assert.ok(
      localesContent.includes("export const localeBundles") &&
        localesContent.includes("export const supportedLocales"),
      "本地 i18n adapter 应导出语言包与支持语言列表，供渲染期同步文案和切换入口复用",
    );
    assert.ok(
      appTestContent.includes("createChipsI18nText") &&
        appTestContent.includes("localeBundles") &&
        appTestContent.includes("supportedLocales") &&
        appTestContent.includes("app.shell.languageSwitch"),
      "App 单元测试应覆盖同步 i18n adapter、fallback 与语言切换文案 key",
    );
    assert.ok(
      commandTestContent.includes("chips-sdk/testing") &&
        commandTestContent.includes("createMockChipsClient") &&
        commandTestContent.includes("client.calls") &&
        commandTestContent.includes("command.onInvoked"),
      "Command 单元测试应复用 SDK testing mock host 覆盖命令 action 与事件链路",
    );
    await assert.rejects(
      stat(path.join(targetDir, "src/hooks/useChipsBridge.ts")),
      { code: "ENOENT" },
      "初始化工程不应生成旧的 useChipsBridge 私有入口",
    );
    await assert.rejects(
      stat(path.join(targetDir, "src/components/ExamplePanel.tsx")),
      { code: "ENOENT" },
      "初始化工程不应生成旧 ExamplePanel 示例组件",
    );
    assert.ok(
      !/style=\{\{/.test(appRuntimeContent),
      "初始化工程源码不应使用 inline style",
    );
    assert.ok(
      !/\bapp-standard\b|\bchips-scaffold-app\b|\bExamplePanel\b/.test(appRuntimeContent),
      "初始化工程源码不应泄漏模板身份或旧示例面板",
    );
    for (const key of [
      "openWorkspace",
      "refreshTheme",
      "toolbar",
      "palette",
      "lastInvoked",
    ]) {
      assert.ok(zhCnContent.includes(key), `中文 i18n 应包含 command key：${key}`);
      assert.ok(enUsContent.includes(key), `英文 i18n 应包含 command key：${key}`);
    }
    for (const key of ["languageSwitch"]) {
      assert.ok(zhCnContent.includes(key), `中文 i18n 应包含语言切换 key：${key}`);
      assert.ok(enUsContent.includes(key), `英文 i18n 应包含语言切换 key：${key}`);
    }

    for (const dirName of FORBIDDEN_PROJECT_DIRS) {
      await assert.rejects(
        stat(path.join(targetDir, dirName)),
        { code: "ENOENT" },
        `初始化工程不应生成 ${dirName}/ 目录`,
      );
    }
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});
