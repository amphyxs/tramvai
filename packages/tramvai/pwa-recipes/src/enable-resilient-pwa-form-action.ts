import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { Queue } from 'workbox-background-sync';
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
  const queue = new Queue(queueName, { maxRetentionTime });

  // Open a cache with a known name so the page can detect this recipe is active
  self.caches.open(FORM_ACTION_SYNC_CACHE_FLAG);

  registerRoute(
    ({ request }) => {
      return (
        request.method === 'POST' &&
        request.headers.get('X-Tramvai-Form-Action-Request') === '1'
      );
    },
    new NetworkOnly(),
    'POST'
  );

  // The page sends this message after the user confirms offline queueing
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'QUEUE_FORM_REQUEST') {
      const { url, method, headers, body } = event.data.payload;
      const formData = new FormData();
      for (const [key, value] of body) {
        formData.append(key, value);
      }
      const request = new Request(url, { method, headers, body: formData });
      queue.pushRequest({ request });
    }
  });
}
