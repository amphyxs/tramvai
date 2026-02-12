import { createPapiMethod } from '@tramvai/papi';
import type { PapiParameters } from '@tramvai/papi';

export interface FormActionParameters<Result = any, Deps = any, ErrorResult = any>
  extends Omit<PapiParameters<Result, Deps>, 'method'> {
  errorHandler?: (error: Error) => ErrorResult;
}

export const createFormAction = <Result = any, Deps = any>(
  formAction: FormActionParameters<Result, Deps>
) => {
  return createPapiMethod(formAction);
};
