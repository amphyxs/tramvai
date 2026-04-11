import { serializeFormData } from './serializeFormData';
import { saveToClientQueue } from './clientFallbackStrategy';
import { FORM_ACTION_SYNC_CACHE_FLAG } from '@tramvai/tokens-server';

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /fetch|network/i.test(error.message);
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
  // BackgroundSyncPlugin already intercepted and queued the failed fetch above.
  // We only need the client-side IndexedDB queue as a fallback.
  if (await hasActiveServiceWorker()) {
    return;
  }
  
  await saveToClientQueue({
    url,
    method,
    headers,
    body: serializeFormData(formData),
  });
}
