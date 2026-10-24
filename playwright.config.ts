import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3101;
const AI_PORT = 4010;

// Browser tests run against the production build (`npm run build` first) with a throwaway SQLite database and
// a fake OpenAI server, so they need no keys and no network.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1, // one SQLite file means one writer
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Optional: point at an already installed Chromium instead of the one Playwright downloads.
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
  webServer: [
    {
      command: "node e2e/fake-openai.mjs",
      url: `http://127.0.0.1:${AI_PORT}/health`,
      env: { PORT: String(AI_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      // Fresh database every run, then the production server.
      command: `sh -c "rm -f prisma/e2e.db prisma/e2e.db-journal && npx prisma db push --skip-generate && npx next start -p ${APP_PORT}"`,
      url: `http://127.0.0.1:${APP_PORT}/`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DATABASE_URL: "file:./e2e.db?connection_limit=1",
        AUTH_SECRET: "e2e-secret-not-real",
        AUTH_TRUST_HOST: "true",
        OPENAI_API_KEY: "sk-e2e",
        OPENAI_BASE_URL: `http://127.0.0.1:${AI_PORT}/v1`,
        OPENAI_MODEL: "fake-model",
        SIGNUP_FREE_CREDITS: "3",
      },
    },
  ],
});
