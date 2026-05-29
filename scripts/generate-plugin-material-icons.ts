import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createIcnsFile } from "../Chip-iconMaker/src/icon-workbench/icns";
import { createIcoFile } from "../Chip-iconMaker/src/icon-workbench/ico";

type IconKind = "app" | "basecard" | "layout" | "module" | "theme" | "template";

interface IconTarget {
  kind: IconKind;
  sourceBaseName: string;
  materialName: string;
  projectDir?: string;
  projectIconBaseName?: string;
}

const ROOT = process.cwd();
const SIZE = 512;
const SYNC_DATE = "2026-05-29";
const MATERIAL_SVG_DIR = path.join(ROOT, "design-assets/material-symbols/svg/rounded");
const MATERIAL_SVG_BASE_URL = "https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web";

const OUTPUT_SIZES = [16, 32, 64, 128, 256, 512] as const;
const ICNS_TYPES_BY_SIZE = new Map<number, string>([
  [16, "ic04"],
  [32, "ic05"],
  [64, "ic12"],
  [128, "ic07"],
  [256, "ic08"],
  [512, "ic09"],
]);

const TARGETS: IconTarget[] = [
  {
    kind: "template",
    sourceBaseName: "AppIcon",
    materialName: "apps",
    projectDir: "Chips-Scaffold/chips-scaffold-app/templates/app-standard",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "BookReader",
    materialName: "menu_book",
    projectDir: "Chips-BookReader",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "CardViewer",
    materialName: "dashboard",
    projectDir: "Chips-CardViewer",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "EcoSettingsPanel",
    materialName: "settings",
    projectDir: "Chips-EcoSettingsPanel",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "EditingEngine",
    materialName: "edit_note",
    projectDir: "Chips-EditingEngine",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "IconMaker",
    materialName: "palette",
    projectDir: "Chip-iconMaker",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "MusicPlayer",
    materialName: "library_music",
    projectDir: "Chips-MusicPlayer",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "PhotoViewer",
    materialName: "image",
    projectDir: "Chips-PhotoViewer",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "RichTextEditor",
    materialName: "draw",
    projectDir: "Chips-RichTextEditor",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "app",
    sourceBaseName: "VideoPlayer",
    materialName: "movie",
    projectDir: "Chips-VideoPlayer",
    projectIconBaseName: "app-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "book-BCP",
    materialName: "book_2",
    projectDir: "Chips-BaseCardPlugin/book-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "hyperlink-BCP",
    materialName: "link",
    projectDir: "Chips-BaseCardPlugin/hyperlink-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "image-BCP",
    materialName: "image",
    projectDir: "Chips-BaseCardPlugin/image-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "music-BCP",
    materialName: "music_note",
    projectDir: "Chips-BaseCardPlugin/music-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "richtext-BCP",
    materialName: "article",
    projectDir: "Chips-BaseCardPlugin/richtext-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "score-BCP",
    materialName: "star",
    projectDir: "Chips-BaseCardPlugin/score-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "video-BCP",
    materialName: "smart_display",
    projectDir: "Chips-BaseCardPlugin/video-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "basecard",
    sourceBaseName: "webpage-BCP",
    materialName: "web",
    projectDir: "Chips-BaseCardPlugin/webpage-BCP",
    projectIconBaseName: "basecard-icon",
  },
  {
    kind: "layout",
    sourceBaseName: "grid-BLP",
    materialName: "grid_view",
    projectDir: "Chips-BoxLayoutPlugin/grid-BLP",
    projectIconBaseName: "layout-icon",
  },
  {
    kind: "layout",
    sourceBaseName: "list-BLP",
    materialName: "view_list",
    projectDir: "Chips-BoxLayoutPlugin/list-BLP",
    projectIconBaseName: "layout-icon",
  },
  {
    kind: "module",
    sourceBaseName: "CardtoHTML",
    materialName: "html",
    projectDir: "Chips-ModulePlugin/Chips-CardtoHTML-Plugin",
    projectIconBaseName: "module-icon",
  },
  {
    kind: "module",
    sourceBaseName: "ColorPicker",
    materialName: "palette",
    projectDir: "Chips-ModulePlugin/Chips-ColorPicker",
    projectIconBaseName: "module-icon",
  },
  {
    kind: "module",
    sourceBaseName: "FileConversion",
    materialName: "sync_alt",
    projectDir: "Chips-ModulePlugin/Chips-FileConversion-Plugin",
    projectIconBaseName: "module-icon",
  },
  {
    kind: "module",
    sourceBaseName: "HtmltoImage",
    materialName: "image_search",
    projectDir: "Chips-ModulePlugin/Chips-HtmltoImage-Plugin",
    projectIconBaseName: "module-icon",
  },
  {
    kind: "module",
    sourceBaseName: "HtmltoPDF",
    materialName: "picture_as_pdf",
    projectDir: "Chips-ModulePlugin/Chips-HtmltoPDF-Plugin",
    projectIconBaseName: "module-icon",
  },
  {
    kind: "theme",
    sourceBaseName: "Chips-default",
    materialName: "light_mode",
  },
  {
    kind: "theme",
    sourceBaseName: "Chips-theme-default-dark",
    materialName: "dark_mode",
  },
];

function materialSvgPath(materialName: string): string {
  return path.join(MATERIAL_SVG_DIR, `${materialName}.svg`);
}

async function ensureMaterialSvg(materialName: string): Promise<string> {
  const svgPath = materialSvgPath(materialName);
  try {
    return await readFile(svgPath, "utf-8");
  } catch {
    const url = `${MATERIAL_SVG_BASE_URL}/${materialName}/materialsymbolsrounded/${materialName}_24px.svg`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Material SVG unavailable: ${materialName} (${response.status})`);
    }
    const svg = await response.text();
    if (!svg.includes("<svg") || !svg.includes("<path")) {
      throw new Error(`Material SVG invalid: ${materialName}`);
    }
    await mkdir(MATERIAL_SVG_DIR, { recursive: true });
    await writeFile(svgPath, svg, "utf-8");
    return svg;
  }
}

function wrapMaterialSvg(target: IconTarget, materialSvg: string): string {
  const pathData = [...materialSvg.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*>/g)]
    .map((match) => match[1])
    .filter(Boolean);
  if (pathData.length === 0) {
    throw new Error(`Material SVG has no path data: ${target.materialName}`);
  }
  const paths = pathData
    .map((data) => `  <path d="${data}" fill="#000000"/>`)
    .join("\n");

  return `<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 960 960" xmlns="http://www.w3.org/2000/svg">
  <title>${target.sourceBaseName} - Material Symbols ${target.materialName}</title>
  <rect x="0" y="0" width="960" height="960" fill="#ffffff"/>
  <g transform="translate(0 960)">
${paths}
  </g>
</svg>
`;
}

async function pngFor(svg: string, size: number): Promise<Uint8Array> {
  const buffer = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  return new Uint8Array(buffer);
}

async function renderFiles(target: IconTarget): Promise<Record<"svg" | "png" | "ico" | "icns", Uint8Array | string>> {
  const materialSvg = await ensureMaterialSvg(target.materialName);
  const svg = wrapMaterialSvg(target, materialSvg);
  const entries = await Promise.all(
    OUTPUT_SIZES.map(async (size) => ({
      size,
      pngBytes: await pngFor(svg, size),
    })),
  );
  const png = entries.find((entry) => entry.size === SIZE)?.pngBytes;
  if (!png) {
    throw new Error("PNG_SIZE_MISSING");
  }
  return {
    svg,
    png,
    ico: createIcoFile(entries),
    icns: createIcnsFile(
      entries.map((entry) => ({
        type: ICNS_TYPES_BY_SIZE.get(entry.size) ?? "ic09",
        pngBytes: entry.pngBytes,
      })),
    ),
  };
}

async function writeIconSet(directory: string, baseName: string, files: Awaited<ReturnType<typeof renderFiles>>): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${baseName}.svg`), files.svg, "utf-8");
  await writeFile(path.join(directory, `${baseName}.png`), files.png);
  await writeFile(path.join(directory, `${baseName}.ico`), files.ico);
  await writeFile(path.join(directory, `${baseName}.icns`), files.icns);
}

function sourceDirectoryFor(kind: IconKind): string {
  if (kind === "module") {
    return path.join(ROOT, "design-assets/Moduleicon");
  }
  if (kind === "basecard") {
    return path.join(ROOT, "design-assets/Basecardicon");
  }
  if (kind === "layout") {
    return path.join(ROOT, "design-assets/Layouticon");
  }
  if (kind === "theme") {
    return path.join(ROOT, "design-assets/Themeicon");
  }
  return path.join(ROOT, "design-assets/Appicon");
}

function relativePath(filePath: string): string {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function sourceDirectoryName(kind: IconKind): string {
  return relativePath(sourceDirectoryFor(kind));
}

function kindLabel(kind: IconKind): string {
  if (kind === "basecard") {
    return "基础卡片插件";
  }
  if (kind === "layout") {
    return "箱子布局插件";
  }
  if (kind === "module") {
    return "模块插件";
  }
  if (kind === "theme") {
    return "主题包身份";
  }
  if (kind === "template") {
    return "应用插件脚手架模板";
  }
  return "应用插件";
}

function outputBaseName(target: IconTarget): string {
  return target.projectIconBaseName ?? target.sourceBaseName;
}

function iconBoundary(target: IconTarget): string[] {
  if (target.kind === "app" || target.kind === "template") {
    return [
      `- \`${outputBaseName(target)}.ico\` 是 \`manifest.yaml -> ui.launcher.icon\` 的正式声明文件；`,
      "- Host 会按平台选择 `ico / icns / png` 作为系统入口图标；",
      "- 这些文件只属于系统入口与安装分发链路，不属于运行时 `ChipsIcon` 图标模型。",
    ];
  }
  if (target.kind === "basecard") {
    return [
      "- 基础卡片插件没有 `manifest.ui.launcher.icon`，这些文件不属于系统入口图标链路；",
      "- 运行时图标描述符以 `src/index.ts -> basecardDefinition.icon` 为准；",
      "- 查看器、编辑器和治理页渲染图标时仍应使用 `ChipsIcon + IconDescriptor`。",
    ];
  }
  if (target.kind === "layout") {
    return [
      "- 箱子布局插件没有 `manifest.ui.launcher.icon`，这些文件不属于系统入口图标链路；",
      "- 运行时图标描述符以 `src/index.ts -> layoutDefinition.icon` 为准；",
      "- 查看器、编辑器和治理页渲染图标时仍应使用 `ChipsIcon + IconDescriptor`。",
    ];
  }
  if (target.kind === "module") {
    return [
      "- 模块插件没有 `manifest.ui.launcher.icon`，这些文件不属于系统入口图标链路；",
      "- 当前作为模块静态身份资源保存在工程内，供模块治理、物料清点和后续运行时展示链路复用；",
      "- 运行时 UI 图标仍应使用 `ChipsIcon + IconDescriptor`。",
    ];
  }
  return [
    "- 主题包正式运行时图标链路为 `icons/variablefont/*.woff2` 与构建产物 `dist/icons/variablefont/`；",
    "- 本目录只保存主题包身份图标设计源，不写入主题包 `assets/icons/`；",
    "- 主题包运行时 UI 图标仍由 `ChipsIcon` 通过 Material Symbols 字体渲染。",
  ];
}

function designSourceIntro(kind: IconKind): string[] {
  if (kind === "app" || kind === "template") {
    return [
      "- 本目录保存应用插件系统入口图标的正式设计源；",
      "- 对应运行时消费链路为 `manifest.ui.launcher.icon`、Host 安装复制、快捷方式解析、安装分发与启动台入口；",
      "- 本目录不是运行时 UI 图标目录，运行时 UI 图标统一使用 `ChipsIcon + IconDescriptor`；",
      "- 模块、基础卡片、布局和主题身份图标分别使用各自的设计源目录，不混入本目录。",
    ];
  }
  if (kind === "basecard") {
    return [
      "- 本目录保存基础卡片插件静态身份图标的正式设计源；",
      "- 工程内同步到 `assets/icons/basecard-icon.*`，用于插件静态身份、物料清点和后续展示链路；",
      "- 基础卡片运行时图标仍以 `basecardDefinition.icon` 与 `ChipsIcon + IconDescriptor` 为准；",
      "- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。",
    ];
  }
  if (kind === "layout") {
    return [
      "- 本目录保存箱子布局插件静态身份图标的正式设计源；",
      "- 工程内同步到 `assets/icons/layout-icon.*`，用于插件静态身份、物料清点和后续展示链路；",
      "- 布局运行时图标仍以 `layoutDefinition.icon` 与 `ChipsIcon + IconDescriptor` 为准；",
      "- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。",
    ];
  }
  if (kind === "module") {
    return [
      "- 本目录保存模块插件静态身份图标的正式设计源；",
      "- 工程内同步到 `assets/icons/module-icon.*`，用于模块治理、物料清点和后续展示链路；",
      "- 模块插件没有 `manifest.ui.launcher.icon`，这些文件不属于系统入口图标链路；",
      "- 应用插件启动图标源目录仍为 `design-assets/Appicon/`。",
    ];
  }
  return [
    "- 本目录保存主题包身份图标的正式设计源；",
    "- 主题包正式运行时 UI 图标资源仍为 `icons/variablefont/*.woff2`，不从本目录复制到主题包 `assets/icons/`；",
    "- 本目录用于主题治理、物料清点和后续安装分发展示链路；",
    "- 本目录不属于 `manifest.ui.launcher.icon` 系统入口链路。",
  ];
}

function designSourceTitle(kind: IconKind): string {
  if (kind === "basecard") {
    return "基础卡片插件静态图标源目录说明";
  }
  if (kind === "layout") {
    return "箱子布局插件静态图标源目录说明";
  }
  if (kind === "module") {
    return "模块插件静态图标源目录说明";
  }
  if (kind === "theme") {
    return "主题包身份图标源目录说明";
  }
  return "应用启动图标源目录说明";
}

function designUpdateRules(kind: IconKind): string[] {
  const common = [
    "- 图标调整时，先更新本目录正式源文件，再通过 `scripts/generate-plugin-material-icons.ts` 同步所有输出；",
    "- 不再使用字体码位、HTML 文本渲染或截图方式生成图标，避免出现乱码；",
  ];
  if (kind === "theme") {
    return [
      ...common,
      "- 主题包身份图标只写入本设计源目录，不写入主题包 `assets/icons/`；",
      "- 主题包运行时 UI 图标仍通过生态正式 `ChipsIcon + IconDescriptor` 链路渲染。",
    ];
  }
  return [
    ...common,
    "- 每次改动本目录资产，必须同步更新本文件与对应工程 `assets/icons/SOURCE.md`；",
    "- 运行时 UI 图标仍通过生态正式 `ChipsIcon + IconDescriptor` 链路渲染。",
  ];
}

function projectSourceDocPath(target: IconTarget): string | null {
  if (!target.projectDir || !target.projectIconBaseName) {
    return null;
  }
  const fileName = target.kind === "template" ? "SOURCE.md.tpl" : "SOURCE.md";
  return path.join(ROOT, target.projectDir, "assets/icons", fileName);
}

async function writeDesignSourceDoc(kind: IconKind, targets: IconTarget[]): Promise<void> {
  const sourceDir = sourceDirectoryName(kind);
  const rows = targets
    .map((target) => {
      const output = target.projectDir && target.projectIconBaseName
        ? `\`${target.projectDir}/assets/icons/${target.projectIconBaseName}.png/.ico/.icns/.svg\``
        : "只输出设计源";
      return `| \`${target.sourceBaseName}\` | \`${target.materialName}\` | ${target.projectDir ? `\`${target.projectDir}\`` : "无工程输出"} | ${output} |`;
    })
    .join("\n");
  const content = `# ${designSourceTitle(kind)}

- 适用目录：\`${sourceDir}/\`
- 同步时间：${SYNC_DATE}
- 生成脚本：\`scripts/generate-plugin-material-icons.ts\`
- 上游 SVG 缓存：\`design-assets/material-symbols/svg/rounded/\`
- 视觉基线：白色背景、黑色 Material Symbols Rounded 图标。
- 转换链路：官方 Material Symbols Rounded SVG -> 512px 白底黑色 SVG/PNG -> iconMaker ICO/ICNS 编码器。

## 目录职责

${designSourceIntro(kind).join("\n")}

## 当前正式命名基线

| 源文件基名 | Material Symbols 名称 | 对应工程 | 正式输出物 |
| --- | --- | --- | --- |
${rows}

## 更新规则

${designUpdateRules(kind).join("\n")}
`;
  await writeFile(path.join(sourceDirectoryFor(kind), "SOURCE.md"), content, "utf-8");
}

async function writeProjectSourceDoc(target: IconTarget): Promise<void> {
  const docPath = projectSourceDocPath(target);
  if (!docPath) {
    return;
  }
  const baseName = outputBaseName(target);
  const sourceDir = sourceDirectoryName(target.kind);
  const sourceFile = `${target.sourceBaseName}.png/.ico/.icns/.svg`;
  const materialSource = `design-assets/material-symbols/svg/rounded/${target.materialName}.svg`;
  const title = target.kind === "template"
    ? "应用启动图标说明"
    : `${target.sourceBaseName} ${kindLabel(target.kind)}图标来源说明`;
  const content = `# ${title}

- 正式设计源目录：\`${sourceDir}/\`
- 对应设计源文件：\`${sourceFile}\`
- Material Symbols 名称：\`${target.materialName}\`
- 官方 SVG 缓存：\`${materialSource}\`
- 生成脚本：\`scripts/generate-plugin-material-icons.ts\`
- 同步时间：${SYNC_DATE}

## 当前工程内纳入版本控制的文件

- \`${baseName}.png\`
- \`${baseName}.ico\`
- \`${baseName}.icns\`
- \`${baseName}.svg\`

## 使用边界

${iconBoundary(target).join("\n")}
`;
  await writeFile(docPath, content, "utf-8");
}

async function writeSourceDocs(): Promise<void> {
  const grouped = new Map<IconKind, IconTarget[]>();
  for (const target of TARGETS) {
    const sourceKind = target.kind === "template" ? "app" : target.kind;
    grouped.set(sourceKind, [...(grouped.get(sourceKind) ?? []), target]);
    await writeProjectSourceDoc(target);
  }
  for (const [kind, targets] of grouped) {
    await writeDesignSourceDoc(kind, targets);
  }
}

async function main(): Promise<void> {
  const generated: string[] = [];

  for (const target of TARGETS) {
    const files = await renderFiles(target);
    await writeIconSet(sourceDirectoryFor(target.kind), target.sourceBaseName, files);
    generated.push(`${target.kind}:${target.sourceBaseName}:${target.materialName}`);

    if (target.projectDir && target.projectIconBaseName) {
      await writeIconSet(
        path.join(ROOT, target.projectDir, "assets/icons"),
        target.projectIconBaseName,
        files,
      );
    }
  }

  await writeSourceDocs();

  console.log(`Generated ${generated.length} icon sets`);
  for (const item of generated) {
    console.log(`- ${item}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
