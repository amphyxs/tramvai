import { createApp } from '@tramvai/core';
import { CommonModule } from '@tramvai/module-common';
import { RenderModule } from '@tramvai/module-render';
import { ServerModule } from '@tramvai/module-server';

import { SpaRouterModule } from '@tramvai/module-router';
import { FormActionModule } from '@tramvai/module-form-action';
import { formActionProvider } from './formActions';

createApp({
  name: 'form-actions',
  modules: [
    CommonModule,
    SpaRouterModule.forRoot([]),
    RenderModule.forRoot({ useStrictMode: true }),
    ServerModule,
    FormActionModule,
  ],
  providers: [
    // Example of form action passed via providers
    formActionProvider,
  ],
});
