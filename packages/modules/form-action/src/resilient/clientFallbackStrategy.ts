import type { NewQueuedRequest } from './types';
import {
  enqueueRequest,
  getPendingCount,
  getPendingRequests,
  removeRequest,
} from './indexedDbQueue';
import { deserializeToBody } from './serializeFormData';

let listenersRegistered = false;

let pendingCount = 0;
if (typeof window !== 'undefined') {
  getPendingCount().then((count) => {
    pendingCount = count;
    if (count > 0) {
      ensureListeners();
      // If we're already online, replay immediately instead of waiting for the 'online' event
      if (navigator.onLine) {
        replayPendingRequests();
      }
    }
  });
}

async function replayPendingRequests(): Promise<void> {
  const requests = await getPendingRequests();

  for (const req of requests) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: deserializeToBody(req.body),
        keepalive: true,
      });
      await removeRequest(req.id);
      pendingCount = Math.max(0, pendingCount - 1);
    } catch {
      // still offline or server error — leave in queue for next attempt
    }
  }
}

function ensureListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  window.addEventListener('online', () => {
    replayPendingRequests();
  });

  window.addEventListener('beforeunload', (event) => {
    if (pendingCount > 0) {
      event.preventDefault();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && pendingCount > 0) {
      replayPendingRequests();
    }
  });
}

export async function saveToClientQueue(
  request: NewQueuedRequest
): Promise<void> {
  await enqueueRequest(request);
  pendingCount++;
  ensureListeners();
}
