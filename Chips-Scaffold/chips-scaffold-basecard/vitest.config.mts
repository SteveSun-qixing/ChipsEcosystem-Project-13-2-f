import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/.tmp-basecard-tests/**",
      "tests/.tmp-e2e/**",
      "node_modules/**",
      "dist/**"
    ],
    environment: "node"
  }
});
