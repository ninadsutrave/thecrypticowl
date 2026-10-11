import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import type { Theme } from '../theme';

/**
 * The quiet companion to a share button: copies the puzzle's own address,
 * for people who'd rather paste a link than the emoji result.
 */
export function CopyLinkButton({
  url,
  T,
  className = '',
}: {
  url: string;
  T: Theme;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      // Private windows and insecure contexts refuse the clipboard.
      setState('failed');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold border-2 ${className}`}
      style={{ background: T.cardBg, color: T.heading, borderColor: T.cardBorderStrong }}
      aria-live="polite"
    >
      {state === 'copied' ? (
        <>
          <Check size={16} aria-hidden /> Link copied
        </>
      ) : (
        <>
          <Link2 size={16} aria-hidden />
          {state === 'failed' ? 'Couldn’t copy. Try again' : 'Copy link'}
        </>
      )}
    </button>
  );
}
