import { createPlaywrightConfig } from "@tramvai/test-pw";

export default createPlaywrightConfig({
  testDir: "./__integration__",
  testMatch: /.*\.(integration|test|spec)\.(js|ts)/,
});
