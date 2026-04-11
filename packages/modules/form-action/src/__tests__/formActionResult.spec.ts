import { FormActionRedirect } from "../formActionResult";

describe("FormActionRedirect", () => {
  it("should store redirectUrl", () => {
    const redirect = new FormActionRedirect("/success");

    expect(redirect.redirectUrl).toBe("/success");
  });

  it("should store optional data", () => {
    const data = { result: "ok", username: "TestUser" };
    const redirect = new FormActionRedirect("/success", data);

    expect(redirect.data).toEqual(data);
  });

  it("should have undefined data when not provided", () => {
    const redirect = new FormActionRedirect("/success");

    expect(redirect.data).toBeUndefined();
  });

  it("should be detectable via instanceof", () => {
    const redirect = new FormActionRedirect("/success");
    const plainObject = { redirectUrl: "/success" };

    expect(redirect instanceof FormActionRedirect).toBe(true);
    expect(plainObject instanceof FormActionRedirect).toBe(false);
  });
});
