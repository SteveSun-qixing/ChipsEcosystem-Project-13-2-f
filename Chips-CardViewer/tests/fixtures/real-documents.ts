import { existsSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const workspaceRoot = resolve(__dirname, "../../..");
const testingSpaceRoot = resolve(workspaceRoot, "ProductFinishedProductTestingSpace");

export const realDocumentFixtures = {
  compositeCard: resolve(testingSpaceRoot, "集大成者.card"),
  richTextCard: resolve(testingSpaceRoot, "富文本基础卡片.card"),
  markdownCard: resolve(testingSpaceRoot, "Markdown语法测试.card"),
  mediaCard: resolve(testingSpaceRoot, "视频音乐卡片.card"),
  foodGridBox: resolve(testingSpaceRoot, "美食网格箱子.box"),
} as const;

export type RealDocumentFixtureName = keyof typeof realDocumentFixtures;

function isArchivedTestingSpacePath(filePath: string): boolean {
  const relativePath = relative(testingSpaceRoot, filePath);
  return relativePath === "归档" || relativePath.startsWith(`归档${sep}`);
}

function collectRealDocumentsByExtension(extension: ".card" | ".box"): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const nextPath = resolve(directory, entry.name);
      if (isArchivedTestingSpacePath(nextPath)) {
        continue;
      }
      if (entry.isDirectory()) {
        visit(nextPath);
        continue;
      }
      if (entry.isFile() && nextPath.endsWith(extension)) {
        files.push(nextPath);
      }
    }
  };
  visit(testingSpaceRoot);
  return files.sort((left, right) => left.localeCompare(right));
}

export const allRealCardDocuments = collectRealDocumentsByExtension(".card");
export const allRealBoxDocuments = collectRealDocumentsByExtension(".box");
export const allRealDocumentPaths = [
  ...allRealCardDocuments,
  ...allRealBoxDocuments,
];

export function formatRealDocumentPath(filePath: string): string {
  return relative(testingSpaceRoot, filePath).split(sep).join("/");
}

export function expectRealDocumentFixturesAvailable(names: RealDocumentFixtureName[]): void {
  for (const name of names) {
    if (!existsSync(realDocumentFixtures[name])) {
      throw new Error(`Missing ProductFinishedProductTestingSpace fixture: ${name}`);
    }
  }
}

export function expectAllRealDocumentsAvailable(): void {
  if (allRealCardDocuments.length !== 21) {
    throw new Error(`Expected 21 real .card fixtures, found ${allRealCardDocuments.length}.`);
  }
  if (allRealBoxDocuments.length !== 1) {
    throw new Error(`Expected 1 real .box fixture, found ${allRealBoxDocuments.length}.`);
  }
  for (const filePath of allRealDocumentPaths) {
    if (!existsSync(filePath)) {
      throw new Error(`Missing ProductFinishedProductTestingSpace fixture: ${formatRealDocumentPath(filePath)}`);
    }
  }
}
