import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: "./",
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
