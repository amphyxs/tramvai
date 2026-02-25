import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fastifyCookie } from '@fastify/cookie';
import fastifyFormBody from '@fastify/formbody';

import { getPapiParameters, Papi } from '@tramvai/papi';
import { COMMAND_LINE_RUNNER_TOKEN, DI_TOKEN, ExtractDependencyType } from '@tramvai/core';
import { LOGGER_TOKEN, ResponseManager } from '@tramvai/tokens-common';
import { RESPONSE_MANAGER_TOKEN } from '@tramvai/tokens-common';
import type {
  PAPI_FASTIFY_INIT_TOKEN,
  WEB_FASTIFY_APP_TOKEN,
} from '@tramvai/tokens-server-private';
import { FASTIFY_REQUEST, FASTIFY_RESPONSE, PAPI_EXECUTOR } from '@tramvai/tokens-server-private';
import { ChildContainer, createChildContainer, Scope } from '@tinkoff/dippy';
import { HttpError, RedirectFoundError } from '@tinkoff/errors';
import {
  formActionHttpMethods,
  FormActionParameters,
  FormActionResult,
  getFormActionReply,
} from '@tramvai/module-form-action';

export interface CreateOptions {
  baseUrl: string;
  di: typeof DI_TOKEN;
  logger: typeof LOGGER_TOKEN;
  papiInitHandlers: ExtractDependencyType<typeof PAPI_FASTIFY_INIT_TOKEN>;
  isFormActions?: boolean;
  commandLineRunner?: typeof COMMAND_LINE_RUNNER_TOKEN;
}

const runHandlers = (
  instance: ExtractDependencyType<typeof WEB_FASTIFY_APP_TOKEN>,
  handlers: ExtractDependencyType<typeof PAPI_FASTIFY_INIT_TOKEN>
) => {
  return Promise.all([handlers && Promise.all(handlers.map((handler) => handler(instance)))]);
};

const createHandlerContainer = (di: typeof DI_TOKEN, req: FastifyRequest, res: FastifyReply) => {
  return createChildContainer(di, [
    {
      provide: FASTIFY_REQUEST,
      scope: Scope.REQUEST,
      useValue: req,
    },
    {
      provide: FASTIFY_RESPONSE,
      scope: Scope.REQUEST,
      useValue: res,
    },
  ]);
};

const handleResponse = async (
  req: FastifyRequest,
  res: FastifyReply,
  payload: unknown,
  responseManager: ResponseManager,
  options: {
    isFormActions: boolean;
    commandLineRunner: typeof COMMAND_LINE_RUNNER_TOKEN;
    di: typeof DI_TOKEN;
    childDi: ChildContainer;
  }
) => {
  if (res.sent) {
    return;
  }

  if (options.isFormActions) {
    return getFormActionReply(req, res, payload as FormActionResult, options);
  }

  if (!payload && responseManager.getBody()) {
    res.send(responseManager.getBody());
    return res;
  }

  return {
    resultCode: 'OK',
    payload,
  };
};

export function createApi(
  rootApp: FastifyInstance,
  papiList: Papi[],
  { baseUrl, di, logger, papiInitHandlers, isFormActions = false, commandLineRunner }: CreateOptions
) {
  const paths = new Set();
  const papiLog = logger('papi');

  rootApp.register(
    async (app) => {
      await app.register(fastifyCookie);
      await app.register(fastifyFormBody, { bodyLimit: 2097152 }); // 2mb

      await runHandlers(app, papiInitHandlers);

      for (const papi of papiList) {
        const papiParams = getPapiParameters(papi);

        if (!papiParams) {
          throw new Error(`papi should be created using createPapiMethod from @tramvai/papi,
        got: ${JSON.stringify(papi)}`);
        }

        const { path, options } = papiParams;
        const { timeout, schema } = options;

        if (!path) {
          throw new Error(`No path in papi handler, got: ${JSON.stringify(papi)}`);
        }

        // For form actions, register handlers for all methods except GET, HEAD
        const methods = isFormActions
          ? formActionHttpMethods.map((method) => method.toLowerCase())
          : [papiParams.method];

        for (const method of methods) {
          const key = `${method} ${path}`;

          if (paths.has(key)) {
            throw new Error(`papi: route '${key}' already registered`);
          }

          paths.add(key);

          const childLog = papiLog.child(`${method}_${path}`);

          app[method](
            path,
            {
              schema,
              errorHandler: async (error, req, res) => {
                if (isFormActions) {
                  const formActionParams = papiParams as FormActionParameters;

                  // Run custom error handler for form actions
                  if (formActionParams.errorHandler) {
                    try {
                      const childDi = createHandlerContainer(di, req, res);

                      const responseManager = childDi.get(RESPONSE_MANAGER_TOKEN);

                      const errorHandlerResult = await formActionParams.errorHandler(error);

                      return handleResponse(req, res, errorHandlerResult, responseManager, {
                        isFormActions,
                        commandLineRunner,
                        di,
                        childDi,
                      });
                    } catch (handlerError) {
                      childLog.error('Error in custom error handler:', handlerError);
                    }
                  }

                  // Handle form action redirects that are invoked via throwRedirectFoundError() function
                  if (error.name === RedirectFoundError.errorName) {
                    const redirect = error as unknown as RedirectFoundError;

                    return res.redirect(redirect.nextUrl, redirect.httpStatus);
                  }
                }

                res.status(error.validation ? 400 : 503);

                childLog.error(error);

                return {
                  resultCode: 'INTERNAL_ERROR',
                  errorMessage: error.message ?? 'internal error',
                };
              },
            },
            async (req, res) => {
              const childDi = createHandlerContainer(di, req, res);

              const papiExecutor = childDi.get(PAPI_EXECUTOR);

              // TODO: use abortSignal
              const payload = await Promise.race([
                papiExecutor(papi),
                new Promise((resolve, reject) =>
                  setTimeout(
                    () => reject(new HttpError({ httpStatus: 503, message: 'Execution timeout' })),
                    timeout
                  )
                ),
              ]);

              const responseManager = childDi.get(RESPONSE_MANAGER_TOKEN);

              res.headers(responseManager.getHeaders()).status(responseManager.getStatus());

              return handleResponse(req, res, payload, responseManager, {
                isFormActions,
                di,
                commandLineRunner,
                childDi,
              });
            }
          );
        }
      }
    },
    { prefix: baseUrl }
  );
}
