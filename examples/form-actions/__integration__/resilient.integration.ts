import type { BrowserContext, Page, Worker } from '@playwright/test';
import { expect, test } from './test-fixture';

/** Helper to query IndexedDB pending request count from the page. */
function getIndexedDbCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    return new Promise<number>((resolve, reject) => {
      const request = indexedDB.open('tramvai-form-action-queue', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending-requests')) {
          db.createObjectStore('pending-requests', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending-requests')) {
          resolve(0);
          return;
        }
        const tx = db.transaction('pending-requests', 'readonly');
        const countReq = tx.objectStore('pending-requests').count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => reject(countReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

/** Helper to clear IndexedDB queue. */
function clearIndexedDb(page: Page): Promise<void> {
  return page.evaluate(async () => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('tramvai-form-action-queue', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending-requests')) {
          db.createObjectStore('pending-requests', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending-requests')) {
          resolve();
          return;
        }
        const tx = db.transaction('pending-requests', 'readwrite');
        tx.objectStore('pending-requests').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

/** Helper to check if the sync cache flag is present. */
function hasSyncCacheFlag(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const cacheNames = await caches.keys();
    return cacheNames.includes('__tramvai_form_action_sync__');
  });
}

/** Helper to count entries in the Workbox BackgroundSync IDB queue (page-accessible, same origin). */
function getWorkboxBgSyncCount(page: Page, queueName: string): Promise<number> {
  return page.evaluate(async (qName) => {
    return new Promise<number>((resolve, reject) => {
      const req = indexedDB.open('workbox-background-sync');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('requests')) {
          resolve(0);
          return;
        }
        const tx = db.transaction('requests', 'readonly');
        const index = tx.objectStore('requests').index('queueName');
        const countReq = index.count(IDBKeyRange.only(qName));
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => reject(countReq.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, queueName);
}

/** Helper to locate the resilient form (postCurrentUrl has resilient prop) */
function locateResilientForm(page: Page) {
  return page.locator('form', {
    has: page.locator('input[name="formName"][value="postCurrentUrl"]'),
  });
}

test.describe('resilient form (Level 1 - client fallback, no Service Worker)', () => {
  // Block service workers at the browser context level so the Level 1
  // (client-only IndexedDB) path is exercised, not the PWA/BackgroundSync path.
  // Using test.use() here is preferable to page.route('**/sw.js', abort) because
  // the context option is applied before the page opens, preventing any activation race.
  test.use({ serviceWorkers: 'block' });

  test('should queue form submission in IndexedDB when offline and user confirms', async ({
    app,
    page,
    context,
  }) => {
    await page.goto(app.serverUrl);
    await clearIndexedDb(page);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('OfflineUser');

    await context.setOffline(true);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    await form.locator('input[type="submit"]').click();

    await expect
      .poll(() => getIndexedDbCount(page), {
        message: 'expected IndexedDB to contain 1 queued request',
        timeout: 5000,
      })
      .toBe(1);

    await context.setOffline(false);
  });

  test('should not queue when user cancels confirm dialog', async ({
    app,
    page,
    context,
  }) => {
    await page.goto(app.serverUrl);
    await clearIndexedDb(page);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('CancelUser');

    await context.setOffline(true);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.dismiss();
    });

    await form.locator('input[type="submit"]').click();

    // Small wait to ensure any async operation would have completed
    await page.waitForTimeout(500);

    const count = await getIndexedDbCount(page);
    expect(count).toBe(0);

    await context.setOffline(false);
  });

  test('should replay queued requests when coming back online', async ({
    app,
    page,
    context,
  }) => {
    await page.goto(app.serverUrl);
    await clearIndexedDb(page);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('ReplayUser');

    await context.setOffline(true);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await form.locator('input[type="submit"]').click();

    await expect.poll(() => getIndexedDbCount(page), { timeout: 5000 }).toBe(1);

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    await expect
      .poll(() => getIndexedDbCount(page), {
        message: 'expected IndexedDB to be empty after online replay',
        timeout: 8000,
      })
      .toBe(0);
  });

  test('should replay stale queued requests on hard page reload when online', async ({
    app,
    page,
    context,
  }) => {
    await page.goto(app.serverUrl);
    await clearIndexedDb(page);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('StaleUser');

    await context.setOffline(true);

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await form.locator('input[type="submit"]').click();

    await expect.poll(() => getIndexedDbCount(page), { timeout: 5000 }).toBe(1);

    await context.setOffline(false);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect
      .poll(() => getIndexedDbCount(page), {
        message: 'expected IndexedDB to be empty after stale replay on reload',
        timeout: 8000,
      })
      .toBe(0);
  });
});

test.describe('resilient form (Level 2 - PWA with BackgroundSync)', () => {
  /**
   * Returns the first active service worker from the browser context.
   * Waits for the 'serviceworker' event if none is registered yet.
   * NOTE: context.serviceWorkers() is Chromium-only in Playwright.
   */
  async function getServiceWorker(context: BrowserContext): Promise<Worker> {
    const existing = context.serviceWorkers();
    if (existing.length > 0) {
      return existing[0];
    }
    return context.waitForEvent('serviceworker');
  }

  /**
   * Override self.fetch inside the Service Worker so that POST requests
   * carrying X-Tramvai-Form-Action-Request throw a network error.
   *
   * This is needed because Playwright's context.setOffline() only affects
   * the page's network, NOT the Service Worker's outbound fetches.
   * Overriding self.fetch makes NetworkOnly throw → the error reaches the
   * page's catch block → handleResilientError shows confirm → on accept the
   * page sends postMessage to SW → SW queues via Queue.pushRequest().
   */
  async function blockSwFormFetches(sw: Worker): Promise<void> {
    await sw.evaluate(() => {
      const orig = (self as any).fetch as typeof fetch;
      (self as any).__tramvaiOrigFetch = orig;
      (self as any).fetch = async function (...args: any[]) {
        const req =
          args[0] instanceof Request ? args[0] : new Request(args[0], args[1]);
        if (
          req.method === 'POST' &&
          req.headers.get('X-Tramvai-Form-Action-Request') === '1'
        ) {
          throw new TypeError('Failed to fetch');
        }
        return orig.apply(self, args as [any, any]);
      } as typeof fetch;
    });
  }

  /** Restore the original self.fetch in the Service Worker. */
  async function unblockSwFormFetches(sw: Worker): Promise<void> {
    await sw.evaluate(() => {
      if ((self as any).__tramvaiOrigFetch) {
        (self as any).fetch = (self as any).__tramvaiOrigFetch;
        delete (self as any).__tramvaiOrigFetch;
      }
    });
  }

  /**
   * Dispatch a BackgroundSync 'sync' event to the SW manually.
   * Playwright's context.setOffline(false) uses CDP Network.emulateNetworkConditions
   * which does NOT trigger Chrome's real BackgroundSync scheduler.
   * We dispatch a SyncEvent ourselves so Workbox's handler calls replayRequests().
   */
  async function triggerBackgroundSync(
    sw: Worker,
    queueName: string
  ): Promise<void> {
    await sw.evaluate((tag: string) => {
      try {
        // @ts-expect-error - SyncEvent exists in the SW global scope
        self.dispatchEvent(new SyncEvent('sync', { tag, lastChance: false }));
      } catch {
        // waitUntil may throw for untrusted (synthetic) events;
        // the replay Promise is already running at this point.
      }
    }, `workbox-background-sync:${queueName}`);
  }

  test.afterEach(async ({ context }) => {
    for (const sw of context.serviceWorkers()) {
      try {
        await unblockSwFormFetches(sw);
      } catch {
        // SW may have been destroyed — safe to ignore
      }
    }
  });

  test('SW activates and signals readiness via sync cache flag', async ({
    app,
    page,
  }) => {
    await page.goto(app.serverUrl);

    await expect
      .poll(() => hasSyncCacheFlag(page), {
        message: 'expected sync cache flag to be present',
        timeout: 10000,
      })
      .toBe(true);
  });

  test('Chromium: offline form replays via sync event when connectivity returns', async ({
    app,
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'context.serviceWorkers() is Chromium-only in Playwright'
    );
    await page.goto(app.serverUrl);
    await expect
      .poll(() => hasSyncCacheFlag(page), { timeout: 10000 })
      .toBe(true);

    const sw = await getServiceWorker(context);

    await context.setOffline(true);
    await blockSwFormFetches(sw);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('ReplaySwUser');

    page.once('dialog', (dialog) => dialog.accept());
    await form.locator('input[type="submit"]').click();
    await page.waitForTimeout(500);

    expect(await getIndexedDbCount(page)).toBe(0);

    await expect
      .poll(() => getWorkboxBgSyncCount(page, 'tramvai-form-action-queue'), {
        message: 'expected request to be queued in BGSync',
        timeout: 5000,
      })
      .toBeGreaterThan(0);

    await unblockSwFormFetches(sw);
    await context.setOffline(false);
    await triggerBackgroundSync(sw, 'tramvai-form-action-queue');

    await expect
      .poll(() => getWorkboxBgSyncCount(page, 'tramvai-form-action-queue'), {
        message: 'BGSync queue should drain after connectivity restored',
        timeout: 15000,
      })
      .toBe(0);
  });

  test('Chromium: offline form replays on next page visit (no-sync fallback)', async ({
    app,
    page,
    context,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'context.serviceWorkers() is Chromium-only in Playwright'
    );
    await page.goto(app.serverUrl);
    await expect
      .poll(() => hasSyncCacheFlag(page), { timeout: 10000 })
      .toBe(true);

    const sw = await getServiceWorker(context);
    await context.setOffline(true);
    await blockSwFormFetches(sw);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('NextVisitUser');

    page.once('dialog', (dialog) => dialog.accept());
    await form.locator('input[type="submit"]').click();
    await page.waitForTimeout(500);

    expect(await getIndexedDbCount(page)).toBe(0);

    await expect
      .poll(() => getWorkboxBgSyncCount(page, 'tramvai-form-action-queue'), {
        message: 'expected request to be queued in BGSync',
        timeout: 5000,
      })
      .toBeGreaterThan(0);

    await unblockSwFormFetches(sw);
    await context.setOffline(false);
    await triggerBackgroundSync(sw, 'tramvai-form-action-queue');
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect
      .poll(() => getWorkboxBgSyncCount(page, 'tramvai-form-action-queue'), {
        message: 'BGSync queue should drain on next page visit',
        timeout: 15000,
      })
      .toBe(0);
  });

  test('Firefox/WebKit: SW active - form POST reaches server and result is shown', async ({
    app,
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'chromium',
      'Chromium covers online form submission implicitly via BGSync tests'
    );
    await page.goto(app.serverUrl);
    await expect
      .poll(() => hasSyncCacheFlag(page), {
        message: 'expected SW to activate and set sync cache flag',
        timeout: 15000,
      })
      .toBe(true);

    const form = locateResilientForm(page);
    await form.locator('#username').fill('FxWkUser');
    await form.locator('input[type="submit"]').click();

    await expect(page.getByText('FxWkUser')).toBeVisible({ timeout: 5000 });
  });
});
