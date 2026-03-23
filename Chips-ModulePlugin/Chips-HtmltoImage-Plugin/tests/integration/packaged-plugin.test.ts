import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentFilePath = fileURLToPath(import.meta.url);
const pluginRoot = path.resolve(path.dirname(currentFilePath), "../..");
const runnerPath = path.join(pluginRoot, "tests", "e2e", "run-packaged-plugin.cjs");

const runPackagedVerification = async (): Promise<{
  ok: boolean;
  outputFile: string;
  outputSize: number;
  width?: number;
  height?: number;
  format: string;
}> => {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runnerPath], {
      cwd: pluginRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `Packaged verification exited with code ${String(code)}`));
        return;
      }

      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("{") && line.endsWith("}"));
      const lastLine = lines.at(-1);

      if (!lastLine) {
        reject(new Error(`Missing JSON result from packaged verification.\nstdout:\n${stdout}\nstderr:\n${stderr}`));
        return;
      }

      resolve(JSON.parse(lastLine) as ReturnType<typeof runPackagedVerification> extends Promise<infer T> ? T : never);
    });
  });
};

describe("HtmltoImage packaged integration", () => {
  it("packages, installs, and converts card -> html -> image through the formal host chain", async () => {
    const result = await runPackagedVerification();

    expect(result.ok).toBe(true);
    expect(result.format).toBe("png");
    expect(result.width).toBe(960);
    expect(result.height).toBe(540);
    expect(result.outputFile.endsWith(".png")).toBe(true);
    expect(result.outputSize).toBeGreaterThan(0);
  }, 180_000);
});
