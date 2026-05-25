import { existsSync } from "node:fs";
import { resolve } from "node:path";

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

export function expectRealDocumentFixturesAvailable(names: RealDocumentFixtureName[]): void {
  for (const name of names) {
    if (!existsSync(realDocumentFixtures[name])) {
      throw new Error(`Missing ProductFinishedProductTestingSpace fixture: ${name}`);
    }
  }
}
