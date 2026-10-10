import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { isChunkLoadError, reloadForNewBuild } from '../staleBuild';

/**
 * Shown instead of React Router's raw error screen. A missing code chunk
 * means the site was updated while this tab was open: reload into the new
 * version (once), otherwise offer a button.
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isChunkLoadError(error);
  useEffect(() => {
    if (stale) reloadForNewBuild();
  }, [stale]);
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
        fontFamily: "'Nunito', sans-serif",
        background: '#FAF7FF',
        color: '#1E1B4B',
      }}
    >
      <div style={{ fontSize: 48 }} aria-hidden>
        🦉
      </div>
      <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.6rem', margin: 0 }}>
        {stale ? 'The Cryptic Owl has been updated' : 'Something went wrong'}
      </h1>
      <p style={{ margin: 0, fontWeight: 600, color: '#5B5680', maxWidth: 360 }}>
        {stale ? 'Loading the new version…' : 'Sorry about that. Reloading usually fixes it.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          minHeight: 44,
          padding: '0 20px',
          borderRadius: 16,
          border: 0,
          background: '#7C3AED',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Reload
      </button>
    </div>
  );
}
