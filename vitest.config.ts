import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      // Actual coverage: statements ~49%, branches ~38%, functions ~64%, lines ~49%
      // Thresholds set below actual coverage rounded down to nearest 5%
      thresholds: {
        statements: 35,
        branches: 35,
        functions: 60,
        lines: 35,
      },
    },
  },
});
