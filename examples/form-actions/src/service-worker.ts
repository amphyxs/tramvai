/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { enableResilientPwaFormAction } from '@tramvai/pwa-recipes';

declare const self: ServiceWorkerGlobalScope;

// Required by Workbox webpack plugin for manifest injection — unused here
const _precacheManifest = self.__WB_MANIFEST;

enableResilientPwaFormAction();

self.addEventListener('install', () => {
  self.skipWaiting();
});

clientsClaim();
