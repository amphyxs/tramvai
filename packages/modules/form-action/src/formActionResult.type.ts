export type FormActionJsonResult = Record<string, unknown>;

export class FormActionRedirect {
  constructor(
    public redirectUrl: string,
    public data?: FormActionJsonResult
  ) {}
}

export type FormActionResult = FormActionJsonResult | FormActionRedirect;
