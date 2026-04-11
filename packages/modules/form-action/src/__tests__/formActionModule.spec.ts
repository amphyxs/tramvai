import { createDispatcher, DispatcherContext } from "@tramvai/state";
import {
  FormActionResultStore,
  setFormActionResult,
} from "../formActionModule";

describe("FormActionModule", () => {
  describe("FormActionResultStore", () => {
    let dispatcherContext: DispatcherContext<{}>;

    beforeEach(() => {
      const dispatcher = createDispatcher({ stores: [FormActionResultStore] });
      dispatcherContext = new DispatcherContext(dispatcher, {}, { stores: {} });
    });

    it("should have initial state as undefined", () => {
      const state = dispatcherContext
        .getStore(FormActionResultStore)
        .getState();

      expect(state).toBeUndefined();
    });

    it("should update state on setFormActionResult event", () => {
      const data = { result: "success", username: "TestUser" };
      dispatcherContext.dispatch(setFormActionResult(data));

      const state = dispatcherContext
        .getStore(FormActionResultStore)
        .getState();

      expect(state).toEqual(data);
    });

    it("should replace previous state on subsequent dispatches", () => {
      dispatcherContext.dispatch(setFormActionResult({ first: true }));
      dispatcherContext.dispatch(setFormActionResult({ second: true }));

      const state = dispatcherContext
        .getStore(FormActionResultStore)
        .getState();

      expect(state).toEqual({ second: true });
    });
  });

  describe("setFormActionResult event", () => {
    it("should create an event with the provided payload", () => {
      const payload = { message: "hello" };
      const event = setFormActionResult(payload);

      expect(event).toMatchObject({
        type: expect.any(String),
        payload,
      });
    });
  });
});
