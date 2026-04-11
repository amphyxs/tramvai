import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { FORM_ACTION_SYNC_CACHE_FLAG } from '@tramvai/tokens-server';

declare let self: ServiceWorkerGlobalScope;

export interface EnableResilientPwaFormActionOptions {
  queueName?: string;
  maxRetentionTime?: number;
}

export function enableResilientPwaFormAction({
  queueName = 'tramvai-form-action-queue',
  maxRetentionTime = 24 * 60,
}: EnableResilientPwaFormActionOptions = {}) {
  const bgSyncPlugin = new BackgroundSyncPlugin(queueName, {
    maxRetentionTime,
  });

  // Open a cache with a known name so the page can detect this recipe is active
  self.caches.open(FORM_ACTION_SYNC_CACHE_FLAG);

  // Intercept POST requests marked with X-Tramvai-Resilient header by <Form resilient>
  registerRoute(
    ({ request }) => {
      return (
        request.method === 'POST' &&
        request.headers.get('X-Tramvai-Form-Action-Request') === '1'
      );
    },
    new NetworkOnly({
      plugins: [bgSyncPlugin],
    }),
    'POST'
  );
}
