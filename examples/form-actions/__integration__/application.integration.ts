import path from "path";
import { expect, test } from "./test-fixture";

test.describe("form-actions", () => {
  test.describe("with JS enabled", () => {
    test.describe("POST form with JSON response", () => {
      test("should submit form via fetch and receive JSON response", async ({
        app,
        page,
      }) => {
        await page.goto(app.serverUrl);

        const postForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="postCurrentUrl"]'),
        });

        await postForm.locator("#username").fill("TestUser");

        const [response] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes(app.serverUrl) &&
              resp.request().method() === "POST",
          ),
          postForm.locator('input[type="submit"]').click(),
        ]);

        const body = await response.json();

        expect(body).toEqual({
          type: "json",
          data: { result: "Hello, world!", username: "TestUser" },
        });
      });
    });

    test.describe("POST form with redirect response", () => {
      test("should submit form via fetch and receive redirect response", async ({
        app,
        page,
      }) => {
        await page.goto(app.serverUrl);

        const postForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="postCurrentUrl"]'),
        });

        await postForm.locator("#username").fill("TestUser");
        await postForm.locator("#redirect").check();

        const [response] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes(app.serverUrl) &&
              resp.request().method() === "POST",
          ),
          postForm.locator('input[type="submit"]').click(),
        ]);

        const body = await response.json();

        expect(body).toEqual({
          type: "redirect",
          redirectUrl: "/success",
          data: { result: "Hello, success!", username: "TestUser" },
        });
      });
    });

    test.describe("POST form with custom action URL", () => {
      test("should submit to custom endpoint and receive response", async ({
        app,
        page,
      }) => {
        await page.goto(app.serverUrl);

        const postForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="postAnotherUrl"]'),
        });

        await postForm.locator("#name").fill("TestName");

        const [response] = await Promise.all([
          page.waitForResponse(
            (resp) =>
              resp.url().includes("/api/custom-form") &&
              resp.request().method() === "POST",
          ),
          postForm.locator('input[type="submit"]').click(),
        ]);

        const body = await response.json();

        expect(body).toMatchObject({
          type: "json",
          data: expect.objectContaining({
            success: true,
            message: "Custom form processed successfully",
          }),
        });
      });
    });

    test.describe("hidden formName input", () => {
      test("should render hidden formName input for named forms", async ({
        app,
        page,
      }) => {
        await page.goto(app.serverUrl);

        const hiddenInputs = page.locator('input[name="formName"]');
        const count = await hiddenInputs.count();

        expect(count).toBe(9);

        const values = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            hiddenInputs.nth(i).getAttribute("value"),
          ),
        );

        expect(values).toEqual(
          expect.arrayContaining([
            "postCurrentUrl",
            "getCurrentUrl",
            "postAnotherUrl",
            "getAnotherUrl",
            "beforeSubmitInject",
            "beforeSubmitPrevent",
            "afterResponseDom",
            "fileUpload",
            "defaultMethod",
          ]),
        );
      });
    });
  });

  test.describe("without JS (progressive enhancement)", () => {
    test.describe("POST form with JSON response", () => {
      test("should submit form natively and re-render page with result", async ({
        app,
        browser,
      }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        await page.goto(app.serverUrl);

        const postForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="postCurrentUrl"]'),
        });

        await postForm.locator("#username").fill("NoJsUser");

        await Promise.all([
          page.waitForNavigation(),
          postForm.locator('input[type="submit"]').click(),
        ]);

        const content = await page.textContent("body");
        expect(content).toContain("Hello, world!");
        expect(content).toContain("NoJsUser");

        await context.close();
      });
    });

    test.describe("POST form with redirect response", () => {
      test("should follow 303 redirect to success page", async ({
        app,
        browser,
      }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        await page.goto(app.serverUrl);

        const postForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="postCurrentUrl"]'),
        });

        await postForm.locator("#username").fill("RedirectUser");
        await postForm.locator("#redirect").check();

        await Promise.all([
          page.waitForNavigation(),
          postForm.locator('input[type="submit"]').click(),
        ]);

        expect(page.url()).toContain("/success");

        const content = await page.textContent("body");
        expect(content).toContain("Success!");
        expect(content).toContain("Hello, success!");
        expect(content).toContain("RedirectUser");

        await context.close();
      });
    });

    test.describe("GET form", () => {
      test("should navigate with query params on native form submission", async ({
        app,
        browser,
      }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        await page.goto(app.serverUrl);

        const getForm = page.locator("form", {
          has: page.locator('input[name="formName"][value="getCurrentUrl"]'),
        });

        await getForm.locator('input[name="q"]').fill("searchterm");

        await Promise.all([
          page.waitForNavigation(),
          getForm.locator('input[type="submit"]').click(),
        ]);

        expect(page.url()).toContain("q=searchterm");

        await context.close();
      });
    });
  });

  test.describe("beforeSubmit prop", () => {
    test("should inject a field into FormData before submission", async ({
      app,
      page,
    }) => {
      await page.goto(app.serverUrl);

      const form = page.locator("form", {
        has: page.locator('input[name="formName"][value="beforeSubmitInject"]'),
      });

      await form.locator("#beforeSubmitField").fill("original");

      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(app.serverUrl) &&
            resp.request().method() === "POST",
        ),
        form.locator('input[type="submit"]').click(),
      ]);

      const body = await response.json();

      expect(body).toEqual({
        type: "json",
        data: expect.objectContaining({
          injectedField: "injectedValue",
          field: "original",
        }),
      });
    });

    test("should prevent form submission when preventDefault is true", async ({
      app,
      page,
    }) => {
      await page.goto(app.serverUrl);

      const form = page.locator("form", {
        has: page.locator(
          'input[name="formName"][value="beforeSubmitPrevent"]',
        ),
      });

      await form.locator("#blockedField").fill("data");

      // Set up a listener that would catch any request — there should be none
      let requestMade = false;
      page.on("request", (req) => {
        if (req.method() === "POST" && req.url().includes(app.serverUrl)) {
          requestMade = true;
        }
      });

      await form.locator('input[type="submit"]').click();

      // Wait a bit to confirm no request was made
      await page.waitForSelector('[data-testid="prevented"]');
      expect(requestMade).toBe(false);

      const preventedText = await page
        .locator('[data-testid="prevented"]')
        .textContent();
      expect(preventedText).toContain("Submit was prevented");
    });
  });

  test.describe("afterResponse prop", () => {
    test("should call afterResponse callback with response data", async ({
      app,
      page,
    }) => {
      await page.goto(app.serverUrl);

      const form = page.locator("form", {
        has: page.locator('input[name="formName"][value="afterResponseDom"]'),
      });

      await form.locator("#afterResponseField").fill("CallbackUser");

      await form.locator('input[type="submit"]').click();

      // afterResponse writes JSON to a DOM element
      const resultEl = page.locator('[data-testid="after-response-result"]');
      await resultEl.waitFor({ state: "visible" });

      const resultText = await resultEl.textContent();
      const result = JSON.parse(resultText!);

      expect(result).toEqual({
        type: "json",
        data: { result: "Hello, world!", username: "CallbackUser" },
      });
    });
  });

  test.describe("encType prop (file upload)", () => {
    test("should upload a file with multipart/form-data", async ({
      app,
      page,
    }) => {
      await page.goto(app.serverUrl);

      const form = page.locator("form", {
        has: page.locator('input[name="formName"][value="fileUpload"]'),
      });

      const enctype = await form.getAttribute("enctype");
      expect(enctype).toBe("multipart/form-data");

      // Create a test file and upload it
      const testFilePath = path.resolve(__dirname, "test-upload.txt");
      const fs = await import("fs");
      fs.writeFileSync(testFilePath, "test file content");

      await form.locator("#fileInput").setInputFiles(testFilePath);

      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(app.serverUrl) &&
            resp.request().method() === "POST",
        ),
        form.locator('input[type="submit"]').click(),
      ]);

      const body = await response.json();

      expect(body).toEqual({
        type: "json",
        data: expect.objectContaining({
          result: "file-uploaded",
        }),
      });

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });
  });

  test.describe("default method prop", () => {
    test("form without method prop should default to POST", async ({
      app,
      page,
    }) => {
      await page.goto(app.serverUrl);

      const form = page.locator("form", {
        has: page.locator('input[name="formName"][value="defaultMethod"]'),
      });

      const method = await form.getAttribute("method");
      expect(method?.toUpperCase()).toBe("POST");

      await form.locator("#defaultMethodField").fill("DefaultUser");

      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes(app.serverUrl) &&
            resp.request().method() === "POST",
        ),
        form.locator('input[type="submit"]').click(),
      ]);

      const body = await response.json();

      expect(body).toEqual({
        type: "json",
        data: expect.objectContaining({
          result: "Hello, world!",
          username: "DefaultUser",
        }),
      });
    });
  });

  test.describe("schema validation (plain form)", () => {
    test("valid data should return parsed result", async ({ app, browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();

      await page.goto(`${app.serverUrl}/schema-validation/`);

      await page.fill("#name", "John");
      await page.fill("#email", "john@example.com");
      await page.fill("#age", "25");

      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]'),
      ]);

      const content = await page.textContent("body");
      expect(content).toContain("John");
      expect(content).toContain("john@example.com");

      await context.close();
    });

    test("invalid data should return error from errorHandler", async ({
      app,
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();

      await page.goto(`${app.serverUrl}/schema-validation/`);

      await page.fill("#name", "A");
      await page.fill("#email", "invalid-email");
      await page.fill("#age", "10");

      await Promise.all([
        page.waitForNavigation(),
        page.click('button[type="submit"]'),
      ]);

      const content = await page.textContent("body");
      expect(content).toContain("message");

      await context.close();
    });
  });
});
