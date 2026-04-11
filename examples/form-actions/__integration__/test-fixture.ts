import path from "path";
import { test as base } from "@playwright/test";
import type { StartAppTypes } from "@tramvai/test-pw";
import { startAppFixture } from "@tramvai/test-pw";

type TestFixture = {};

type WorkerFixture = {
  app: StartAppTypes.TestApp;
  appTarget: StartAppTypes.AppTarget;
  startOptions: StartAppTypes.StartOptions;
};

export const test = base.extend<TestFixture, WorkerFixture>({
  appTarget: [
    {
      target: "form-actions",
      cwd: path.resolve(__dirname, ".."),
    },
    { scope: "worker", auto: true, option: true },
  ],
  startOptions: [{}, { scope: "worker", auto: true, option: true }],
  app: startAppFixture,
});

export { expect } from "@playwright/test";
