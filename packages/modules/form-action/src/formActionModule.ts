import { createReducer, createEvent } from '@tramvai/state';
import { COMBINE_REDUCERS } from '@tramvai/tokens-common';
import { Module, provide } from '@tinkoff/dippy';

export const setFormActionResult = createEvent<any>('setFormActionResult');

export const FormActionResultStore = createReducer('formActionResult', undefined).on(
  setFormActionResult,
  (_, payload) => payload
);

@Module({
  providers: [
    provide({
      provide: COMBINE_REDUCERS,
      useValue: [FormActionResultStore],
      multi: true,
    }),
  ],
})
export class FormActionModule {}
