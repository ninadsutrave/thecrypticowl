import { useSyncExternalStore } from 'react';

/**
 * Whether the browser currently has a network connection.
 *
 * `navigator.onLine` is the browser's own answer and is cheap and instant, but
 * it is only ever trustworthy in one direction: `false` reliably means there is
 * no connection, while `true` merely means an interface is up — a captive
 * portal, a dead router or a VPN dropping packets all still report `true`.
 *
 * So this is used to recognise the *definitely offline* case and show a clear
 * explanation instead of a generic failure. Requests that fail while the
 * browser believes it is online are handled where they are made, by the timeout
 * in `src/lib/supabase.ts`.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  // Some environments (older embedded webviews, some test runners) omit it.
  // Absent means "no reason to think we're offline".
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** Server snapshot — nothing is offline before hydration. */
function getServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
