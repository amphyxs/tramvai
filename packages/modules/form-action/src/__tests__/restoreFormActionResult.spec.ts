import type { FastifyRequest } from "fastify";
import { restoreFormActionResult } from "../restoreFormActionResult";

describe("restoreFormActionResult", () => {
  function createMockRequest(url: string): FastifyRequest {
    return { url } as FastifyRequest;
  }

  function createMockDi() {
    const dispatch = jest.fn();
    return {
      get: jest.fn(() => ({ dispatch })),
      _dispatch: dispatch,
    };
  }

  it("should dispatch form action result from query params to store", () => {
    const data = { result: "ok", username: "TestUser" };
    const request = createMockRequest(
      `/?formActionResult=${encodeURIComponent(JSON.stringify(data))}`,
    );
    const di = createMockDi();

    restoreFormActionResult(request, di as any);

    expect(di._dispatch).toHaveBeenCalledTimes(1);
    expect(di._dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: data,
      }),
    );
  });

  it("should not dispatch when formActionResult query param is absent", () => {
    const request = createMockRequest("/");
    const di = createMockDi();

    restoreFormActionResult(request, di as any);

    expect(di._dispatch).not.toHaveBeenCalled();
  });

  it("should not dispatch when URL has other query params but no formActionResult", () => {
    const request = createMockRequest("/?page=1&sort=asc");
    const di = createMockDi();

    restoreFormActionResult(request, di as any);

    expect(di._dispatch).not.toHaveBeenCalled();
  });

  it("should handle formActionResult with nested object data", () => {
    const data = { user: { name: "Test", roles: ["admin"] } };
    const request = createMockRequest(
      `/?formActionResult=${encodeURIComponent(JSON.stringify(data))}`,
    );
    const di = createMockDi();

    restoreFormActionResult(request, di as any);

    expect(di._dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: data,
      }),
    );
  });
});
