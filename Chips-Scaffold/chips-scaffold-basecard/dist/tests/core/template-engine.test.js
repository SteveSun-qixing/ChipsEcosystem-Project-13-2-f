"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_os_1 = __importDefault(require("node:os"));
const path = __importStar(require("node:path"));
const node_fs_1 = require("node:fs");
const template_engine_1 = require("../../src/core/template-engine");
const FORBIDDEN_PROJECT_DIRS = [
    "需求文档",
    "技术文档",
    "技术手册",
    "开发计划",
];
async function removeDirIfExists(dir) {
    try {
        await node_fs_1.promises.rm(dir, { recursive: true, force: true });
    }
    catch {
        // 忽略清理错误
    }
}
(0, vitest_1.describe)("template-engine", () => {
    (0, vitest_1.it)("lists available templates", async () => {
        const templates = await (0, template_engine_1.listAvailableTemplates)();
        const ids = templates.map((t) => t.id);
        (0, vitest_1.expect)(ids).toContain("card-standard");
    });
    (0, vitest_1.it)("renders card-standard template to target directory", async () => {
        const tempRoot = await node_fs_1.promises.mkdtemp(path.join(node_os_1.default.tmpdir(), "chips-basecard-scaffold-test-"));
        const targetDir = path.join(tempRoot, "card-standard-project");
        try {
            const options = {
                projectName: "card-standard-project",
                targetDir,
                templateId: "card-standard",
                pluginId: "com.example.card-standard",
                cardType: "base.text",
                displayName: "Standard Basecard Plugin",
                version: "0.1.0",
                authorName: "Scaffold",
                authorEmail: "dev@example.com",
            };
            const result = await (0, template_engine_1.renderTemplateToTarget)(options);
            (0, vitest_1.expect)(result.projectDir).toBe(targetDir);
            (0, vitest_1.expect)(result.templateId).toBe("card-standard");
            (0, vitest_1.expect)(result.filesCreated).toBeGreaterThan(0);
            const manifest = await node_fs_1.promises.readFile(path.join(targetDir, "manifest.yaml"), "utf8");
            const pkg = JSON.parse(await node_fs_1.promises.readFile(path.join(targetDir, "package.json"), "utf8"));
            (0, vitest_1.expect)(manifest).toMatch(/type:\s+card/);
            (0, vitest_1.expect)(manifest).toMatch(/capabilities:/);
            await (0, vitest_1.expect)(node_fs_1.promises.stat(path.join(targetDir, ".eslintrc.cjs"))).resolves.toBeTruthy();
            await (0, vitest_1.expect)(node_fs_1.promises.stat(path.join(targetDir, "src", "shared", "i18n.ts"))).resolves.toBeTruthy();
            await (0, vitest_1.expect)(node_fs_1.promises.stat(path.join(targetDir, "tests", "unit", "schema.test.ts"))).resolves.toBeTruthy();
            (0, vitest_1.expect)(pkg.dependencies.react).toBe("^18.2.0");
            (0, vitest_1.expect)(pkg.dependencies["react-dom"]).toBe("^18.2.0");
            (0, vitest_1.expect)(pkg.devDependencies["@types/react"]).toBe("^18.2.66");
            (0, vitest_1.expect)(pkg.devDependencies.eslint).toBe("^8.57.1");
            (0, vitest_1.expect)(pkg.devDependencies["@typescript-eslint/parser"]).toBe("^7.18.0");
            (0, vitest_1.expect)(pkg.devDependencies["chips-sdk"]).toBe("^0.1.0");
            const readme = await node_fs_1.promises.readFile(path.join(targetDir, "README.md"), "utf8");
            const indexTs = await node_fs_1.promises.readFile(path.join(targetDir, "src", "index.ts"), "utf8");
            (0, vitest_1.expect)(readme).toMatch(/Standard Basecard Plugin/);
            (0, vitest_1.expect)(readme).toMatch(/basecardDefinition/);
            (0, vitest_1.expect)(indexTs).toMatch(/export const basecardDefinition/);
            (0, vitest_1.expect)(indexTs).toMatch(/export function renderBasecardView/);
            (0, vitest_1.expect)(indexTs).toMatch(/export function renderBasecardEditor/);
            (0, vitest_1.expect)(indexTs).toMatch(/cardType:\s*"base\.text"/);
            (0, vitest_1.expect)(indexTs).toMatch(/pluginId:\s*"com\.example\.card-standard"/);
            for (const dirName of FORBIDDEN_PROJECT_DIRS) {
                await (0, vitest_1.expect)(node_fs_1.promises.stat(path.join(targetDir, dirName))).rejects.toMatchObject({
                    code: "ENOENT",
                });
            }
        }
        finally {
            await removeDirIfExists(tempRoot);
        }
    });
});
