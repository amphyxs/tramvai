// Return types of form actions
export type FormActionJsonResult = Record<string, unknown>;

export class FormActionRedirect {
  constructor(
    public redirectUrl: string,
    public data?: FormActionJsonResult
  ) {}
}

export type FormActionResult = FormActionJsonResult | FormActionRedirect;
// ---

// HTTP responses of form actions
export type FormActionJsonResponse = {
  type: 'json';
  data: FormActionJsonResult;
};

export type FormActionRedirectResponse = {
  type: 'redirect';
  redirectUrl: string;
  data: FormActionJsonResult;
};

export type FormActionResponse = FormActionJsonResponse | FormActionRedirectResponse;
// ---
