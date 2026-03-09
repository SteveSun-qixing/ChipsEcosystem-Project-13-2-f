import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rootPackagePath = path.join(root, "package.json");
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, "utf8"));

const expectedWorkspacePatterns = [
  "Chips-*",
  "Chips-BaseCardPlugin/*",
  "Chips-ComponentLibrary/packages/*",
  "Chips-ComponentLibrary/packages/adapters/*",
  "Chips-Scaffold/*",
  "ThemePack/*"
];

const requiredWorkspaceSpecs = new Map([
  ["Chips-CardViewer/package.json", new Map([
    ["dependencies.@chips/component-library", "^0.1.0"],
    ["devDependencies.chips-sdk", "^0.1.0"]
  ])],
  ["Chips-BaseCardPlugin/richtext-BCP/package.json", new Map([
    ["devDependencies.chips-sdk", "^0.1.0"]
  ])],
  ["Chips-ComponentLibrary/packages/component-library/package.json", new Map([
    ["dependencies.@chips/hooks", "0.1.0"],
    ["dependencies.@chips/components", "0.1.0"],
    ["dependencies.@chips/card-runtime", "0.1.0"]
  ])]
]);

const requiredTemplateSpecs = new Map([
  ["Chips-Scaffold/chips-scaffold-app/templates/app-standard/package.json.tpl", [
    "\"@chips/component-library\": \"^0.1.0\"",
    "\"chips-sdk\": \"^0.1.0\""
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-standard/package.json.tpl", [
    "\"jsdom\": \"^28.1.0\"",
    "\"chips-sdk\": \"^0.1.0\""
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-text-basic/package.json.tpl", [
    "\"jsdom\": \"^28.1.0\"",
    "\"chips-sdk\": \"^0.1.0\""
  ]]
]);

const requiredTemplateFiles = new Map([
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-standard", [
    "vitest.config.mts.tpl",
    "chips.config.mjs.tpl",
    "manifest.yaml.tpl"
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-text-basic", [
    "vitest.config.mts.tpl",
    "chips.config.mjs.tpl",
    "manifest.yaml.tpl"
  ]]
]);

const requiredTemplateContent = new Map([
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-standard/chips.config.mjs.tpl", [
    'type: "card"',
    'testsDir: "./tests"'
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-standard/manifest.yaml.tpl", [
    "entry: dist/index.mjs"
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-standard/vitest.config.mts.tpl", [
    'environment: "jsdom"'
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-text-basic/chips.config.mjs.tpl", [
    'type: "card"',
    'testsDir: "./tests"'
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-text-basic/manifest.yaml.tpl", [
    "entry: dist/index.mjs"
  ]],
  ["Chips-Scaffold/chips-scaffold-basecard/templates/card-text-basic/vitest.config.mts.tpl", [
    'environment: "jsdom"'
  ]]
]);

const getByPath = (value, dottedPath) => {
  return dottedPath.split(".").reduce((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    return current[key];
  }, value);
};

const errors = [];

for (const pattern of expectedWorkspacePatterns) {
  if (!rootPackage.workspaces || !rootPackage.workspaces.includes(pattern)) {
    errors.push(`缺少根 workspace 模式：${pattern}`);
  }
}

for (const [relativePath, expectations] of requiredWorkspaceSpecs) {
  const absolutePath = path.join(root, relativePath);
  const manifest = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  for (const [fieldPath, expectedValue] of expectations) {
    const actualValue = getByPath(manifest, fieldPath);
    if (actualValue !== expectedValue) {
      errors.push(`${relativePath} 的 ${fieldPath} 应为 ${expectedValue}，当前为 ${String(actualValue)}`);
    }
  }
}

for (const [relativePath, snippets] of requiredTemplateSpecs) {
  const absolutePath = path.join(root, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  if (content.includes("file:")) {
    errors.push(`${relativePath} 不允许再出现 file: 依赖。`);
  }
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      errors.push(`${relativePath} 缺少依赖声明：${snippet}`);
    }
  }
}

for (const [relativeDir, fileNames] of requiredTemplateFiles) {
  const absoluteDir = path.join(root, relativeDir);
  for (const fileName of fileNames) {
    const absolutePath = path.join(absoluteDir, fileName);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`${relativeDir} 缺少模板文件：${fileName}`);
    }
  }
}

for (const [relativePath, snippets] of requiredTemplateContent) {
  const absolutePath = path.join(root, relativePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      errors.push(`${relativePath} 缺少必要内容：${snippet}`);
    }
  }
}

if (errors.length > 0) {
  console.error("生态工作区校验失败：");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("生态工作区校验通过。");
