'use client';

import { useSyncExternalStore } from 'react';

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerOnlineSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
}
