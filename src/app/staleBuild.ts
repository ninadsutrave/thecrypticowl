/**
 * After a deploy, a tab opened earlier can ask for a code chunk from the
 * build it loaded. If that chunk is gone, reload once to pick up the new
 * build. A session flag stops a broken deploy from reload-looping; it
 * clears after a successful load so a later deploy can recover the same way.
 */
const FLAG = 'tco-stale-build-reload';

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message
  );
}

/** Reload once; false if we already tried this session. */
export function reloadForNewBuild(): boolean {
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, '1');
  } catch {
    // Storage blocked: still reload, the browser's own cache is the guard.
  }
  window.location.reload();
  return true;
}

export function watchForStaleBuild() {
  window.addEventListener('vite:preloadError', event => {
    if (reloadForNewBuild()) event.preventDefault();
  });
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      // nothing to clear
    }
  }, 10_000);
}
