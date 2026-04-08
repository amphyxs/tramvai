import React, { PropsWithChildren } from "react";
import { useEvents } from "@tramvai/state";
import { useNavigate } from "@tinkoff/router";
import { FormActionHttpMethods } from "./formActionHttpMethods";
import { FormActionResponse } from "./formActionResult";
import { setFormActionResult } from "./formActionModule";

type Props = PropsWithChildren<{
  action?: string;
  method?: "GET" | FormActionHttpMethods;
  beforeSubmit?: (formData: FormData) =>
    | Promise<{
        formData: FormData;
        preventDefault: boolean;
      }>
    | {
        formData: FormData;
        preventDefault: boolean;
      };
  afterResponse?: (
    formActionResponse: FormActionResponse,
  ) => Promise<void> | void;
  encType?:
    | "application/x-www-form-urlencoded"
    | "multipart/form-data"
    | "text/plain";
  name?: string;
}>;

export const Form = (props: Props) => {
  const dispatchFormActionResult = useEvents(setFormActionResult);
  const navigate = useNavigate();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    let formData = new FormData(form);

    if (props.beforeSubmit) {
      const beforeSubmitResult = await props.beforeSubmit(formData);

      if (beforeSubmitResult.preventDefault) {
        return;
      }

      formData = beforeSubmitResult.formData;
    }

    const response = await fetch(form.action, {
      method: form.method,
      headers: {
        Accept: "application/json",
        "Enc-Type": form.enctype,
      },
      body: formData,
    });

    const responseJson: FormActionResponse = await response.json();

    dispatchFormActionResult(responseJson.data);

    if (responseJson.type === "redirect") {
      await navigate(responseJson.redirectUrl);
    }

    if (props.afterResponse) {
      await props.afterResponse(responseJson);
    }
  };

  return (
    <form
      action={props.action}
      method={props.method ?? "POST"}
      encType={props.encType}
      onSubmit={(event) => onSubmit(event)}
    >
      {props.name && <input type="hidden" name="formName" value={props.name} />}
      {props.children}
    </form>
  );
};
