import type { FastifyReply, FastifyRequest } from 'fastify';
import { ChildContainer, DI_TOKEN } from '@tinkoff/dippy';
import { COMMAND_LINE_RUNNER_TOKEN } from '@tramvai/tokens-core';
import { RESPONSE_MANAGER_TOKEN, STORE_TOKEN } from '@tramvai/tokens-common';
import { HttpError } from '@tinkoff/errors';
import { FormActionRedirect, FormActionResult } from './formActionResult.type';
import { setFormActionResult } from './formActionModule';

export async function getFormActionReply(
  request: FastifyRequest,
  response: FastifyReply,
  result: FormActionResult,
  options: {
    di: typeof DI_TOKEN;
    commandLineRunner: typeof COMMAND_LINE_RUNNER_TOKEN;
    childDi: ChildContainer;
  }
) {
  if (result instanceof FormActionRedirect) {
    // Redirect result & Has JS => Return JSON with type: redirect
    if (checkIsFormProgressivelyEnhanced(request)) {
      return {
        type: 'redirect',
        redirectUrl: result.redirectUrl,
        data: result.data,
      };
    }

    // Redirect result & No JS => HTTP 303 with Location: <redirectUrl>?<formActionData>
    const redirectUrl = new URL(result.redirectUrl, `${request.protocol}://${request.host}`);

    if (result.data) {
      redirectUrl.searchParams.set('formActionResult', JSON.stringify(result.data));
    }

    return response.redirect(redirectUrl.toString(), 303);
  }

  // JSON result & Has JS => Return JSON with type: json
  if (checkIsFormProgressivelyEnhanced(request)) {
    return {
      type: 'json',
      data: result,
    };
  }

  // JSON result & No JS => Save result to FormActionResultStore & render action page
  if (options?.di && options?.commandLineRunner && options?.childDi) {
    try {
      const requestDi = options.commandLineRunner.resolveDi(
        'server',
        'customer',
        options.childDi,
        []
      );

      requestDi.get(STORE_TOKEN).dispatch(setFormActionResult(result));

      await options.commandLineRunner.run('server', 'customer', [], requestDi);

      const responseManager = requestDi.get(RESPONSE_MANAGER_TOKEN);

      return response.header('Content-Type', 'text/html').send(responseManager.getBody());
    } catch (error) {
      // If form action doesn't have a page with the same URL, we will redirect to the page where form is located
      if (error instanceof HttpError && error.httpStatus === 404) {
        return getFormActionReply(
          request,
          response,
          new FormActionRedirect(request.headers.referer ?? '/', result),
          options
        );
      }

      throw error;
    }
  }
}

/** Check if user had JS when form was submitted. */
function checkIsFormProgressivelyEnhanced(request: FastifyRequest): boolean {
  return request.headers.accept === 'application/json';
}
