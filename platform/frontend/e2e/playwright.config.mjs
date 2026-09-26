import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "platform.spec.mjs",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  workers: 1,
  retries: 0,
  use: { browserName: "chromium", headless: true, locale: "pt-BR", reducedMotion: "reduce" },
  reporter: "list",
});
