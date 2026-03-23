import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      // Actual coverage as of initial measurement:
      //   statements: ~38%, branches: ~85%, functions: ~63%, lines: ~38%
      // Thresholds set to nearest-5% floor of measured values.
      // Raise these as test coverage improves.
      thresholds: {
        statements: 35,
        branches: 85,
        functions: 60,
        lines: 35,
      },
    },
  },
});
