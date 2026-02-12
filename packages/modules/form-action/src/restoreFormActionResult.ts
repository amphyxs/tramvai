import type { FastifyRequest } from 'fastify';
import { Container } from '@tinkoff/dippy';
import { STORE_TOKEN } from '@tramvai/tokens-common';
import { setFormActionResult } from './formActionModule';

export function restoreFormActionResult(request: FastifyRequest, di: Container) {
  const formActionResult = getFormActionResultUsingQueryParams(request);

  if (formActionResult) {
    di.get(STORE_TOKEN).dispatch(setFormActionResult(formActionResult));
  }
}

function getFormActionResultUsingQueryParams(request: FastifyRequest) {
  const url = new URL(`http://localhost${request.url}`);
  const formActionResultParam = url.searchParams.get('formActionResult');

  return formActionResultParam ? JSON.parse(formActionResultParam) : undefined;
}
