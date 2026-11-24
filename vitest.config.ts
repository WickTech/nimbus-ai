import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Integration tests run against a real SQLite file (created by the global setup, deleted afterwards)
// so the credit ledger is tested with the same transactions as production, not with a fake.
const testDb = join(tmpdir(), `nimbus-vitest-${process.pid}.db`);
process.env.NIMBUS_TEST_DB = testDb;

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    // One SQLite file means one writer: run test files one after another, never side by side.
    fileParallelism: false,
    testTimeout: 20_000,
    globalSetup: ["./__tests__/setup/global.ts"],
    env: {
      DATABASE_URL: `file:${testDb}?connection_limit=1`,
      AUTH_SECRET: "vitest-secret-not-real",
      SIGNUP_FREE_CREDITS: "7",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      include: ["src/lib/**", "src/app/api/**"],
      // Just below what the tests reach today under vitest 5 (90% lines, 87% statements, 80% functions, 78% branches);
      // vitest 5's v8 provider counts branches and functions differently from 2.x (which showed 89% branches), so these
      // numbers are not comparable with the old ones. Raise them as tests are added.
      // The rest is auth wiring (auth.ts, NextAuth route), which only the browser tests exercise.
      thresholds: { lines: 85, statements: 82, functions: 75, branches: 75 },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
