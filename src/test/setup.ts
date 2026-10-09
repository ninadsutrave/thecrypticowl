import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Deterministic localStorage.
 *
 * Node 24 defines its own `globalThis.localStorage` which is inert unless the
 * runtime is started with `--localstorage-file`, and it shadows the one jsdom
 * would otherwise provide — so tests see `undefined` rather than a working
 * store. Installing an explicit in-memory implementation removes the
 * dependency on either runtime's behaviour and makes storage tests
 * reproducible across Node versions.
 *
 * Built over a closure rather than a class with private fields: the object is
 * wrapped in a Proxy so `Object.keys(localStorage)` enumerates stored keys
 * (which localStore.ts relies on to find every `tco-` entry), and `#private`
 * members are unreachable when `this` is the proxy rather than the target.
 */
function createMemoryStorage(): Storage {
  const map = new Map<string, string>();

  const api = {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(String(k), String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  };

  return new Proxy(api as unknown as Storage, {
    get: (t, p, r) =>
      typeof p === 'string' && !(p in t) ? (map.get(p) ?? null) : Reflect.get(t, p, r),
    set: (t, p, v, r) => {
      if (typeof p === 'string' && !(p in t)) {
        map.set(p, String(v));
        return true;
      }
      return Reflect.set(t, p, v, r);
    },
    has: (t, p) => (typeof p === 'string' && map.has(p)) || Reflect.has(t, p),
    ownKeys: () => [...map.keys()],
    getOwnPropertyDescriptor: (_t, p) =>
      typeof p === 'string' && map.has(p)
        ? { value: map.get(p), enumerable: true, configurable: true, writable: true }
        : undefined,
    deleteProperty: (_t, p) => {
      if (typeof p === 'string') map.delete(p);
      return true;
    },
  });
}

function install(name: 'localStorage' | 'sessionStorage') {
  const storage = createMemoryStorage();
  const descriptor = { value: storage, configurable: true, writable: true };
  Object.defineProperty(globalThis, name, descriptor);
  if (typeof window !== 'undefined') Object.defineProperty(window, name, descriptor);
}

install('localStorage');
install('sessionStorage');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});
