import { execSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const run = (cmd: string, cwd: string): void => {
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, CI: "true" } });
};

describe("theme build pipeline", () => {
  it("runs build script without errors", () => {
    const projectRoot = path.resolve(__dirname, "..");
    // 这里假定依赖已安装，脚本在 CI 或本地开发环境中执行。
    run("npm run build", projectRoot);
    expect(true).toBe(true);
  });
});

