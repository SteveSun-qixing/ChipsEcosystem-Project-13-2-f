import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**", "tests/.tmp-module-tests/**", "tests/.tmp-e2e/**"],
  },
});
