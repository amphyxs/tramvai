import type { FastifyReply, FastifyRequest } from "fastify";
import { HttpError } from "@tinkoff/errors";
import { getFormActionReply } from "../getFormActionReply";
import { FormActionRedirect } from "../formActionResult";

function createMockRequest(
  overrides: Partial<FastifyRequest> = {},
): FastifyRequest {
  return {
    headers: {},
    protocol: "http",
    host: "localhost:3000",
    url: "/",
    ...overrides,
  } as FastifyRequest;
}

function createMockResponse(): FastifyReply & {
  _redirect?: { url: string; statusCode: number };
  _body?: string;
  _headers: Record<string, string>;
} {
  const res: any = {
    _redirect: undefined,
    _body: undefined,
    _headers: {},
    redirect(url: string, statusCode: number) {
      res._redirect = { url, statusCode };
      return res;
    },
    header(name: string, value: string) {
      res._headers[name] = value;
      return res;
    },
    send(body: string) {
      res._body = body;
      return res;
    },
  };
  return res;
}

describe("getFormActionReply", () => {
  const mockOptions = {
    di: {} as any,
    commandLineRunner: {} as any,
    childDi: {} as any,
  };

  describe("JSON result + JS (Accept: application/json)", () => {
    it('should return JSON response with type "json"', async () => {
      const request = createMockRequest({
        headers: { accept: "application/json" },
      });
      const response = createMockResponse();
      const result = { message: "success", username: "TestUser" };

      const reply = await getFormActionReply(
        request,
        response,
        result,
        mockOptions,
      );

      expect(reply).toEqual({
        type: "json",
        data: { message: "success", username: "TestUser" },
      });
    });
  });

  describe("Redirect result + JS (Accept: application/json)", () => {
    it('should return JSON response with type "redirect"', async () => {
      const request = createMockRequest({
        headers: { accept: "application/json" },
      });
      const response = createMockResponse();
      const result = new FormActionRedirect("/success", { result: "ok" });

      const reply = await getFormActionReply(
        request,
        response,
        result,
        mockOptions,
      );

      expect(reply).toEqual({
        type: "redirect",
        redirectUrl: "/success",
        data: { result: "ok" },
      });
    });

    it("should return redirect with undefined data when no data provided", async () => {
      const request = createMockRequest({
        headers: { accept: "application/json" },
      });
      const response = createMockResponse();
      const result = new FormActionRedirect("/success");

      const reply = await getFormActionReply(
        request,
        response,
        result,
        mockOptions,
      );

      expect(reply).toEqual({
        type: "redirect",
        redirectUrl: "/success",
        data: undefined,
      });
    });
  });

  describe("Redirect result + no-JS (no Accept header)", () => {
    it("should redirect with 303 status and formActionResult query param", async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const data = { result: "ok", username: "TestUser" };
      const result = new FormActionRedirect("/success", data);

      await getFormActionReply(request, response, result, mockOptions);

      expect(response._redirect).toBeDefined();
      expect(response._redirect!.statusCode).toBe(303);

      const redirectUrl = new URL(response._redirect!.url);
      expect(redirectUrl.pathname).toBe("/success");
      expect(redirectUrl.searchParams.get("formActionResult")).toBe(
        JSON.stringify(data),
      );
    });

    it("should redirect without query param when no data provided", async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = new FormActionRedirect("/success");

      await getFormActionReply(request, response, result, mockOptions);

      expect(response._redirect).toBeDefined();
      expect(response._redirect!.statusCode).toBe(303);

      const redirectUrl = new URL(response._redirect!.url);
      expect(redirectUrl.pathname).toBe("/success");
      expect(redirectUrl.searchParams.has("formActionResult")).toBe(false);
    });
  });

  describe("JSON result + no-JS — SSR rendering", () => {
    it("should render page via commandLineRunner and return HTML", async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = { message: "success" };

      const mockDispatch = jest.fn();
      const mockStore = { dispatch: mockDispatch };
      const mockBody = "<html>rendered page</html>";
      const mockResponseManager = { getBody: () => mockBody };
      const mockRequestDi = {
        // First call: STORE_TOKEN → mockStore, second call: RESPONSE_MANAGER_TOKEN → mockResponseManager
        get: jest
          .fn()
          .mockReturnValueOnce(mockStore)
          .mockReturnValue(mockResponseManager),
      };

      const options = {
        di: {} as any,
        commandLineRunner: {
          resolveDi: jest.fn(() => mockRequestDi),
          run: jest.fn(),
        },
        childDi: {} as any,
      };

      await getFormActionReply(request, response, result, options as any);

      expect(options.commandLineRunner.resolveDi).toHaveBeenCalledWith(
        "server",
        "customer",
        options.childDi,
        [],
      );
      expect(options.commandLineRunner.run).toHaveBeenCalledWith(
        "server",
        "customer",
        [],
        mockRequestDi,
      );
      expect(response._headers["Content-Type"]).toBe("text/html");
      expect(response._body).toBe(mockBody);
    });

    it("should fallback to redirect when commandLineRunner throws 404", async () => {
      const request = createMockRequest({
        headers: { referer: "http://localhost:3000/form-page/" },
      });
      const response = createMockResponse();
      const result = { message: "success" };

      const httpError = new HttpError({ httpStatus: 404 });

      const options = {
        di: {} as any,
        commandLineRunner: {
          resolveDi: jest.fn(() => ({
            get: jest.fn(() => ({ dispatch: jest.fn() })),
          })),
          run: jest.fn(() => {
            throw httpError;
          }),
        },
        childDi: {} as any,
      };

      await getFormActionReply(request, response, result, options as any);

      // Should fall back to redirect with referer URL
      expect(response._redirect).toBeDefined();
      expect(response._redirect!.statusCode).toBe(303);

      const redirectUrl = new URL(response._redirect!.url);
      expect(redirectUrl.pathname).toBe("/form-page/");
      expect(redirectUrl.searchParams.get("formActionResult")).toBe(
        JSON.stringify(result),
      );
    });

    it('should fallback to redirect to "/" when referer is missing and 404 occurs', async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = { message: "success" };

      const httpError = new HttpError({ httpStatus: 404 });

      const options = {
        di: {} as any,
        commandLineRunner: {
          resolveDi: jest.fn(() => ({
            get: jest.fn(() => ({ dispatch: jest.fn() })),
          })),
          run: jest.fn(() => {
            throw httpError;
          }),
        },
        childDi: {} as any,
      };

      await getFormActionReply(request, response, result, options as any);

      expect(response._redirect).toBeDefined();
      const redirectUrl = new URL(response._redirect!.url);
      expect(redirectUrl.pathname).toBe("/");
    });

    it("should rethrow non-404 errors", async () => {
      const request = createMockRequest();
      const response = createMockResponse();
      const result = { message: "success" };

      const httpError = new HttpError({ httpStatus: 500 });

      const options = {
        di: {} as any,
        commandLineRunner: {
          resolveDi: jest.fn(() => ({
            get: jest.fn(() => ({ dispatch: jest.fn() })),
          })),
          run: jest.fn(() => {
            throw httpError;
          }),
        },
        childDi: {} as any,
      };

      await expect(
        getFormActionReply(request, response, result, options as any),
      ).rejects.toThrow();
    });
  });
});
