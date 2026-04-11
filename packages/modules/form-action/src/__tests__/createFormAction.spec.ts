import { createFormAction } from "../createFormAction";
import { getPapiParameters, isPapiMethod } from "@tramvai/papi";

describe("createFormAction", () => {
  it("should create a valid PAPI method", () => {
    const handler = jest.fn();
    const formAction = createFormAction({ handler });

    expect(isPapiMethod(formAction)).toBe(true);
  });

  it('should set method to "all" by default (handles all HTTP methods)', () => {
    const handler = jest.fn();
    const formAction = createFormAction({ handler });
    const params = getPapiParameters(formAction);

    expect(params.method).toBe("all");
  });

  it("should pass path option through to PAPI method", () => {
    const handler = jest.fn();
    const formAction = createFormAction({ path: "/api/test", handler });
    const params = getPapiParameters(formAction);

    expect(params.path).toBe("/api/test");
  });

  it("should pass options with schema through to PAPI method", () => {
    const handler = jest.fn();
    const schema = {
      body: {
        type: "object" as const,
        properties: { name: { type: "string" as const } },
      },
    };
    const formAction = createFormAction({ handler, options: { schema } });
    const params = getPapiParameters(formAction);

    expect(params.options).toMatchObject({ schema });
  });

  it("should set default timeout", () => {
    const handler = jest.fn();
    const formAction = createFormAction({ handler });
    const params = getPapiParameters(formAction);

    expect(params.options.timeout).toBe(10000);
  });

  it("should accept errorHandler parameter", () => {
    const handler = jest.fn();
    const errorHandler = jest.fn();
    const formAction = createFormAction({ handler, errorHandler });

    expect(formAction).toBeDefined();
    expect(isPapiMethod(formAction)).toBe(true);
  });

  it("should accept deps parameter", () => {
    const handler = jest.fn();
    const formAction = createFormAction({
      handler,
      deps: { logger: "LOGGER_TOKEN" },
    });
    const params = getPapiParameters(formAction);

    expect(params.deps).toEqual({ logger: "LOGGER_TOKEN" });
  });
});
