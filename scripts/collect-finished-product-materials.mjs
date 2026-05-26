import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const workspaceRoot = process.cwd();
const testingSpaceRoot = path.join(workspaceRoot, "ProductFinishedProductTestingSpace");
const taskRoot = path.join(
  workspaceRoot,
  "项目日志与笔记/task022-优化薯片组件库和主题系统"
);

const defaultOutputJson = path.join(
  taskRoot,
  "08-草稿笔记/任务056.01-真实素材清单矩阵-20260526.json"
);
const defaultOutputMd = path.join(
  taskRoot,
  "08-草稿笔记/任务056.01-真实素材清单矩阵-20260526.md"
);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const [key, ...valueParts] = process.argv[index].split("=");
  if (key.startsWith("--")) {
    args.set(key.slice(2), valueParts.join("=") || "true");
  }
}

const outputJson = path.resolve(workspaceRoot, args.get("output-json") ?? defaultOutputJson);
const outputMd = path.resolve(workspaceRoot, args.get("output-md") ?? defaultOutputMd);

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif"]);
const audioExtensions = new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
const webExtensions = new Set([".html", ".css", ".js"]);

const baseCardPluginByType = new Map([
  ["base.richtext", "chips.basecard.richtext"],
  ["RichTextCard", "chips.basecard.richtext"],
  ["base.image", "chips.basecard.image"],
  ["ImageCard", "chips.basecard.image"],
  ["base.music", "chips.basecard.music"],
  ["MusicCard", "chips.basecard.music"],
  ["base.video", "chips.basecard.video"],
  ["VideoCard", "chips.basecard.video"],
  ["base.book", "chips.basecard.book"],
  ["BookCard", "chips.basecard.book"],
  ["base.webpage", "chips.basecard.webpage"],
  ["WebPageCard", "chips.basecard.webpage"],
  ["base.score", "chips.basecard.score"],
  ["ScoreCard", "chips.basecard.score"],
  ["base.hyperlink", "chips.basecard.hyperlink"],
  ["HyperlinkCard", "chips.basecard.hyperlink"],
]);

const taskByCategory = new Map([
  ["card", "056.02"],
  ["box", "056.02"],
  ["image", "056.03"],
  ["audio", "056.03"],
  ["video", "056.03"],
  ["ebook", "056.03"],
  ["image-archive", "056.03"],
  ["web-archive", "056.03"],
  ["web-directory-asset", "056.03"],
  ["food-source-image", "056.03"],
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("ZIP end of central directory was not found.");
}

function parseZipEntries(buffer) {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at offset ${offset}.`);
    }
    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    entries.push({
      name,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      compressionMethod,
    });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readStoredEntryText(buffer, entry) {
  if (entry.compressionMethod !== 0) {
    throw new Error(`ZIP entry ${entry.name} is not stored with method 0.`);
  }
  const offset = entry.localHeaderOffset;
  if (readUInt32(buffer, offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entry.name}.`);
  }
  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  return buffer.subarray(dataOffset, dataOffset + entry.uncompressedSize).toString("utf8");
}

function readZipArchive(filePath) {
  const buffer = fs.readFileSync(filePath);
  const entries = parseZipEntries(buffer);
  const entryMap = new Map(entries.map((entry) => [entry.name, entry]));

  const readText = (entryName) => {
    const entry = entryMap.get(entryName);
    if (!entry) {
      throw new Error(`Missing ZIP entry: ${entryName}`);
    }
    return readStoredEntryText(buffer, entry);
  };

  const readYaml = (entryName) => parseYaml(readText(entryName));

  return {
    entries,
    entryMap,
    readText,
    readYaml,
    storeMode: entries.every((entry) => entry.compressionMethod === 0),
  };
}

function collectFiles(rootDir) {
  const results = [];
  const visit = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (entry.isFile()) {
        results.push(nextPath);
      }
    }
  };
  visit(rootDir);
  return results.sort((left, right) => left.localeCompare(right));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function classifyArchive(relativePath) {
  if (/电子书图片\.zip$/u.test(relativePath)) {
    return "image-archive";
  }
  if (/网页\.zip$/u.test(relativePath)) {
    return "web-archive";
  }
  return "archive";
}

function baseOperationsForCategory(category) {
  if (category === "card") {
    return [
      "card.validate",
      "card.readInfo",
      "card.renderCover",
      "card.render",
      "card.renderEditor",
      "card.unpack",
      "card.pack",
      "card.revalidate",
    ];
  }
  if (category === "box") {
    return [
      "box.validate",
      "box.inspect",
      "box.openView",
      "box.renderLayoutFrame",
      "box.renderLayoutEditor",
      "box.renderEntryCover",
      "box.openEntry",
      "box.unpack",
      "box.pack",
      "box.revalidate",
    ];
  }
  if (category === "image" || category === "food-source-image") {
    return ["resource.open", "photo-viewer.open", "color.extract"];
  }
  if (category === "audio") {
    return ["resource.open", "music-player.open", "file-conversion.inspect"];
  }
  if (category === "video") {
    return ["resource.open", "video-player.open", "file-conversion.inspect"];
  }
  if (category === "ebook") {
    return ["resource.open", "book-reader.open", "book-card.payload"];
  }
  if (category === "image-archive") {
    return ["resource.open", "photo-viewer.image-sequence", "book-card.archive"];
  }
  if (category === "web-archive" || category === "web-directory-asset") {
    return ["resource.open", "webpage-card.package", "file-conversion.inspect"];
  }
  return [];
}

function expectedEntryForCategory(category) {
  if (category === "card") {
    return "Host card services, CardViewer, EditingEngine";
  }
  if (category === "box") {
    return "Host box services, CardViewer, EditingEngine, box layout plugin";
  }
  if (category === "image" || category === "food-source-image") {
    return "PhotoViewer, image base card, ColorPicker";
  }
  if (category === "audio") {
    return "MusicPlayer, music base card";
  }
  if (category === "video") {
    return "VideoPlayer, video base card";
  }
  if (category === "ebook") {
    return "BookReader, book base card";
  }
  if (category === "image-archive") {
    return "PhotoViewer image sequence, book base card";
  }
  if (category === "web-archive" || category === "web-directory-asset") {
    return "webpage base card, resource.open";
  }
  return "";
}

function inferCategory(relativePath, extension, archived) {
  if (archived) {
    return "archived";
  }
  if (relativePath === "AGENTS.md") {
    return "workspace-rule";
  }
  if (relativePath === ".DS_Store") {
    return "system-metadata";
  }
  if (extension === ".card") {
    return "card";
  }
  if (extension === ".box") {
    return "box";
  }
  if (imageExtensions.has(extension)) {
    return relativePath.startsWith("美食图片/") ? "food-source-image" : "image";
  }
  if (audioExtensions.has(extension)) {
    return "audio";
  }
  if (videoExtensions.has(extension)) {
    return "video";
  }
  if (extension === ".epub") {
    return "ebook";
  }
  if (extension === ".zip") {
    return classifyArchive(relativePath);
  }
  if (relativePath.startsWith("昙花/") && webExtensions.has(extension)) {
    return "web-directory-asset";
  }
  return "other";
}

function inspectCard(filePath) {
  const archive = readZipArchive(filePath);
  const metadata = archive.readYaml(".card/metadata.yaml") ?? {};
  const structure = archive.readYaml(".card/structure.yaml") ?? {};
  const structureNodes = Array.isArray(structure.structure) ? structure.structure : [];
  const structureTypes = structureNodes.map((node) => node?.type).filter(Boolean);
  const contentEntries = archive.entries.filter((entry) => /^content\/[^/]+\.ya?ml$/u.test(entry.name));
  const contentTypes = [];
  for (const entry of contentEntries) {
    try {
      const parsed = parseYaml(readStoredEntryText(fs.readFileSync(filePath), entry));
      if (parsed?.card_type) {
        contentTypes.push(parsed.card_type);
      }
      if (parsed?.type) {
        contentTypes.push(parsed.type);
      }
    } catch {
      // Individual content cards can still be covered by the package-level status.
    }
  }
  const cardTypes = unique([...structureTypes, ...contentTypes]);
  const pluginIds = unique(cardTypes.map((type) => baseCardPluginByType.get(type)));
  const manifestResources = Array.isArray(structure.manifest?.resources)
    ? structure.manifest.resources
    : [];

  return {
    zip: {
      entryCount: archive.entries.length,
      storeMode: archive.storeMode,
      requiredEntriesPresent: [
        ".card/metadata.yaml",
        ".card/structure.yaml",
        ".card/cover.html",
      ].every((entryName) => archive.entryMap.has(entryName)),
    },
    metadata: {
      id: metadata.card_id,
      name: metadata.name,
      standardsVersion: metadata.chip_standards_version,
      coverRatio: metadata.cover_ratio,
      theme: metadata.theme,
    },
    cardTypes,
    pluginIds,
    contentFileCount: contentEntries.length,
    manifestResourceCount: manifestResources.length,
    coverEntry: archive.entryMap.has(".card/cover.html") ? ".card/cover.html" : null,
  };
}

function inspectBox(filePath) {
  const archive = readZipArchive(filePath);
  const metadata = archive.readYaml(".box/metadata.yaml") ?? {};
  const content = archive.readYaml(".box/content.yaml") ?? {};
  const structure = archive.readYaml(".box/structure.yaml") ?? {};
  const entries = Array.isArray(structure.entries) ? structure.entries : [];
  const urls = entries.map((entry) => entry?.url).filter((url) => typeof url === "string");
  const oldWorkspaceUrlCount = urls.filter((url) => url.includes("/Project-13-2-f/ProductFinishedProductTestingSpace/")).length;

  return {
    zip: {
      entryCount: archive.entries.length,
      storeMode: archive.storeMode,
      requiredEntriesPresent: [
        ".box/metadata.yaml",
        ".box/structure.yaml",
        ".box/content.yaml",
        ".box/cover.html",
      ].every((entryName) => archive.entryMap.has(entryName)),
    },
    metadata: {
      id: metadata.box_id,
      name: metadata.name,
      standardsVersion: metadata.chip_standards_version,
      coverRatio: metadata.cover_ratio,
      activeLayoutType: metadata.active_layout_type,
    },
    activeLayoutType: content.active_layout_type ?? metadata.active_layout_type,
    entryCount: entries.length,
    enabledEntryCount: entries.filter((entry) => entry?.enabled === true).length,
    snapshotContentTypes: unique(entries.map((entry) => entry?.snapshot?.content_type)),
    oldWorkspaceUrlCount,
    requiresCurrentWorktreeUrlPreparation: oldWorkspaceUrlCount > 0,
  };
}

function inspectZip(filePath) {
  const archive = readZipArchive(filePath);
  return {
    zip: {
      entryCount: archive.entries.length,
      storeMode: archive.storeMode,
    },
    topEntries: archive.entries.slice(0, 12).map((entry) => entry.name),
  };
}

function inspectMaterial(filePath) {
  const relativePath = toPosix(path.relative(testingSpaceRoot, filePath));
  const stat = fs.statSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const archived = relativePath === "归档" || relativePath.startsWith("归档/");
  const category = inferCategory(relativePath, extension, archived);
  const includeInRegression = ![
    "archived",
    "workspace-rule",
    "system-metadata",
    "other",
    "archive",
  ].includes(category);

  const material = {
    path: relativePath,
    sizeBytes: stat.size,
    extension: extension || null,
    category,
    includeInRegression,
    assignedTask: includeInRegression ? (taskByCategory.get(category) ?? null) : null,
    expectedEntry: expectedEntryForCategory(category),
    operations: includeInRegression ? baseOperationsForCategory(category) : [],
    notes: [],
  };

  if (archived) {
    material.notes.push("归档素材仅作历史参考，不纳入任务056首轮正式通过项。");
    return material;
  }
  if (category === "workspace-rule") {
    material.notes.push("测试空间规则文件，不属于用户素材。");
    return material;
  }
  if (category === "system-metadata") {
    material.notes.push("系统元数据文件，不属于用户素材。");
    return material;
  }

  try {
    if (category === "card") {
      Object.assign(material, inspectCard(filePath));
    } else if (category === "box") {
      Object.assign(material, inspectBox(filePath));
      if (material.requiresCurrentWorktreeUrlPreparation) {
        material.notes.push("箱子条目仍包含源工作区 file:// URL，自动化回归应使用临时派生副本改写到当前 worktree。");
      }
    } else if (["image-archive", "web-archive", "archive"].includes(category)) {
      Object.assign(material, inspectZip(filePath));
    }
  } catch (error) {
    material.includeInRegression = false;
    material.assignedTask = null;
    material.parseError = error instanceof Error ? error.message : String(error);
  }

  return material;
}

function summarize(materials) {
  const byCategory = {};
  const includedByCategory = {};
  for (const material of materials) {
    byCategory[material.category] = (byCategory[material.category] ?? 0) + 1;
    if (material.includeInRegression) {
      includedByCategory[material.category] = (includedByCategory[material.category] ?? 0) + 1;
    }
  }
  return {
    totalFiles: materials.length,
    includedRegressionFiles: materials.filter((material) => material.includeInRegression).length,
    archivedFiles: materials.filter((material) => material.category === "archived").length,
    byCategory,
    includedByCategory,
  };
}

function renderMarkdown(report) {
  const lines = [
    "# 任务056.01：真实素材清单矩阵",
    "",
    `生成时间：${report.generatedAt}`,
    "",
    "## 摘要",
    "",
    `- 文件总数：${report.summary.totalFiles}`,
    `- 纳入任务056正式回归：${report.summary.includedRegressionFiles}`,
    `- 归档历史素材：${report.summary.archivedFiles}`,
    "",
    "## 分类统计",
    "",
    "| 分类 | 文件数 | 纳入回归 |",
    "| --- | ---: | ---: |",
  ];

  const categories = unique(Object.keys(report.summary.byCategory));
  for (const category of categories) {
    lines.push(`| ${category} | ${report.summary.byCategory[category]} | ${report.summary.includedByCategory[category] ?? 0} |`);
  }

  lines.push(
    "",
    "## 正式回归素材",
    "",
    "| 路径 | 分类 | 归属任务 | 预期入口 | 关键类型/布局 | 操作链路 |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  for (const material of report.materials.filter((item) => item.includeInRegression)) {
    const typeSummary = material.category === "card"
      ? (material.cardTypes ?? []).join(", ")
      : material.category === "box"
        ? `${material.activeLayoutType ?? ""}; entries=${material.entryCount ?? 0}`
        : "";
    lines.push([
      `| ${material.path}`,
      material.category,
      material.assignedTask ?? "",
      material.expectedEntry,
      typeSummary || "-",
      `${material.operations.join(", ")} |`,
    ].join(" | "));
  }

  lines.push(
    "",
    "## 归档与非素材文件",
    "",
    "| 路径 | 分类 | 说明 |",
    "| --- | --- | --- |",
  );

  for (const material of report.materials.filter((item) => !item.includeInRegression)) {
    lines.push(`| ${material.path} | ${material.category} | ${(material.notes ?? []).join("；") || material.parseError || "不纳入任务056正式回归"} |`);
  }

  const findings = report.materials.flatMap((material) =>
    (material.notes ?? []).map((note) => ({ path: material.path, note }))
  ).filter((finding) => !finding.note.includes("不属于用户素材"));

  lines.push("", "## 关键发现", "");
  if (findings.length === 0) {
    lines.push("- 未发现需要在 056.01 阶段处理的素材清单问题。");
  } else {
    for (const finding of findings) {
      lines.push(`- ${finding.path}：${finding.note}`);
    }
  }

  lines.push(
    "",
    "## 后续任务使用方式",
    "",
    "- `056.02` 使用 `category=card/box` 的素材作为 Host、CardViewer、EditingEngine 和布局链路输入。",
    "- `056.03` 使用独立图片、音频、视频、EPUB、图片 ZIP、网页 ZIP 和网页目录素材作为媒体应用输入。",
    "- `056.04` 复用卡片、网页、图片和媒体素材验证模块转换、编辑保存与导出链路。",
    "- `056.05` 汇总本清单和后续验证结果，形成默认/暗色主题、多语言和真实素材回归报告。",
    ""
  );

  return `${lines.join("\n")}\n`;
}

if (!fs.existsSync(testingSpaceRoot)) {
  throw new Error(`ProductFinishedProductTestingSpace was not found at ${testingSpaceRoot}`);
}

const materials = collectFiles(testingSpaceRoot).map(inspectMaterial);
const report = {
  generatedAt: "2026-05-26T00:00:00+08:00",
  testingSpaceRoot: "ProductFinishedProductTestingSpace",
  summary: summarize(materials),
  materials,
};

fs.mkdirSync(path.dirname(outputJson), { recursive: true });
fs.mkdirSync(path.dirname(outputMd), { recursive: true });
fs.writeFileSync(outputJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
fs.writeFileSync(outputMd, renderMarkdown(report), "utf8");

console.log(`真实素材清单已生成：${path.relative(workspaceRoot, outputJson)}`);
console.log(`真实素材矩阵已生成：${path.relative(workspaceRoot, outputMd)}`);
