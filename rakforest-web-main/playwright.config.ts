import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", timeout: 60000, workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", channel: "msedge", headless: true, viewport: {width:1440,height:1000}, trace:"retain-on-failure" },
  webServer: { command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/login", reuseExistingServer: false, timeout: 60000 },
  reporter: [["list"]]
});
