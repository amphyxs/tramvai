import { serializeFormData } from './serializeFormData';
import { saveToClientQueue } from './clientFallbackStrategy';
import { FORM_ACTION_SYNC_CACHE_FLAG } from '@tramvai/tokens-server';

function isNetworkError(error: unknown): boolean {
  // Chrome:  "Failed to fetch"
  // Firefox: "NetworkError when attempting to fetch resource"
  // WebKit:  "Load failed"
  return (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message)
  );
}

async function hasActiveServiceWorker(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !navigator.serviceWorker.controller
  ) {
    return false;
  }

  const cacheNames = await caches.keys();
  return cacheNames.includes(FORM_ACTION_SYNC_CACHE_FLAG);
}

export async function handleResilientError(
  error: unknown,
  url: string,
  method: string,
  headers: Record<string, string>,
  formData: FormData
): Promise<void> {
  if (!isNetworkError(error)) {
    throw error;
  }

  const userConfirmed = window.confirm(
    'Нет соединения. Продолжить отправку вашего запроса в фоне?'
  );

  if (!userConfirmed) {
    throw error;
  }

  // If an active SW with enableResilientPwaFormAction() is present,
  // ask it to queue the request via BackgroundSync.
  // Unlike automatic BackgroundSyncPlugin.fetchDidFail, this approach
  // ensures the request is queued only after the user explicitly confirms.
  if (await hasActiveServiceWorker()) {
    navigator.serviceWorker.controller!.postMessage({
      type: 'QUEUE_FORM_REQUEST',
      payload: {
        url,
        method,
        headers,
        body: serializeFormData(formData),
      },
    });
    return;
  }

  await saveToClientQueue({
    url,
    method,
    headers,
    body: serializeFormData(formData),
  });
}
