import { createApp } from '@tramvai/core';
import { CommonModule } from '@tramvai/module-common';
import { RenderModule } from '@tramvai/module-render';
import { ServerModule } from '@tramvai/module-server';

import { SpaRouterModule } from '@tramvai/module-router';
import { FormActionModule } from '@tramvai/module-form-action';
import { TramvaiPwaModule } from '@tramvai/module-progressive-web-app';
import { formActionProvider } from './formActions';

createApp({
  name: 'form-actions',
  modules: [
    CommonModule,
    SpaRouterModule.forRoot([]),
    RenderModule.forRoot({ useStrictMode: true }),
    ServerModule,
    FormActionModule,
    TramvaiPwaModule,
  ],
  providers: [
    // Example of form action passed via providers
    formActionProvider,
  ],
});
