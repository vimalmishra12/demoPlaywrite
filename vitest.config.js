import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60000, // 60 seconds per test
    hookTimeout: 60000, // beforeAll / afterAll also get 60s
  },
});
